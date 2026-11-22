// SPEC: SPEC-009 FR-001, FR-003, FR-018; data-model "Language"
package i18n

import (
	"os"
	"path/filepath"
	"testing"
)

func writeLanguages(t *testing.T, body string) string {
	t.Helper()
	dir := t.TempDir()
	if body != "" {
		if err := os.WriteFile(filepath.Join(dir, "languages.json"), []byte(body), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	return dir
}

func codes(ls []Language) []string {
	out := make([]string, len(ls))
	for i, l := range ls {
		out[i] = l.Code
	}
	return out
}

func TestLoadListsEnglishFirstAndOnlyApproved(t *testing.T) {
	dir := writeLanguages(t, `{"languages":[
		{"code":"hi","name":"हिन्दी","speechLang":"hi-IN","status":"approved"},
		{"code":"ta","name":"தமிழ்","speechLang":"ta-IN","status":"hidden"}]}`)
	set, err := Load(dir)
	if err != nil {
		t.Fatal(err)
	}
	if got := codes(set.Approved()); len(got) != 2 || got[0] != "en" || got[1] != "hi" {
		t.Fatalf("approved = %v, want [en hi]", got)
	}
	if l, ok := set.Lookup("hi"); !ok || l.Name != "हिन्दी" || l.SpeechLang != "hi-IN" {
		t.Errorf("lookup hi = %+v %v", l, ok)
	}
	if _, ok := set.Lookup("ta"); ok {
		t.Error("a hidden language must not be offered")
	}
}

func TestMissingFileMeansEnglishOnly(t *testing.T) {
	set, err := Load(writeLanguages(t, ""))
	if err != nil {
		t.Fatal(err)
	}
	if got := codes(set.Approved()); len(got) != 1 || got[0] != "en" {
		t.Fatalf("approved = %v, want [en]", got)
	}
}

func TestLoadRejectsBadEntries(t *testing.T) {
	for name, body := range map[string]string{
		"bad code":   `{"languages":[{"code":"HI","name":"x","speechLang":"hi-IN","status":"approved"}]}`,
		"traversal":  `{"languages":[{"code":"../x","name":"x","speechLang":"x","status":"approved"}]}`,
		"bad status": `{"languages":[{"code":"hi","name":"x","speechLang":"hi-IN","status":"live"}]}`,
		"english":    `{"languages":[{"code":"en","name":"x","speechLang":"en-US","status":"approved"}]}`,
		"duplicate":  `{"languages":[{"code":"hi","name":"x","speechLang":"hi-IN","status":"hidden"},{"code":"hi","name":"y","speechLang":"hi-IN","status":"hidden"}]}`,
		"no name":    `{"languages":[{"code":"hi","name":"","speechLang":"hi-IN","status":"hidden"}]}`,
		"not json":   `{`,
	} {
		if _, err := Load(writeLanguages(t, body)); err == nil {
			t.Errorf("%s: expected an error", name)
		}
	}
}

func TestResolveFallsBackToEnglish(t *testing.T) {
	set, _ := Load(writeLanguages(t, `{"languages":[
		{"code":"hi","name":"हिन्दी","speechLang":"hi-IN","status":"approved"},
		{"code":"ta","name":"தமிழ்","speechLang":"ta-IN","status":"hidden"}]}`))
	for in, want := range map[string]string{
		"hi": "hi", "en": "en", "": "en", "HI": "en", "zz": "en", "ta": "en", "../hi": "en", "hi/../x": "en", "h": "en",
	} {
		if got := set.Resolve(in); got != want {
			t.Errorf("Resolve(%q) = %q, want %q", in, got, want)
		}
	}
	// The zero value is usable and English-only.
	var empty *Set
	if empty.Resolve("hi") != "en" || len(empty.Approved()) != 1 {
		t.Error("nil Set must behave as English only")
	}
}
