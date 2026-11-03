// SPEC: SPEC-009 FR-017, FR-018, FR-019
package main

import (
	"bytes"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"ai-foundations-coach/internal/i18n"
	"ai-foundations-coach/internal/narration"
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
		"web/src/i18n/en.json":                               `{"a.hello":"Hello","adaptive.chipGreeting":"Hi there!"}`,
		"web/src/i18n/hi.json":                               `{"a.hello":"नमस्ते","adaptive.chipGreeting":"नमस्ते दोस्तों!"}`,
		"web/src/data/quizzes/en.json":                       `{}`,
		"web/src/data/quizzes/hi.json":                       `{}`,
		"content/voices/hi.json":                             `{"personas":{"chip":{"voice":"v-a"},"nova":{"voice":"v-b"},"alan":{"voice":"v-c"}}}`,
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
	recordAll(t, root)
	return root, contentDir
}

// recordAll writes a current recording of every narrated track in every persona.
func recordAll(t *testing.T, root string) {
	t.Helper()
	tracks, err := narration.Tracks(root, "hi")
	if err != nil {
		t.Fatal(err)
	}
	voices, _ := narration.Voices(root, "hi")
	m := &narration.Manifest{Language: "hi", Tracks: map[string]map[string]narration.Recording{}}
	for _, tr := range tracks {
		m.Tracks[tr.Key] = map[string]narration.Recording{}
		for _, p := range narration.Personas {
			file := narration.FileFor(tr.Key, p)
			writeFile(t, filepath.Join(narration.AudioDir(root, "hi"), filepath.FromSlash(file)), "mp3")
			m.Tracks[tr.Key][p] = narration.Recording{File: file, Hash: narration.Hash(voices[p], tr.Text), Bytes: 3}
		}
	}
	raw, _ := json.Marshal(m)
	writeFile(t, filepath.Join(narration.AudioDir(root, "hi"), "manifest.json"), string(raw))
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
	code := verify(contentDir, &out, true)
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
		"missing recording": func(root string) {
			_ = os.Remove(filepath.Join(narration.AudioDir(root, "hi"), "global", "chip-mascot-greeting-nova.mp3"))
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
	_ = os.RemoveAll(narration.AudioDir(root, "hi"))
	l, _ := i18n.LoadLedger(root, "hi")
	l.Upsert(*l.Find("web/src/i18n/hi.json"))
	_ = l.Save(root)
	code, out := runVerify(dir)
	if code != 0 || !strings.Contains(out, "warning: hi audio: no recordings yet") || !strings.Contains(out, "warning: hi web/src/i18n/hi.json: draft, not yet approved by a reviewer") {
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

// -audio=false (CI steps that run before the recordings are copied in) skips only the audio check.
func TestVerifyWithoutAudioSkipsOnlyTheRecordings(t *testing.T) {
	root, dir := langRepo(t, "approved")
	_ = os.RemoveAll(narration.AudioDir(root, "hi"))
	var out bytes.Buffer
	if code := verify(dir, &out, false); code != 0 || out.String() != "" {
		t.Errorf("without audio: exit %d\n%s", code, out.String())
	}
	if code := verify(dir, &out, true); code != 1 || !strings.Contains(out.String(), "hi audio") {
		t.Errorf("with audio: exit %d\n%s", code, out.String())
	}
	l, _ := i18n.LoadLedger(root, "hi")
	l.Upsert(*l.Find("web/src/i18n/hi.json"))
	_ = l.Save(root)
	if code := verify(dir, &bytes.Buffer{}, false); code != 1 {
		t.Errorf("a draft must still fail without audio: exit %d", code)
	}
}
