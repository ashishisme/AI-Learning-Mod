// SPEC: SPEC-013 FR-008 (English owner approvals)
package i18n

import (
	"os"
	"path/filepath"
	"testing"
)

func writeEN(t *testing.T, root, p, body string) {
	t.Helper()
	f := filepath.Join(root, filepath.FromSlash(p))
	if err := os.MkdirAll(filepath.Dir(f), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(f, []byte(body), 0o644); err != nil {
		t.Fatal(err)
	}
}

func approveEN(t *testing.T, root string, l *Ledger, tg Target) {
	t.Helper()
	h, err := HashFile(filepath.Join(root, filepath.FromSlash(tg.Path)))
	if err != nil {
		t.Fatal(err)
	}
	l.Entries = append(l.Entries, Entry{Path: tg.Path, Kind: tg.Kind, SourceHash: h, Status: ReviewApproved, Reviewer: "owner", Date: "2026-11-13"})
}

func TestEnglishTargets(t *testing.T) {
	root := t.TempDir()
	writeEN(t, root, "public-content/lessons/1-intro.json", `{"id":"1-intro"}`)
	writeEN(t, root, "public-content/lessons/1-intro.junior.json", `{"origin":"own","title":"A"}`)
	writeEN(t, root, "public-content/lessons/2-symbolic.junior.json", `{"title":"derived"}`)
	writeEN(t, root, "web/src/data/quizzes/en.json", `{"1-intro":{"title":"Q"}}`)
	writeEN(t, root, "notebooks/1-intro.ipynb", `{"cells":[]}`)

	got, err := EnglishTargets(root)
	if err != nil {
		t.Fatal(err)
	}
	want := map[string]string{"public-content/lessons/1-intro.junior.json": KindAdaptive, "notebooks/1-intro.ipynb": KindNotebook}
	if len(got) != len(want) {
		t.Fatalf("targets = %+v, want %v", got, want)
	}
	for _, tg := range got {
		if want[tg.Path] != tg.Kind {
			t.Errorf("unexpected target %+v", tg)
		}
	}

	// An own quiz entry makes the quiz file a target.
	writeEN(t, root, "web/src/data/quizzes/en.json", `{"1-intro":{"title":"Q","origin":"own"}}`)
	got, _ = EnglishTargets(root)
	found := false
	for _, tg := range got {
		found = found || (tg.Path == "web/src/data/quizzes/en.json" && tg.Kind == KindQuiz)
	}
	if !found {
		t.Errorf("own quiz is not a target: %+v", got)
	}
}

func TestCheckEnglish(t *testing.T) {
	root := t.TempDir()
	lesson := "public-content/lessons/1-intro.junior.json"
	writeEN(t, root, lesson, `{"origin":"own","title":"A"}`)

	if p := CheckEnglish(root); len(p) != 1 || p[0].Path != lesson || p[0].Reason != "pending" {
		t.Fatalf("want pending, got %+v", p)
	}

	l := &Ledger{Language: "en"}
	approveEN(t, root, l, Target{Path: lesson, Kind: KindAdaptive})
	if err := l.Save(root); err != nil {
		t.Fatal(err)
	}
	if p := CheckEnglish(root); len(p) != 0 {
		t.Fatalf("want approved, got %+v", p)
	}

	writeEN(t, root, lesson, `{"origin":"own","title":"B"}`)
	if p := CheckEnglish(root); len(p) != 1 || p[0].Reason != "stale: the text changed after approval" {
		t.Fatalf("want stale, got %+v", p)
	}
}
