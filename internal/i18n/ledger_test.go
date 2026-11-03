// SPEC: SPEC-009 FR-017, FR-018, FR-019
package i18n

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// fixture is a tiny repository: one of each kind in English and Hindi, every Hindi file approved.
func fixture(t *testing.T) string {
	t.Helper()
	root := t.TempDir()
	files := map[string]string{
		"web/src/i18n/en.json":                               `{"a.hello":"Hello {name}","n.count.one":"{count} item","n.count.other":"{count} items"}`,
		"web/src/i18n/hi.json":                               `{"a.hello":"नमस्ते {name}","n.count.one":"{count} चीज़","n.count.other":"{count} चीज़ें"}`,
		"web/src/data/quizzes/en.json":                       `{"1-intro":{"lessonId":"1-intro","title":"Intro","description":"D","questions":[{"id":"q1","prompt":"P","options":["a","b"],"correctIndex":1,"rationale":"R","hintKeyword":"k"}]}}`,
		"web/src/data/quizzes/hi.json":                       `{"1-intro":{"lessonId":"1-intro","title":"परिचय","description":"वि","questions":[{"id":"q1","prompt":"प्र","options":["क","ख"],"correctIndex":1,"rationale":"का","hintKeyword":"कु"}]}}`,
		"public-content/index.json":                          `{"lessons":[{"id":"1-intro"}]}`,
		"public-content/lessons/1-intro.json":                `{"id":"1-intro","blocks":[]}`,
		"public-content/lessons/1-intro.junior.json":         `{"lessonId":"1-intro","mode":"junior","title":"T","sections":[{"id":"s1","heading":"H","bodyMarkdown":"See ` + "`x`" + ` at [docs](https://a.b) §1"}]}`,
		"public-content/lang/hi/lessons/1-intro.json":        `{"id":"1-intro","sourceHash":"upstream-readme-hash","blocks":[]}`,
		"public-content/lang/hi/lessons/1-intro.junior.json": `{"lessonId":"1-intro","mode":"junior","title":"शी","sections":[{"id":"s1","heading":"शी","bodyMarkdown":"` + "`x`" + ` को [दस्तावेज़](https://a.b) पर देखें §1"}]}`,
	}
	for p, body := range files {
		write(t, root, p, body)
	}
	approveAll(t, root)
	return root
}

func write(t *testing.T, root, p, body string) {
	t.Helper()
	f := filepath.Join(root, filepath.FromSlash(p))
	if err := os.MkdirAll(filepath.Dir(f), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(f, []byte(body), 0o644); err != nil {
		t.Fatal(err)
	}
}

func approveAll(t *testing.T, root string) {
	t.Helper()
	targets, err := Targets(root, "hi")
	if err != nil {
		t.Fatal(err)
	}
	l := &Ledger{Language: "hi"}
	for _, tg := range targets {
		src, err := SourceHash(root, tg)
		if err != nil {
			t.Fatal(err)
		}
		tr, err := HashFile(filepath.Join(root, filepath.FromSlash(tg.Path)))
		if err != nil {
			t.Fatal(err)
		}
		l.Entries = append(l.Entries, Entry{Path: tg.Path, Kind: tg.Kind, SourceHash: src, TranslationHash: tr,
			Status: ReviewApproved, Reviewer: "reviewer-1", Date: "2026-11-03"})
	}
	if err := l.Save(root); err != nil {
		t.Fatal(err)
	}
}

func reasons(ps []Problem) string {
	var b strings.Builder
	for _, p := range ps {
		b.WriteString(p.Path + ": " + p.Reason + "\n")
	}
	return b.String()
}

func expectProblem(t *testing.T, root, path, reason string) {
	t.Helper()
	got := reasons(Check(root, "hi"))
	if !strings.Contains(got, path+": "+reason) {
		t.Errorf("want %q for %s, got:\n%s", reason, path, got)
	}
}

func TestLedgerTargetsCoverEveryKind(t *testing.T) {
	targets, err := Targets(fixture(t), "hi")
	if err != nil {
		t.Fatal(err)
	}
	kinds := map[string]string{}
	for _, tg := range targets {
		kinds[tg.Path] = tg.Kind
	}
	want := map[string]string{
		"web/src/i18n/hi.json":                               KindUI,
		"web/src/data/quizzes/hi.json":                       KindQuiz,
		"public-content/lang/hi/lessons/1-intro.junior.json": KindAdaptive,
		"public-content/lang/hi/lessons/1-intro.json":        KindBase,
	}
	if len(kinds) != len(want) {
		t.Errorf("targets: %v", kinds)
	}
	for p, k := range want {
		if kinds[p] != k {
			t.Errorf("%s: kind %q, want %q", p, kinds[p], k)
		}
	}
}

func TestLedgerApprovedAndCurrentPasses(t *testing.T) {
	if ps := Check(fixture(t), "hi"); len(ps) != 0 {
		t.Errorf("problems:\n%s", reasons(ps))
	}
}

func TestLedgerMissingEntriesAndFiles(t *testing.T) {
	root := fixture(t)
	if err := os.Remove(LedgerPath(root, "hi")); err != nil {
		t.Fatal(err)
	}
	ps := Check(root, "hi")
	if len(ps) != 4 || !strings.Contains(reasons(ps), "web/src/i18n/hi.json: no review entry") {
		t.Errorf("want a missing entry per file:\n%s", reasons(ps))
	}

	root = fixture(t)
	if err := os.Remove(filepath.Join(root, "web", "src", "data", "quizzes", "hi.json")); err != nil {
		t.Fatal(err)
	}
	expectProblem(t, root, "web/src/data/quizzes/hi.json", "not translated yet")
}

func TestLedgerDraftAndStale(t *testing.T) {
	root := fixture(t)
	l, _ := LoadLedger(root, "hi")
	e := *l.Find("web/src/i18n/hi.json")
	l.Upsert(e) // a fresh draft drops the approval
	if got := l.Find("web/src/i18n/hi.json"); got.Status != ReviewDraft || got.Reviewer != "" || got.Date != "" {
		t.Fatalf("upsert kept the approval: %+v", got)
	}
	if err := l.Save(root); err != nil {
		t.Fatal(err)
	}
	expectProblem(t, root, "web/src/i18n/hi.json", "draft, not yet approved by a reviewer")

	// The English source changed after approval.
	root = fixture(t)
	write(t, root, "public-content/lessons/1-intro.junior.json", `{"lessonId":"1-intro","mode":"junior","title":"T2","sections":[{"id":"s1","heading":"H","bodyMarkdown":"See `+"`x`"+` at [docs](https://a.b) §1"}]}`)
	expectProblem(t, root, "public-content/lang/hi/lessons/1-intro.junior.json", "stale: the English source changed after approval")

	// The translation was edited after approval.
	root = fixture(t)
	write(t, root, "web/src/i18n/hi.json", `{"a.hello":"नमस्कार {name}","n.count.other":"{count} चीज़ें"}`)
	expectProblem(t, root, "web/src/i18n/hi.json", "stale: the translation changed after approval")

	// Upstream changed its README: the base lesson records a new source hash.
	root = fixture(t)
	write(t, root, "public-content/lang/hi/lessons/1-intro.json", `{"id":"1-intro","sourceHash":"new-upstream-hash","blocks":[]}`)
	expectProblem(t, root, "public-content/lang/hi/lessons/1-intro.json", "stale: the English source changed after approval")
}

func TestLedgerRejectsBadEntries(t *testing.T) {
	root := fixture(t)
	l, _ := LoadLedger(root, "hi")
	l.Find("web/src/i18n/hi.json").Status = "ok"
	l.Find("web/src/data/quizzes/hi.json").Kind = "image"
	l.Find("public-content/lang/hi/lessons/1-intro.json").Reviewer = ""
	l.Entries = append(l.Entries, Entry{Path: "public-content/lang/hi/lessons/9-x.json", Kind: KindBase, Status: ReviewApproved})
	if err := l.Save(root); err != nil {
		t.Fatal(err)
	}
	expectProblem(t, root, "web/src/i18n/hi.json", `review status "ok" is not draft or approved`)
	expectProblem(t, root, "web/src/data/quizzes/hi.json", `unknown kind "image"`)
	expectProblem(t, root, "public-content/lang/hi/lessons/1-intro.json", "approved without a reviewer and date")
	expectProblem(t, root, "public-content/lang/hi/lessons/9-x.json", "review entry for a file this language does not need")
}
