// SPEC: SPEC-009 FR-017, FR-018, FR-019; data-model "ReviewEntry"; SPEC-013 FR-008 (English owner approvals)

package i18n

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sort"
)

// Ledger states and kinds. Nothing else is valid.
const (
	ReviewDraft    = "draft"
	ReviewApproved = "approved"

	KindBase     = "base"
	KindAdaptive = "adaptive"
	KindQuiz     = "quiz"
	KindUI       = "ui"
	KindNotebook = "notebook"
)

// Entry is one reviewed file. Paths are relative to the repository root, with forward slashes.
type Entry struct {
	Path            string `json:"path"`
	Kind            string `json:"kind"`
	SourceHash      string `json:"sourceHash"`
	TranslationHash string `json:"translationHash"`
	Status          string `json:"status"`
	Reviewer        string `json:"reviewer,omitempty"`
	Date            string `json:"date,omitempty"`
}

// Ledger is content/review/<code>.json.
type Ledger struct {
	Language string  `json:"language"`
	Entries  []Entry `json:"entries"`
}

// Problem is one reason a language is not ready, printed as "LANG PATH: reason".
type Problem struct {
	Path   string
	Reason string
}

func LedgerPath(root, code string) string {
	return filepath.Join(root, "content", "review", code+".json")
}

// LoadLedger reads a language's ledger. A missing file is an empty ledger.
func LoadLedger(root, code string) (*Ledger, error) {
	raw, err := os.ReadFile(LedgerPath(root, code))
	if errors.Is(err, os.ErrNotExist) {
		return &Ledger{Language: code}, nil
	} else if err != nil {
		return nil, err
	}
	var l Ledger
	if err := json.Unmarshal(raw, &l); err != nil {
		return nil, fmt.Errorf("%s: %w", LedgerPath(root, code), err)
	}
	return &l, nil
}

// Save writes the ledger sorted by path, so a review PR shows a small diff.
func (l *Ledger) Save(root string) error {
	sort.Slice(l.Entries, func(i, j int) bool { return l.Entries[i].Path < l.Entries[j].Path })
	raw, err := json.MarshalIndent(l, "", "  ")
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(LedgerPath(root, l.Language)), 0o755); err != nil {
		return err
	}
	return os.WriteFile(LedgerPath(root, l.Language), append(raw, '\n'), 0o644)
}

// Find returns the entry for a path, or nil.
func (l *Ledger) Find(p string) *Entry {
	for i := range l.Entries {
		if l.Entries[i].Path == p {
			return &l.Entries[i]
		}
	}
	return nil
}

// Upsert records a new draft: the file changed, so any earlier approval no longer holds.
func (l *Ledger) Upsert(e Entry) {
	e.Status, e.Reviewer, e.Date = ReviewDraft, "", ""
	if old := l.Find(e.Path); old != nil {
		*old = e
		return
	}
	l.Entries = append(l.Entries, e)
}

// HashFile is the lowercase hex SHA-256 of a file's bytes.
func HashFile(p string) (string, error) {
	raw, err := os.ReadFile(p)
	if err != nil {
		return "", err
	}
	sum := sha256.Sum256(raw)
	return hex.EncodeToString(sum[:]), nil
}

// Target is a translated file a language needs, and the English file it comes from.
type Target struct {
	Path   string // translated, relative to root
	Source string // English, relative to root
	Kind   string
}

// Targets lists every file an approved language must have: the UI catalogue, the quizzes, each
// English adaptive lesson and each English base lesson in the index.
func Targets(root, code string) ([]Target, error) {
	out := []Target{
		{Path: "web/src/i18n/" + code + ".json", Source: "web/src/i18n/en.json", Kind: KindUI},
		{Path: "web/src/data/quizzes/" + code + ".json", Source: "web/src/data/quizzes/en.json", Kind: KindQuiz},
	}
	for _, mode := range []string{"junior", "plain-english", "detailed"} {
		files, err := filepath.Glob(filepath.Join(root, "public-content", "lessons", "*."+mode+".json"))
		if err != nil {
			return nil, err
		}
		for _, f := range files {
			name := filepath.Base(f)
			out = append(out, Target{Path: "public-content/lang/" + code + "/lessons/" + name, Source: "public-content/lessons/" + name, Kind: KindAdaptive})
		}
	}
	raw, err := os.ReadFile(filepath.Join(root, "public-content", "index.json"))
	if err != nil && !errors.Is(err, os.ErrNotExist) {
		return nil, err
	}
	if err == nil {
		var index struct {
			Lessons []struct {
				ID string `json:"id"`
			} `json:"lessons"`
		}
		if err := json.Unmarshal(raw, &index); err != nil {
			return nil, fmt.Errorf("public-content/index.json: %w", err)
		}
		for _, l := range index.Lessons {
			out = append(out, Target{Path: "public-content/lang/" + code + "/lessons/" + l.ID + ".json", Source: "public-content/lessons/" + l.ID + ".json", Kind: KindBase})
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Path < out[j].Path })
	return out, nil
}

// SourceHash is what a ledger entry's sourceHash must equal: the English file's hash, or for a base
// lesson the hash of the upstream README recorded in the generated file.
func SourceHash(root string, t Target) (string, error) {
	if t.Kind != KindBase {
		return HashFile(filepath.Join(root, filepath.FromSlash(t.Source)))
	}
	raw, err := os.ReadFile(filepath.Join(root, filepath.FromSlash(t.Path)))
	if err != nil {
		return "", err
	}
	var lesson struct {
		SourceHash string `json:"sourceHash"`
	}
	if err := json.Unmarshal(raw, &lesson); err != nil || lesson.SourceHash == "" {
		return "", fmt.Errorf("no sourceHash in %s", t.Path)
	}
	return lesson.SourceHash, nil
}

// Check reports everything that stops a language from being approved: a missing translation, a missing,
// draft or stale ledger entry, a bad ledger entry, and any parity problem. An empty result means ready.
func Check(root, code string) []Problem {
	ledger, err := LoadLedger(root, code)
	if err != nil {
		return []Problem{{Path: "content/review/" + code + ".json", Reason: err.Error()}}
	}
	targets, err := Targets(root, code)
	if err != nil {
		return []Problem{{Path: "public-content", Reason: err.Error()}}
	}
	var out []Problem
	add := func(p, reason string) { out = append(out, Problem{Path: p, Reason: reason}) }

	wanted := map[string]bool{}
	for _, t := range targets {
		wanted[t.Path] = true
		file := filepath.Join(root, filepath.FromSlash(t.Path))
		if _, err := os.Stat(file); err != nil {
			add(t.Path, "not translated yet")
			continue
		}
		for _, p := range Parity(root, t) {
			add(t.Path, p)
		}
		e := ledger.Find(t.Path)
		if e == nil {
			add(t.Path, "no review entry")
			continue
		}
		if e.Kind != t.Kind {
			add(t.Path, fmt.Sprintf("review entry has kind %q, want %q", e.Kind, t.Kind))
		}
		switch e.Status {
		case ReviewDraft:
			add(t.Path, "draft, not yet approved by a reviewer")
			continue
		case ReviewApproved:
		default:
			add(t.Path, fmt.Sprintf("review status %q is not draft or approved", e.Status))
			continue
		}
		if e.Reviewer == "" || e.Date == "" {
			add(t.Path, "approved without a reviewer and date")
		}
		if src, err := SourceHash(root, t); err != nil {
			add(t.Path, err.Error())
		} else if src != e.SourceHash {
			add(t.Path, "stale: the English source changed after approval")
		}
		if h, err := HashFile(file); err != nil {
			add(t.Path, err.Error())
		} else if h != e.TranslationHash {
			add(t.Path, "stale: the translation changed after approval")
		}
	}
	for _, e := range ledger.Entries {
		switch {
		case !wanted[e.Path]:
			add(e.Path, "review entry for a file this language does not need")
		case e.Kind != KindBase && e.Kind != KindAdaptive && e.Kind != KindQuiz && e.Kind != KindUI:
			add(e.Path, fmt.Sprintf("unknown kind %q", e.Kind))
		}
	}
	return out
}

// EnglishTargets lists the English files the owner must approve (SPEC-013 FR-008): every lesson file
// marked "origin": "own", the quiz file once any quiz is ours, and every notebook. Path and Source are
// the same file.
func EnglishTargets(root string) ([]Target, error) {
	var out []Target
	lessons, err := filepath.Glob(filepath.Join(root, "public-content", "lessons", "*.json"))
	if err != nil {
		return nil, err
	}
	for _, f := range lessons {
		raw, err := os.ReadFile(f)
		if err != nil {
			return nil, err
		}
		var l struct {
			Origin string `json:"origin"`
		}
		if json.Unmarshal(raw, &l) == nil && l.Origin == "own" {
			p := "public-content/lessons/" + filepath.Base(f)
			out = append(out, Target{Path: p, Source: p, Kind: KindAdaptive})
		}
	}
	const quiz = "web/src/data/quizzes/en.json"
	if raw, err := os.ReadFile(filepath.Join(root, filepath.FromSlash(quiz))); err == nil {
		var quizzes map[string]struct {
			Origin string `json:"origin"`
		}
		if err := json.Unmarshal(raw, &quizzes); err != nil {
			return nil, fmt.Errorf("%s: %w", quiz, err)
		}
		for _, q := range quizzes {
			if q.Origin == "own" {
				out = append(out, Target{Path: quiz, Source: quiz, Kind: KindQuiz})
				break
			}
		}
	} else if !errors.Is(err, os.ErrNotExist) {
		return nil, err
	}
	notebooks, err := filepath.Glob(filepath.Join(root, "notebooks", "*.ipynb"))
	if err != nil {
		return nil, err
	}
	for _, f := range notebooks {
		p := "notebooks/" + filepath.Base(f)
		out = append(out, Target{Path: p, Source: p, Kind: KindNotebook})
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Path < out[j].Path })
	return out, nil
}

// EnglishStatus is "approved", "pending" (no approval) or "stale" (the file changed after approval).
func EnglishStatus(root string, t Target, l *Ledger) string {
	e := l.Find(t.Path)
	if e == nil || e.Status != ReviewApproved {
		return "pending"
	}
	if h, err := HashFile(filepath.Join(root, filepath.FromSlash(t.Path))); err != nil || h != e.SourceHash {
		return "stale"
	}
	return "approved"
}

// CheckEnglish reports every English target without a current owner approval. Empty means ready.
func CheckEnglish(root string) []Problem {
	ledger, err := LoadLedger(root, English.Code)
	if err != nil {
		return []Problem{{Path: "content/review/en.json", Reason: err.Error()}}
	}
	targets, err := EnglishTargets(root)
	if err != nil {
		return []Problem{{Path: "public-content", Reason: err.Error()}}
	}
	var out []Problem
	for _, t := range targets {
		switch EnglishStatus(root, t, ledger) {
		case "pending":
			out = append(out, Problem{Path: t.Path, Reason: "pending"})
		case "stale":
			out = append(out, Problem{Path: t.Path, Reason: "stale: the text changed after approval"})
		}
	}
	return out
}
