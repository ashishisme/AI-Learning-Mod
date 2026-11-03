// SPEC: SPEC-009 FR-017, FR-018, FR-019
package main

import (
	"bytes"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"ai-foundations-coach/internal/i18n"
)

// langRepo is a repository whose English content passes -verify, with Hindi at the given status and
// every Hindi file translated and approved.
func langRepo(t *testing.T, status string) (root, contentDir string) {
	t.Helper()
	root = t.TempDir()
	contentDir = filepath.Join(root, "public-content")
	files := map[string]string{
		"public-content/index.json":                          `{"commitSha":"x","lessons":[{"id":"1-intro"}]}`,
		"public-content/lessons/1-intro.json":                `{"id":"1-intro","blocks":[{"type":"markdown","content":"# Intro"}]}`,
		"public-content/lessons/1-intro.junior.json":         `{"lessonId":"1-intro","mode":"junior","title":"T"}`,
		"public-content/lang/hi/index.json":                  `{"commitSha":"x","lessons":[{"id":"1-intro"}]}`,
		"public-content/lang/hi/lessons/1-intro.json":        `{"id":"1-intro","sourceHash":"h","blocks":[{"type":"markdown","content":"# परिचय"}]}`,
		"public-content/lang/hi/lessons/1-intro.junior.json": `{"lessonId":"1-intro","mode":"junior","title":"शी"}`,
		"web/src/i18n/en.json":                               `{"a.hello":"Hello"}`,
		"web/src/i18n/hi.json":                               `{"a.hello":"नमस्ते"}`,
		"web/src/data/quizzes/en.json":                       `{}`,
		"web/src/data/quizzes/hi.json":                       `{}`,
	}
	if status != "" {
		files["public-content/languages.json"] = `{"languages":[{"code":"hi","name":"हिन्दी","speechLang":"hi-IN","status":"` + status + `"}]}`
	}
	for p, body := range files {
		writeFile(t, filepath.Join(root, filepath.FromSlash(p)), body)
	}
	targets, err := i18n.Targets(root, "hi")
	if err != nil {
		t.Fatal(err)
	}
	l := &i18n.Ledger{Language: "hi"}
	for _, tg := range targets {
		src, err := i18n.SourceHash(root, tg)
		if err != nil {
			t.Fatal(err)
		}
		tr, _ := i18n.HashFile(filepath.Join(root, filepath.FromSlash(tg.Path)))
		l.Entries = append(l.Entries, i18n.Entry{Path: tg.Path, Kind: tg.Kind, SourceHash: src, TranslationHash: tr,
			Status: i18n.ReviewApproved, Reviewer: "reviewer-1", Date: "2026-11-03"})
	}
	if err := l.Save(root); err != nil {
		t.Fatal(err)
	}
	return root, contentDir
}

func writeFile(t *testing.T, p, body string) {
	t.Helper()
	if err := os.MkdirAll(filepath.Dir(p), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(p, []byte(body), 0o644); err != nil {
		t.Fatal(err)
	}
}

func runVerify(contentDir string) (int, string) {
	var out bytes.Buffer
	code := verify(contentDir, &out)
	return code, out.String()
}

func TestVerifyApprovedLanguage(t *testing.T) {
	_, dir := langRepo(t, "approved")
	if code, out := runVerify(dir); code != 0 || out != "" {
		t.Fatalf("all approved: exit %d\n%s", code, out)
	}

	for name, breakIt := range map[string]func(root string){
		"draft": func(root string) {
			l, _ := i18n.LoadLedger(root, "hi")
			l.Upsert(*l.Find("web/src/i18n/hi.json"))
			_ = l.Save(root)
		},
		"stale": func(root string) {
			writeFile(t, filepath.Join(root, "web/src/i18n/en.json"), `{"a.hello":"Hi"}`)
		},
		"missing entry": func(root string) {
			l, _ := i18n.LoadLedger(root, "hi")
			l.Entries = l.Entries[1:]
			_ = l.Save(root)
		},
		"parity": func(root string) {
			writeFile(t, filepath.Join(root, "web/src/i18n/en.json"), `{"a.hello":"Hello","a.bye":"Bye"}`)
		},
	} {
		root, dir := langRepo(t, "approved")
		breakIt(root)
		code, out := runVerify(dir)
		lines := strings.Split(strings.TrimSpace(out), "\n")
		if code != 1 || out == "" {
			t.Errorf("%s: exit %d, output %q", name, code, out)
			continue
		}
		for _, line := range lines {
			if !strings.HasPrefix(line, "hi ") || !strings.Contains(line, ": ") {
				t.Errorf("%s: line %q is not LANG PATH: reason", name, line)
			}
		}
	}
}

func TestVerifyHiddenLanguageOnlyWarns(t *testing.T) {
	root, dir := langRepo(t, "hidden")
	l, _ := i18n.LoadLedger(root, "hi")
	l.Upsert(*l.Find("web/src/i18n/hi.json"))
	_ = l.Save(root)
	code, out := runVerify(dir)
	if code != 0 || !strings.Contains(out, "warning: hi web/src/i18n/hi.json: draft, not yet approved by a reviewer") {
		t.Errorf("exit %d\n%s", code, out)
	}
}

func TestVerifyWithoutLanguagesIsEnglishOnly(t *testing.T) {
	root, dir := langRepo(t, "")
	// With no languages.json, a broken Hindi file is not looked at...
	writeFile(t, filepath.Join(root, "web/src/i18n/hi.json"), `not json`)
	if code, out := runVerify(dir); code != 0 || out != "" {
		t.Errorf("exit %d\n%s", code, out)
	}
	// ...and the English checks still fail as before.
	if err := os.Remove(filepath.Join(dir, "lessons", "1-intro.json")); err != nil {
		t.Fatal(err)
	}
	if code, _ := runVerify(dir); code != 1 {
		t.Errorf("missing English lesson: exit %d", code)
	}
}
