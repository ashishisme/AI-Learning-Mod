// SPEC: FR-033, NFR-LIC-03; SPEC-013 FR-011, FR-012, SC-004
package ingest

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// content is a complete release: one lesson in all three versions, listed in English and Hindi.
func content(t *testing.T) string {
	t.Helper()
	dir := t.TempDir()
	put(t, dir, "index.json", `{"lessons":[{"id":"1-intro","module":"intro","title":"Intro","order":0}]}`)
	put(t, dir, "lang/hi/index.json", `{"lessons":[{"id":"1-intro","module":"intro","title":"परिचय","order":0}]}`)
	for _, mode := range Modes {
		put(t, dir, "lessons/1-intro."+mode+".json", `{"origin":"own","title":"Intro: the ideas"}`)
	}
	put(t, dir, "lang/hi/lessons/1-intro.detailed.json", `{"origin":"own","title":"परिचय: विचार"}`)
	return dir
}

func put(t *testing.T, dir, name, body string) {
	t.Helper()
	p := filepath.Join(dir, filepath.FromSlash(name))
	if err := os.MkdirAll(filepath.Dir(p), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(p, []byte(body), 0o644); err != nil {
		t.Fatal(err)
	}
}

func TestVerifyContentAcceptsACompleteRelease(t *testing.T) {
	if err := VerifyContent(content(t)); err != nil {
		t.Fatal(err)
	}
	// A language with translated lessons but no lesson list of its own is fine: the app shows the English list.
	dir := content(t)
	_ = os.Remove(filepath.Join(dir, "lang", "hi", "index.json"))
	if err := VerifyContent(dir); err != nil {
		t.Fatal(err)
	}
}

func TestVerifyContentRefusesAnIncompleteOrForeignRelease(t *testing.T) {
	for name, c := range map[string]struct {
		breakIt func(dir string)
		want    string
	}{
		"no index":        {func(d string) { _ = os.Remove(filepath.Join(d, "index.json")) }, "no lesson index"},
		"bad index":       {func(d string) { put(t, d, "index.json", `not json`) }, "lesson index is invalid"},
		"empty index":     {func(d string) { put(t, d, "index.json", `{"lessons":[]}`) }, "lists no lessons"},
		"missing version": {func(d string) { _ = os.Remove(filepath.Join(d, "lessons", "1-intro.junior.json")) }, "has no junior file"},
		"bad lesson":      {func(d string) { put(t, d, "lessons/1-intro.detailed.json", `{`) }, "1-intro.detailed.json is invalid"},
		"not ours":        {func(d string) { put(t, d, "lessons/1-intro.plain-english.json", `{"title":"Intro"}`) }, `not marked "origin": "own"`},
		"imported lesson": {func(d string) { put(t, d, "lessons/1-intro.json", `{"blocks":[]}`) }, "lessons/1-intro.json is not a version of a lesson in the index"},
		"unlisted lesson": {func(d string) { put(t, d, "lessons/9-x.detailed.json", `{"origin":"own"}`) }, "lessons/9-x.detailed.json is not a version"},
		"other title":     {func(d string) { put(t, d, "lessons/1-intro.detailed.json", `{"origin":"own","title":"Welcome"}`) }, "not the start of its Detailed title"},
		"no title":        {func(d string) { put(t, d, "index.json", `{"lessons":[{"id":"1-intro"}]}`) }, "not the start of its Detailed title"},
		"hi other lessons": {func(d string) {
			put(t, d, "lang/hi/index.json", `{"lessons":[{"id":"2-x","title":"परिचय"}]}`)
		}, "hi: lesson 2-x is not in the English index"},
		"hi fewer lessons":  {func(d string) { put(t, d, "lang/hi/index.json", `{"lessons":[]}`) }, "hi: the lesson index lists 0 lessons, English lists 1"},
		"hi no translation": {func(d string) { _ = os.Remove(filepath.Join(d, "lang", "hi", "lessons", "1-intro.detailed.json")) }, "hi: lesson 1-intro is in the index but has no detailed file"},
		"hi other title": {func(d string) {
			put(t, d, "lang/hi/index.json", `{"lessons":[{"id":"1-intro","title":"एआई का परिचय"}]}`)
		}, "hi: lesson 1-intro is listed as"},
	} {
		dir := content(t)
		c.breakIt(dir)
		if err := VerifyContent(dir); err == nil || !strings.Contains(err.Error(), c.want) {
			t.Errorf("%s: got %v, want an error containing %q", name, err, c.want)
		}
	}
}
