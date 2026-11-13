// SPEC: SPEC-009 FR-017, FR-018, FR-019
package main

import (
	"bytes"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"ai-foundations-coach/internal/i18n"
)

func repo(t *testing.T) string {
	t.Helper()
	root := t.TempDir()
	for p, body := range map[string]string{
		"web/src/i18n/en.json":         `{"a.hello":"Hello {name}"}`,
		"web/src/i18n/hi.json":         `{"a.hello":"नमस्ते {name}"}`,
		"web/src/data/quizzes/en.json": `{}`,
		"web/src/data/quizzes/hi.json": `{"1-intro":{}}`,
	} {
		f := filepath.Join(root, filepath.FromSlash(p))
		_ = os.MkdirAll(filepath.Dir(f), 0o755)
		_ = os.WriteFile(f, []byte(body), 0o644)
	}
	return root
}

var day = func() time.Time { return time.Date(2026, 11, 3, 12, 0, 0, 0, time.UTC) }

func review(root string, args ...string) (int, string) {
	var out bytes.Buffer
	code := run(root, args, day, &out, &out)
	return code, out.String()
}

func TestReviewApprovesCheckedFiles(t *testing.T) {
	root := repo(t)
	if code, out := review(root, "-lang", "hi"); code != 0 || !strings.Contains(out, "unrecorded   ui        web/src/i18n/hi.json") {
		t.Fatalf("list: %d\n%s", code, out)
	}
	if code, out := review(root, "-lang", "hi", "-reviewer", "Asha", "-approve", "web/src/i18n/hi.json"); code != 0 || !strings.Contains(out, "approved  web/src/i18n/hi.json") {
		t.Fatalf("approve: %d\n%s", code, out)
	}
	l, _ := i18n.LoadLedger(root, "hi")
	e := l.Find("web/src/i18n/hi.json")
	if e == nil || e.Status != i18n.ReviewApproved || e.Reviewer != "Asha" || e.Date != "2026-11-03" || e.TranslationHash == "" {
		t.Fatalf("entry: %+v", e)
	}
	// The release gate accepts it.
	for _, p := range i18n.Check(root, "hi") {
		if p.Path == "web/src/i18n/hi.json" {
			t.Errorf("gate still reports %s", p.Reason)
		}
	}
	if _, out := review(root, "-lang", "hi"); !strings.Contains(out, "approved     ui        web/src/i18n/hi.json") {
		t.Errorf("list after approval:\n%s", out)
	}
	// Editing the file afterwards makes the approval stale.
	_ = os.WriteFile(filepath.Join(root, "web/src/i18n/hi.json"), []byte(`{"a.hello":"नमस्कार {name}"}`), 0o644)
	if _, out := review(root, "-lang", "hi"); !strings.Contains(out, "stale        ui        web/src/i18n/hi.json") {
		t.Errorf("list after an edit:\n%s", out)
	}
}

func TestReviewRefusesBrokenOrUnknownFiles(t *testing.T) {
	root := repo(t)
	// The quiz has a lesson English does not have: its structure differs, so it is not approved.
	code, out := review(root, "-lang", "hi", "-reviewer", "Asha", "-approve", "web/src/data/quizzes/hi.json", "nope.json")
	if code != 1 || !strings.Contains(out, "structure differs from English") || !strings.Contains(out, "nope.json: not a file this language needs") {
		t.Errorf("exit %d\n%s", code, out)
	}
	l, _ := i18n.LoadLedger(root, "hi")
	if e := l.Find("web/src/data/quizzes/hi.json"); e != nil && e.Status == i18n.ReviewApproved {
		t.Error("a broken file was approved")
	}
	for _, args := range [][]string{{"-lang", "hi", "-approve", "web/src/i18n/hi.json"}, {"-lang", "en", "-approve", "x.json"}, {}} {
		if code, out := review(root, args...); code != 2 {
			t.Errorf("%v: exit %d\n%s", args, code, out)
		}
	}
}

// SPEC-013 FR-008: the owner approves our own English files; an edit afterwards makes them stale.
func TestReviewEnglishOwnFiles(t *testing.T) {
	root := repo(t)
	lesson := "public-content/lessons/1-intro.junior.json"
	f := filepath.Join(root, filepath.FromSlash(lesson))
	_ = os.MkdirAll(filepath.Dir(f), 0o755)
	_ = os.WriteFile(f, []byte(`{"origin":"own","title":"A"}`), 0o644)

	if code, out := review(root, "-lang", "en"); code != 0 || !strings.Contains(out, "pending") || !strings.Contains(out, lesson) {
		t.Fatalf("list: %d %q", code, out)
	}
	if code, out := review(root, "-lang", "en", "-reviewer", "owner", "-approve", "web/src/i18n/en.json"); code != 1 || !strings.Contains(out, "not an English file to approve") {
		t.Fatalf("non-target should be refused: %d %q", code, out)
	}
	if code, out := review(root, "-lang", "en", "-reviewer", "owner", "-approve", lesson); code != 0 {
		t.Fatalf("approve: %d %q", code, out)
	}
	if p := i18n.CheckEnglish(root); len(p) != 0 {
		t.Fatalf("want approved, got %+v", p)
	}
	_ = os.WriteFile(f, []byte(`{"origin":"own","title":"B"}`), 0o644)
	if _, out := review(root, "-lang", "en"); !strings.Contains(out, "stale") {
		t.Fatalf("want stale, got %q", out)
	}
}
