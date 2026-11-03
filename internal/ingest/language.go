// SPEC: SPEC-009 FR-005, FR-006, FR-033; FR-ING-02 (amended by SPEC-009), FR-ING-03

package ingest

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
)

var (
	idRe       = regexp.MustCompile(`^[a-z0-9][a-z0-9_-]{0,63}$`)
	idUnsafeRe = regexp.MustCompile(`[^a-z0-9_-]`)
)

// lessonID is the lowercase folder name, made safe for a file name (FR-ING-03).
func lessonID(folder string) string {
	id := strings.ToLower(folder)
	if !idRe.MatchString(id) {
		id = idUnsafeRe.ReplaceAllString(id, "-")
	}
	return id
}

// lessonModule is the second and third hyphen segments of the folder name (FR-ING-03).
func lessonModule(folder string) string {
	parts := strings.Split(folder, "-")
	switch {
	case len(parts) >= 3:
		return strings.ToLower(parts[1] + "-" + parts[2])
	case len(parts) >= 2:
		return strings.ToLower(parts[1])
	}
	return "general"
}

func colabURLFor(notebooks []string) string {
	if len(notebooks) == 0 {
		return ""
	}
	sort.Strings(notebooks)
	return fmt.Sprintf("https://colab.research.google.com/github/%s/%s/blob/main/%s", RepoOwner, RepoName, notebooks[0])
}

// LangDir is where a language's lessons and index live under the content directory.
func LangDir(contentDir, code string) string { return filepath.Join(contentDir, "lang", code) }

// writeLanguage ingests translations/<code>/<English README path> for each English lesson, at the same
// pinned commit. A lesson with no translation upstream is skipped: the app shows English for it.
// Lessons keep their English id, module, order and Colab link, so every link in the app still works.
func writeLanguage(ctx context.Context, cfg Config, client *http.Client, rawHost, sha, code string, candidates []lessonCandidate, inTree map[string]bool) error {
	if !idRe.MatchString(code) || strings.ContainsAny(code, "_-") {
		return fmt.Errorf("invalid language code %q", code)
	}
	images := &imageBundle{client: client, rawHost: rawHost, byURL: map[string]string{}, files: map[string][]byte{}}
	type pendingFile struct {
		path string
		data []byte
	}
	var pending []pendingFile
	var lessons []LessonMeta
	dir := LangDir(cfg.ContentDir, code)

	for order, cand := range candidates {
		id := lessonID(cand.folder)
		readme := "translations/" + code + "/" + cand.readmePath
		if !inTree[readme] {
			slog.Info("No upstream translation for this lesson; the app shows English", "lang", code, "lesson", id)
			continue
		}
		raw, err := FetchWithRetry(ctx, client, fmt.Sprintf("%s/%s/%s/%s/%s", rawHost, RepoOwner, RepoName, sha, readme))
		if err != nil {
			return fmt.Errorf("lesson %s: %w", id, err)
		}
		md := jsSchemeRegex.ReplaceAllString(string(raw), `$1=""`)
		md = RewriteRelativeAssets(md, RepoOwner, RepoName, sha, path.Dir(readme), "https://raw.githubusercontent.com")
		md = useEnglishImages(md, sha, code, path.Dir(cand.readmePath), inTree)
		if md, err = images.bundle(ctx, md); err != nil {
			return fmt.Errorf("lesson %s: %w", id, err)
		}
		meta := LessonMeta{ID: id, Module: lessonModule(cand.folder), Title: ExtractTitle(md, id), Order: order,
			Path: readme, CommitSHA: sha, ColabURL: colabURLFor(cand.notebooks)}
		sum := sha256.Sum256(raw)
		data, err := json.MarshalIndent(Lesson{LessonMeta: meta, SourceHash: hex.EncodeToString(sum[:]),
			Blocks: []Block{{Type: "markdown", Content: md}}}, "", "  ")
		if err != nil {
			return err
		}
		pending = append(pending, pendingFile{filepath.Join(dir, "lessons", id+".json"), data})
		lessons = append(lessons, meta)
	}

	// Write only once every fetch has succeeded. Translated images join the shared asset store.
	if err := os.MkdirAll(filepath.Join(dir, "lessons"), 0o755); err != nil {
		return err
	}
	if len(images.files) > 0 {
		if err := os.MkdirAll(filepath.Join(cfg.ContentDir, AssetDir), 0o755); err != nil {
			return err
		}
	}
	for name, data := range images.files {
		if err := writeFileAtomic(filepath.Join(cfg.ContentDir, AssetDir, name), data); err != nil {
			return err
		}
	}
	for _, f := range pending {
		if err := writeFileAtomic(f.path, f.data); err != nil {
			return err
		}
	}
	index, err := json.MarshalIndent(LessonIndex{CommitSHA: sha, Lessons: lessons}, "", "  ")
	if err != nil {
		return err
	}
	slog.Info("Language ingested", "lang", code, "lessons", len(lessons), "of", len(candidates))
	return writeFileAtomic(filepath.Join(dir, "index.json"), index)
}

// useEnglishImages replaces each translated image that upstream does not have with the English image
// of the same name from the English lesson folder (FR-006). Translated names look like
// translated_images/hi/<name>.<hash>.webp; the English one is <name>.<ext> under the lesson folder.
// An image with neither is left out, as a branded image is.
func useEnglishImages(md, sha, code, englishDir string, inTree map[string]bool) string {
	rawPrefix := fmt.Sprintf("%s%s/%s/%s/", upstreamRawHost, RepoOwner, RepoName, sha)
	swap := func(src string) (string, bool) {
		rel, ok := strings.CutPrefix(src, rawPrefix)
		if !ok || !strings.HasPrefix(rel, "translated_images/"+code+"/") || inTree[rel] {
			return src, true
		}
		stem, _, _ := strings.Cut(path.Base(rel), ".")
		var found []string
		for p := range inTree {
			if strings.HasPrefix(p, englishDir+"/") && imageExts[strings.ToLower(path.Ext(p))] {
				if s, _, _ := strings.Cut(path.Base(p), "."); s == stem {
					found = append(found, p)
				}
			}
		}
		if len(found) == 0 {
			slog.Info("Translated image missing upstream, and no English one either; left out", "lang", code, "image", path.Base(rel))
			return "", false
		}
		sort.Strings(found) // deterministic when two English images share a name
		return rawPrefix + found[0], true
	}
	md = mdImageRegex.ReplaceAllStringFunc(md, func(m string) string {
		sub := mdImageRegex.FindStringSubmatch(m)
		src, title, _ := strings.Cut(strings.TrimSpace(sub[2]), " ")
		out, ok := swap(src)
		if !ok {
			return droppedImage
		}
		if title != "" {
			out += " " + title
		}
		return fmt.Sprintf("![%s](%s)", sub[1], out)
	})
	return htmlImgRegex.ReplaceAllStringFunc(md, func(m string) string {
		sub := htmlImgRegex.FindStringSubmatch(m)
		out, ok := swap(strings.TrimSpace(sub[2]))
		if !ok {
			return droppedImage
		}
		return fmt.Sprintf("<img %ssrc=\"%s\"%s>", sub[1], out, sub[3])
	})
}

// VerifyContentLanguages extends the FR-033 release gate to each ingested language: every indexed
// lesson has a file, and every image is bundled, present, undamaged and allowed.
func VerifyContentLanguages(contentDir string) error {
	dirs, err := filepath.Glob(filepath.Join(contentDir, "lang", "*"))
	if err != nil {
		return err
	}
	for _, dir := range dirs {
		code := filepath.Base(dir)
		raw, err := os.ReadFile(filepath.Join(dir, "index.json"))
		if errors.Is(err, os.ErrNotExist) {
			continue // only committed adaptive translations so far
		} else if err != nil {
			return err
		}
		var index LessonIndex
		if err := json.Unmarshal(raw, &index); err != nil {
			return fmt.Errorf("%s: lesson index is invalid: %w", code, err)
		}
		for _, l := range index.Lessons {
			if _, err := os.Stat(filepath.Join(dir, "lessons", l.ID+".json")); err != nil {
				return fmt.Errorf("%s: lesson %s is in the index but has no file", code, l.ID)
			}
		}
		if err := verifyLessonFiles(contentDir, filepath.Join(dir, "lessons")); err != nil {
			return fmt.Errorf("%s: %w", code, err)
		}
	}
	return nil
}
