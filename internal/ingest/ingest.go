// SPEC: FR-ING-01, FR-ING-02, FR-ING-03, FR-ING-04, FR-ING-05, FR-ING-06, FR-ING-07, FR-ING-08, NFR-SEC-09, DC-03, DC-07
package ingest

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"encoding/xml"
	"errors"
	"fmt"
	"image"
	"image/gif"
	"image/jpeg"
	"image/png"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"os"
	"path"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"

	"ai-foundations-coach/internal/netopt"
	"github.com/google/go-github/v66/github"
)

const (
	RepoOwner     = "microsoft"
	RepoName      = "AI-For-Beginners"
	MaxBlobSize   = 5 * 1024 * 1024  // 5 MiB cap per NFR-SEC-09
	EgressTimeout = 30 * time.Second // 30s per NFR-SEC-09
)

type Config struct {
	GitHubToken string
	ContentDir  string
	BaseURL     string // optional override for testing
	RawBaseURL  string // optional override for testing
	PinnedSHA   string // upstream commit to ingest, so a release is reproducible (NFR-LIC-03); empty means current main
	// Languages lists the translations to ingest from translations/<code>/ (SPEC-009 FR-005). SkipEnglish
	// leaves the English lessons alone, for a run of one language (`ingest -lang hi`).
	Languages   []string
	SkipEnglish bool
	Client      *http.Client
}

type LessonMeta struct {
	ID        string `json:"id"`
	Module    string `json:"module"`
	Title     string `json:"title"`
	Order     int    `json:"order"`
	Path      string `json:"path"`
	CommitSHA string `json:"commitSha"`
	ColabURL  string `json:"colabUrl,omitempty"`
}

type Block struct {
	Type    string `json:"type"`
	Content string `json:"content,omitempty"`
	Lang    string `json:"lang,omitempty"`
	Src     string `json:"src,omitempty"`
	Alt     string `json:"alt,omitempty"`
	Raw     any    `json:"raw,omitempty"`
}

type Lesson struct {
	LessonMeta
	// SourceHash is the SHA-256 of the upstream README a translated lesson was made from, so the review
	// ledger can tell when upstream changed (SPEC-009 FR-019). English lessons leave it out.
	SourceHash string  `json:"sourceHash,omitempty"`
	Blocks     []Block `json:"blocks"`
}

type LessonIndex struct {
	CommitSHA string       `json:"commitSha"`
	Lessons   []LessonMeta `json:"lessons"`
}

var (
	// Matches upstream lessons like "1-Introduction/README.md" or "lessons/1-Intro/README.md"
	lessonRegex = regexp.MustCompile(`^(?:lessons/)?(\d+[-_][\w-]+)/README\.md$`)
	// Strip javascript: in href/src
	jsSchemeRegex = regexp.MustCompile(`(?i)(href|src)\s*=\s*["']\s*javascript:[^"']*["']`)
	// Markdown images: ![alt](url)
	mdImageRegex = regexp.MustCompile(`!\[([^\]]*)\]\(([^)]+)\)`)
	// Markdown links: [text](url)
	mdLinkRegex = regexp.MustCompile(`\[([^\]]+)\]\(([^)]+)\)`)
	// HTML img: <img ... src="url" ...>
	htmlImgRegex = regexp.MustCompile(`(?i)<img\s+([^>]*?)src=["']([^"']+)["']([^>]*)>`)
)

func Run(ctx context.Context, cfg Config) (string, int, error) {
	if strings.TrimSpace(cfg.GitHubToken) == "" {
		return "", 0, errors.New("GITHUB_TOKEN is missing")
	}
	if cfg.ContentDir == "" {
		cfg.ContentDir = "public-content"
	}

	client := cfg.Client
	if client == nil {
		client = NewEgressClient()
	}

	ghClient := github.NewClient(client).WithAuthToken(cfg.GitHubToken)
	if cfg.BaseURL != "" {
		u, err := url.Parse(cfg.BaseURL)
		if err != nil {
			return "", 0, fmt.Errorf("invalid BaseURL: %w", err)
		}
		ghClient.BaseURL = u
	}

	pinnedSHA := cfg.PinnedSHA
	if pinnedSHA == "" {
		// FR-ING-01: fetch current main branch commit SHA
		branch, resp, err := ghClient.Repositories.GetBranch(ctx, RepoOwner, RepoName, "main", 0)
		if err != nil {
			if resp != nil && resp.StatusCode >= 400 && resp.StatusCode < 500 {
				return "", 0, fmt.Errorf("GitHub API returned client error %d: %w", resp.StatusCode, err)
			}
			return "", 0, fmt.Errorf("failed to fetch main branch: %w", err)
		}
		if branch.Commit == nil || branch.Commit.SHA == nil {
			return "", 0, errors.New("main branch commit SHA not found")
		}
		pinnedSHA = *branch.Commit.SHA
	}
	slog.Info("Pinned upstream commit SHA", "sha", pinnedSHA)

	// Fetch Git Tree recursively
	tree, resp, err := ghClient.Git.GetTree(ctx, RepoOwner, RepoName, pinnedSHA, true)
	if err != nil {
		if resp != nil && resp.StatusCode >= 400 && resp.StatusCode < 500 {
			return "", 0, fmt.Errorf("GitHub API tree error %d: %w", resp.StatusCode, err)
		}
		return "", 0, fmt.Errorf("failed to fetch git tree: %w", err)
	}

	type matchItem struct {
		folder     string
		readmePath string
		notebooks  []string
	}
	matches := make(map[string]*matchItem)
	inTree := make(map[string]bool, len(tree.Entries))

	for _, entry := range tree.Entries {
		if entry.Path == nil {
			continue
		}
		p := *entry.Path
		inTree[p] = true

		// Translations are read by the language pass, not as English lessons (FR-ING-02, amended by SPEC-009)
		if strings.HasPrefix(p, "translations/") {
			continue
		}

		// Check for lesson README
		if m := lessonRegex.FindStringSubmatch(p); m != nil {
			folder := m[1]
			if _, exists := matches[folder]; !exists {
				matches[folder] = &matchItem{folder: folder, readmePath: p}
			} else {
				matches[folder].readmePath = p
			}
		}

		// Check for notebooks (.ipynb) in lesson folders
		if strings.HasSuffix(p, ".ipynb") {
			dir := path.Dir(p)
			folderName := path.Base(dir)
			if m := lessonRegex.FindStringSubmatch(dir + "/README.md"); m != nil {
				folderName = m[1]
			}
			if item, exists := matches[folderName]; exists {
				item.notebooks = append(item.notebooks, p)
			}
		}
	}

	// Sort folders naturally / by lesson number
	var candidates []lessonCandidate
	for folder, item := range matches {
		num := 9999
		parts := strings.Split(folder, "-")
		if n, err := strconv.Atoi(parts[0]); err == nil {
			num = n
		}
		candidates = append(candidates, lessonCandidate{
			folder:     folder,
			readmePath: item.readmePath,
			num:        num,
			notebooks:  item.notebooks,
		})
	}
	sort.Slice(candidates, func(i, j int) bool {
		if candidates[i].num != candidates[j].num {
			return candidates[i].num < candidates[j].num
		}
		return candidates[i].folder < candidates[j].folder
	})

	rawHost := "https://raw.githubusercontent.com"
	if cfg.RawBaseURL != "" {
		rawHost = strings.TrimRight(cfg.RawBaseURL, "/")
	}

	count := 0
	if !cfg.SkipEnglish {
		if count, err = writeEnglish(ctx, cfg, client, rawHost, pinnedSHA, candidates); err != nil {
			return "", 0, err
		}
	}
	// SPEC-009 FR-005: each language is a separate pass, so a failed one never leaves English half-written.
	for _, code := range cfg.Languages {
		if err := writeLanguage(ctx, cfg, client, rawHost, pinnedSHA, code, candidates, inTree); err != nil {
			return "", 0, fmt.Errorf("language %s: %w", code, err)
		}
	}
	return pinnedSHA, count, nil
}

type lessonCandidate struct {
	folder     string
	readmePath string
	num        int
	notebooks  []string
}

// writeEnglish writes the English lessons, images and index (FR-ING-02..FR-ING-08).
func writeEnglish(ctx context.Context, cfg Config, client *http.Client, rawHost, pinnedSHA string, candidates []lessonCandidate) (int, error) {
	var lessons []LessonMeta

	// Ensure output directories exist
	lessonsDir := filepath.Join(cfg.ContentDir, "lessons")
	if err := os.MkdirAll(lessonsDir, 0755); err != nil {
		return 0, fmt.Errorf("failed to create lessons directory: %w", err)
	}

	// Lessons are held in memory until every fetch has succeeded, so a failed or
	// cancelled run leaves the existing content untouched.
	type pendingFile struct {
		id   string
		path string
		data []byte
	}
	var pending []pendingFile
	images := &imageBundle{client: client, rawHost: rawHost, byURL: map[string]string{}, files: map[string][]byte{}}

	for order, cand := range candidates {
		id, module := lessonID(cand.folder), lessonModule(cand.folder)

		// Fetch raw Markdown (FR-ING-02)
		rawURL := fmt.Sprintf("%s/%s/%s/%s/%s", rawHost, RepoOwner, RepoName, pinnedSHA, cand.readmePath)
		rawMD, err := FetchWithRetry(ctx, client, rawURL)
		if err != nil {
			return 0, fmt.Errorf("failed to fetch %s: %w", rawURL, err)
		}

		// FR-ING-06: strip javascript: href/src
		cleanMD := jsSchemeRegex.ReplaceAllString(string(rawMD), `$1=""`)

		// FR-ING-05: rewrite relative images and links
		lessonDir := path.Dir(cand.readmePath)
		cleanMD = RewriteRelativeAssets(cleanMD, RepoOwner, RepoName, pinnedSHA, lessonDir, "https://raw.githubusercontent.com")

		// FR-033: images ship with the release and are served from the app's own origin.
		cleanMD, err = images.bundle(ctx, cleanMD)
		if err != nil {
			return 0, fmt.Errorf("lesson %s: %w", id, err)
		}

		// FR-ING-03: title = first # heading, else title-cased id
		title := ExtractTitle(cleanMD, id)

		colabURL := colabURLFor(cand.notebooks)

		meta := LessonMeta{
			ID:        id,
			Module:    module,
			Title:     title,
			Order:     order,
			Path:      cand.readmePath,
			CommitSHA: pinnedSHA,
			ColabURL:  colabURL,
		}

		// FR-ING-08: Exactly one markdown block
		lessonObj := Lesson{
			LessonMeta: meta,
			Blocks: []Block{
				{
					Type:    "markdown",
					Content: cleanMD,
				},
			},
		}

		// Write public-content/lessons/<id>.json
		lessonFile := filepath.Join(lessonsDir, id+".json")
		data, err := json.MarshalIndent(lessonObj, "", "  ")
		if err != nil {
			return 0, fmt.Errorf("failed to marshal lesson %s: %w", id, err)
		}
		pending = append(pending, pendingFile{id: id, path: lessonFile, data: data})

		lessons = append(lessons, meta)
	}

	if len(images.files) > 0 {
		assetsDir := filepath.Join(cfg.ContentDir, AssetDir)
		if err := os.MkdirAll(assetsDir, 0755); err != nil {
			return 0, fmt.Errorf("failed to create assets directory: %w", err)
		}
		for name, data := range images.files {
			if err := writeFileAtomic(filepath.Join(assetsDir, name), data); err != nil {
				return 0, fmt.Errorf("failed to write image %s: %w", name, err)
			}
		}
	}

	for _, f := range pending {
		if err := writeFileAtomic(f.path, f.data); err != nil {
			return 0, fmt.Errorf("failed to write lesson %s: %w", f.id, err)
		}
	}

	// Write public-content/index.json (FR-ING-04, §6.1)
	indexObj := LessonIndex{
		CommitSHA: pinnedSHA,
		Lessons:   lessons,
	}
	indexData, err := json.MarshalIndent(indexObj, "", "  ")
	if err != nil {
		return 0, fmt.Errorf("failed to marshal index: %w", err)
	}
	indexFile := filepath.Join(cfg.ContentDir, "index.json")
	if err := writeFileAtomic(indexFile, indexData); err != nil {
		return 0, fmt.Errorf("failed to write index file: %w", err)
	}

	return len(lessons), nil
}

// AssetDir holds bundled images under the content directory, and AssetURLPrefix is where the server
// serves them. Names are content hashes, so a response can be cached forever.
const (
	AssetDir       = "assets"
	AssetURLPrefix = "/lesson-assets/"
)

const upstreamRawHost = "https://raw.githubusercontent.com/"

var (
	imageExts = map[string]bool{".png": true, ".jpg": true, ".jpeg": true, ".gif": true, ".svg": true, ".webp": true}
	// AssetNameRe is the only shape a bundled image's name can have, so a request can never leave AssetDir.
	AssetNameRe = regexp.MustCompile(`^[0-9a-f]{32}\.(png|jpg|jpeg|gif|svg|webp)$`)
)

// brandedImages are upstream images found by visual review to contain a Microsoft logo, which
// NFR-LIC-02 forbids. They are matched by content hash and left out of the release. No automated check
// can find a hand-drawn logo, so a new upstream pin needs a new review (see README, "Curriculum pin").
var brandedImages = map[string]string{
	"34c718c74e361ac078620316175d4425": "Symbolic AI sketchnote: logo beside \"Concept Graph\"",
	"e8c2816e2bb1aea82dd6f321b225c501": "NLP sketchnote: logo beside \"2014 CEO India\"",
}

func contentHash(data []byte) string {
	sum := sha256.Sum256(data)
	return hex.EncodeToString(sum[:])[:32]
}

// droppedImage marks where a left-out image was. dropRe removes it with the credit line that follows
// it, which would otherwise describe a picture that is no longer there.
const droppedImage = "\x00dropped-image\x00"

var dropRe = regexp.MustCompile(droppedImage + `(\s*\n> Sketchnote by [^\n]*)?\n?`)

// imageBundle downloads each upstream image once and holds it until the whole run has succeeded.
type imageBundle struct {
	client  *http.Client
	rawHost string
	byURL   map[string]string
	files   map[string][]byte
}

// local returns the self-origin URL for an upstream image and leaves any other URL alone, or "" for an
// image that must be left out. An image on another host is caught by VerifyContent, which fails the
// release build.
func (b *imageBundle) local(ctx context.Context, src string) (string, error) {
	if !strings.HasPrefix(src, upstreamRawHost) {
		return src, nil
	}
	if url, ok := b.byURL[src]; ok {
		return url, nil
	}
	ext := strings.ToLower(path.Ext(strings.SplitN(src, "?", 2)[0]))
	if !imageExts[ext] {
		return "", fmt.Errorf("unsupported image type %q", ext)
	}
	data, err := FetchWithRetry(ctx, b.client, strings.TrimRight(b.rawHost, "/")+"/"+strings.TrimPrefix(src, upstreamRawHost))
	if err != nil {
		return "", fmt.Errorf("failed to fetch image: %w", err)
	}
	if err := checkImage(ext, data); err != nil {
		return "", fmt.Errorf("%s: %w", src, err)
	}
	hash := contentHash(data)
	if reason, branded := brandedImages[hash]; branded {
		slog.Info("Left out an image with a Microsoft logo (NFR-LIC-02)", "image", reason)
		b.byURL[src] = ""
		return "", nil
	}
	name := hash + ext
	b.files[name] = data
	b.byURL[src] = AssetURLPrefix + name
	return b.byURL[src], nil
}

// bundle rewrites Markdown and HTML images. Links are left alone: following one is navigation, which
// neither the CSP nor FR-033 covers.
func (b *imageBundle) bundle(ctx context.Context, content string) (string, error) {
	var firstErr error
	rewrite := func(src string) string {
		out, err := b.local(ctx, src)
		if err != nil && firstErr == nil {
			firstErr = err
		}
		return out
	}
	content = mdImageRegex.ReplaceAllStringFunc(content, func(m string) string {
		sub := mdImageRegex.FindStringSubmatch(m)
		target := strings.TrimSpace(sub[2])
		src, title, _ := strings.Cut(target, " ") // ![alt](url "title")
		if title != "" {
			title = " " + title
		}
		local := rewrite(src)
		if local == "" {
			return droppedImage
		}
		return fmt.Sprintf("![%s](%s%s)", sub[1], local, title)
	})
	content = htmlImgRegex.ReplaceAllStringFunc(content, func(m string) string {
		sub := htmlImgRegex.FindStringSubmatch(m)
		local := rewrite(strings.TrimSpace(sub[2]))
		if local == "" {
			return droppedImage
		}
		return fmt.Sprintf("<img %ssrc=\"%s\"%s>", sub[1], local, sub[3])
	})
	return dropRe.ReplaceAllString(content, ""), firstErr
}

// checkImage proves the bytes really are an image of the type the name claims. A failed download or an
// HTML error page saved as .png would otherwise ship as a broken picture and still pass a file-exists
// check. PNG, JPEG and GIF are fully decoded, which also catches a truncated file.
func checkImage(ext string, data []byte) error {
	decode := func(dec func(io.Reader) (image.Image, error)) error {
		if _, err := dec(bytes.NewReader(data)); err != nil {
			return fmt.Errorf("not a valid %s image: %w", ext, err)
		}
		return nil
	}
	switch ext {
	case ".png":
		return decode(png.Decode)
	case ".jpg", ".jpeg":
		return decode(jpeg.Decode)
	case ".gif":
		// All frames: an animation can be damaged after its first frame.
		if _, err := gif.DecodeAll(bytes.NewReader(data)); err != nil {
			return fmt.Errorf("not a valid .gif image: %w", err)
		}
		return nil
	case ".webp":
		if len(data) < 12 || string(data[:4]) != "RIFF" || string(data[8:12]) != "WEBP" {
			return errors.New("not a valid .webp image")
		}
		return nil // shortcut: header only, because the standard library has no WebP decoder; the browser test decodes it
	case ".svg":
		var root struct {
			XMLName xml.Name
		}
		if err := xml.NewDecoder(bytes.NewReader(data)).Decode(&root); err != nil || root.XMLName.Local != "svg" {
			return errors.New("not a valid .svg image")
		}
		return nil
	}
	return fmt.Errorf("unsupported image type %q", ext)
}

// imageSources lists every image a lesson would load.
func imageSources(lesson Lesson) []string {
	var out []string
	for _, block := range lesson.Blocks {
		if block.Src != "" {
			out = append(out, block.Src)
		}
		for _, m := range mdImageRegex.FindAllStringSubmatch(block.Content, -1) {
			src, _, _ := strings.Cut(strings.TrimSpace(m[2]), " ")
			out = append(out, src)
		}
		for _, m := range htmlImgRegex.FindAllStringSubmatch(block.Content, -1) {
			out = append(out, strings.TrimSpace(m[2]))
		}
	}
	return out
}

// VerifyContent is the release gate for FR-033. It fails unless the content directory is complete and
// self-contained: an index, every indexed lesson, and every image bundled and present.
func VerifyContent(contentDir string) error {
	raw, err := os.ReadFile(filepath.Join(contentDir, "index.json"))
	if err != nil {
		return fmt.Errorf("no lesson index: %w", err)
	}
	var index LessonIndex
	if err := json.Unmarshal(raw, &index); err != nil {
		return fmt.Errorf("lesson index is invalid: %w", err)
	}
	if len(index.Lessons) == 0 {
		return errors.New("lesson index lists no lessons")
	}
	for _, l := range index.Lessons {
		if _, err := os.Stat(filepath.Join(contentDir, "lessons", l.ID+".json")); err != nil {
			return fmt.Errorf("lesson %s is in the index but has no file", l.ID)
		}
	}
	// A forbidden image must not ship even if no lesson refers to it.
	assets, err := filepath.Glob(filepath.Join(contentDir, AssetDir, "*"))
	if err != nil {
		return err
	}
	for _, a := range assets {
		base := filepath.Base(a)
		if reason, branded := brandedImages[strings.TrimSuffix(base, path.Ext(base))]; branded {
			return fmt.Errorf("the release contains an image that NFR-LIC-02 forbids: %s", reason)
		}
	}
	if err := verifyLessonFiles(contentDir, filepath.Join(contentDir, "lessons")); err != nil {
		return err
	}
	return VerifyContentLanguages(contentDir)
}

// verifyLessonFiles checks that every lesson file in lessonsDir loads its images only from the bundled
// asset store under contentDir, and that each one is present, unchanged, undamaged and allowed.
func verifyLessonFiles(contentDir, lessonsDir string) error {
	files, err := filepath.Glob(filepath.Join(lessonsDir, "*.json"))
	if err != nil {
		return err
	}
	for _, f := range files {
		raw, err := os.ReadFile(f)
		if err != nil {
			return err
		}
		var lesson Lesson
		if err := json.Unmarshal(raw, &lesson); err != nil {
			return fmt.Errorf("%s is invalid: %w", filepath.Base(f), err)
		}
		for _, src := range imageSources(lesson) {
			name, ok := strings.CutPrefix(src, AssetURLPrefix)
			if !ok || !AssetNameRe.MatchString(name) {
				return fmt.Errorf("%s loads an image from outside the app: %s", filepath.Base(f), src)
			}
			data, err := os.ReadFile(filepath.Join(contentDir, AssetDir, name))
			if err != nil {
				return fmt.Errorf("%s needs a missing image: %s", filepath.Base(f), name)
			}
			hash := contentHash(data)
			if !strings.HasPrefix(name, hash+".") {
				return fmt.Errorf("%s needs an image whose content has changed: %s", filepath.Base(f), name)
			}
			if reason, branded := brandedImages[hash]; branded {
				return fmt.Errorf("%s uses an image that NFR-LIC-02 forbids: %s", filepath.Base(f), reason)
			}
			if err := checkImage(strings.ToLower(path.Ext(name)), data); err != nil {
				return fmt.Errorf("%s needs a damaged image %s: %w", filepath.Base(f), name, err)
			}
		}
	}
	return nil
}

// writeFileAtomic replaces path in one step so readers never see a partial file.
func writeFileAtomic(path string, data []byte) error {
	tmp, err := os.CreateTemp(filepath.Dir(path), ".tmp-*")
	if err != nil {
		return err
	}
	defer os.Remove(tmp.Name()) // no-op once the rename has succeeded

	if _, err := tmp.Write(data); err != nil {
		tmp.Close()
		return err
	}
	if err := tmp.Close(); err != nil {
		return err
	}
	if err := os.Chmod(tmp.Name(), 0644); err != nil {
		return err
	}
	return os.Rename(tmp.Name(), path)
}

func ExtractTitle(md, defaultID string) string {
	lines := strings.Split(md, "\n")
	for _, l := range lines {
		trimmed := strings.TrimSpace(l)
		if strings.HasPrefix(trimmed, "# ") {
			t := strings.TrimSpace(strings.TrimPrefix(trimmed, "# "))
			if t != "" {
				return t
			}
		}
	}
	words := strings.Fields(strings.ReplaceAll(defaultID, "-", " "))
	for i, w := range words {
		if len(w) > 0 {
			words[i] = strings.ToUpper(w[:1]) + strings.ToLower(w[1:])
		}
	}
	return strings.Join(words, " ")
}

func RewriteRelativeAssets(content, owner, repo, sha, baseDir, rawHost string) string {
	rawPrefix := fmt.Sprintf("%s/%s/%s/%s/", rawHost, owner, repo, sha)

	resolve := func(target string) string {
		target = strings.TrimSpace(target)
		if strings.HasPrefix(target, "http://") || strings.HasPrefix(target, "https://") || strings.HasPrefix(target, "data:") || strings.HasPrefix(target, "#") {
			return target
		}
		resolved := path.Clean(path.Join(baseDir, target))
		return rawPrefix + strings.TrimPrefix(resolved, "/")
	}

	// Markdown images: ![alt](url)
	content = mdImageRegex.ReplaceAllStringFunc(content, func(m string) string {
		sub := mdImageRegex.FindStringSubmatch(m)
		if len(sub) == 3 {
			return fmt.Sprintf("![%s](%s)", sub[1], resolve(sub[2]))
		}
		return m
	})

	// HTML <img> tags
	content = htmlImgRegex.ReplaceAllStringFunc(content, func(m string) string {
		sub := htmlImgRegex.FindStringSubmatch(m)
		if len(sub) == 4 {
			return fmt.Sprintf("<img %ssrc=\"%s\"%s>", sub[1], resolve(sub[2]), sub[3])
		}
		return m
	})

	// Markdown links pointing to relative images or documents
	content = mdLinkRegex.ReplaceAllStringFunc(content, func(m string) string {
		sub := mdLinkRegex.FindStringSubmatch(m)
		if len(sub) == 3 {
			dest := sub[2]
			if !strings.HasPrefix(dest, "http://") && !strings.HasPrefix(dest, "https://") && !strings.HasPrefix(dest, "#") {
				return fmt.Sprintf("[%s](%s)", sub[1], resolve(dest))
			}
		}
		return m
	})

	return content
}

// NFR-SEC-09: Egress client restricted to api.github.com and raw.githubusercontent.com
func NewEgressClient() *http.Client {
	// TLS verification stays ON unless the operator opts out with INSECURE_SKIP_TLS_VERIFY=true.
	// The curriculum fetch can carry a GitHub token, so insecure mode is never enabled per request.
	return netopt.HTTPClient(EgressTimeout, netopt.EnvInsecure())
}

func FetchWithRetry(ctx context.Context, client *http.Client, rawURL string) ([]byte, error) {
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return nil, fmt.Errorf("invalid URL %s: %w", rawURL, err)
	}

	// Domain restriction per NFR-SEC-09 (unless testing via localhost)
	host := parsed.Hostname()
	if host != "raw.githubusercontent.com" && host != "api.github.com" && host != "127.0.0.1" && host != "localhost" {
		return nil, fmt.Errorf("egress domain disallowed: %s", host)
	}

	var lastErr error
	backoff := 50 * time.Millisecond

	for attempt := 0; attempt < 3; attempt++ {
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, rawURL, nil)
		if err != nil {
			return nil, err
		}

		resp, err := client.Do(req)
		if err != nil {
			lastErr = err
			time.Sleep(backoff)
			backoff *= 2
			continue
		}

		// Fail fast on 4xx (NFR-SEC-09)
		if resp.StatusCode >= 400 && resp.StatusCode < 500 {
			resp.Body.Close()
			return nil, fmt.Errorf("HTTP 4xx client error: %d", resp.StatusCode)
		}

		// Retry on 5xx
		if resp.StatusCode >= 500 {
			resp.Body.Close()
			lastErr = fmt.Errorf("HTTP 5xx server error: %d", resp.StatusCode)
			time.Sleep(backoff)
			backoff *= 2
			continue
		}

		// Read with 5 MiB cap (NFR-SEC-09)
		limitedReader := io.LimitReader(resp.Body, MaxBlobSize+1)
		data, err := io.ReadAll(limitedReader)
		resp.Body.Close()
		if err != nil {
			lastErr = err
			time.Sleep(backoff)
			backoff *= 2
			continue
		}
		if len(data) > MaxBlobSize {
			return nil, fmt.Errorf("response exceeded 5 MiB cap")
		}

		return data, nil
	}

	return nil, fmt.Errorf("request failed after retries: %w", lastErr)
}
