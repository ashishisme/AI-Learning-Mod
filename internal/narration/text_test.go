// SPEC: SPEC-009 FR-012, FR-014, research R10
package narration

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestTextRuleMatchesTheSharedFixture(t *testing.T) {
	raw, err := os.ReadFile(filepath.Join("..", "..", "content", "fixtures", "narration-text.json"))
	if err != nil {
		t.Fatal(err)
	}
	var f struct {
		Sections []struct{ Heading, ChipQuote, Body, ChipSays, Want string }
	}
	if err := json.Unmarshal(raw, &f); err != nil {
		t.Fatal(err)
	}
	for _, c := range f.Sections {
		if got := Clean(Section(c.Heading, c.ChipQuote, c.Body, c.ChipSays)); got != c.Want {
			t.Errorf("%q:\n got %q\nwant %q", c.Heading, got, c.Want)
		}
	}
}

// repo has one Hindi Kids lesson with an intro, a greeting and two sections (one without an id).
func repo(t *testing.T) string {
	t.Helper()
	root := t.TempDir()
	for p, body := range map[string]string{
		"web/src/i18n/en.json":                               `{"narration.chipSays":"Chip says: ","adaptive.chipGreeting":"Hello!"}`,
		"web/src/i18n/hi.json":                               `{"narration.chipSays":"चिप कहता है: ","adaptive.chipGreeting":"नमस्ते!"}`,
		"content/voices/hi.json":                             `{"language":"hi","personas":{"chip":{"voice":"hi-IN-Wavenet-A","speakingRate":1,"pitch":0},"nova":{"voice":"hi-IN-Wavenet-D","speakingRate":0.95,"pitch":0},"alan":{"voice":"hi-IN-Wavenet-B","speakingRate":1,"pitch":-1}}}`,
		"public-content/lang/hi/lessons/1-intro.junior.json": `{"lessonId":"1-intro","mode":"junior","intro":"परिचय","mascot":{"greeting":"हाय!"},"sections":[{"id":"what","heading":"क्या","chipQuote":"वाह","bodyMarkdown":"**एआई** सीखता है।"},{"heading":"दो","bodyMarkdown":"दूसरा।"}]}`,
	} {
		f := filepath.Join(root, filepath.FromSlash(p))
		if err := os.MkdirAll(filepath.Dir(f), 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(f, []byte(body), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	return root
}

func TestTracksUseTheUIsKeys(t *testing.T) {
	tracks, err := Tracks(repo(t), "hi")
	if err != nil {
		t.Fatal(err)
	}
	got := map[string]string{}
	for _, tr := range tracks {
		got[tr.Key] = tr.Text
	}
	want := map[string]string{
		"global/chip-mascot-greeting":         "नमस्ते!",
		"1-intro/junior/intro-guide-note":     "परिचय",
		"1-intro/junior/chip-mascot-greeting": "हाय!",
		"1-intro/junior/section-what":         "क्या. चिप कहता है: वाह. एआई सीखता है।",
		"1-intro/junior/section-1":            "दो. दूसरा।",
	}
	if len(got) != len(want) {
		t.Errorf("tracks: %v", got)
	}
	for k, v := range want {
		if got[k] != v {
			t.Errorf("%s: got %q, want %q", k, got[k], v)
		}
	}
}

func TestCheckFindsMissingAndOutOfDateRecordings(t *testing.T) {
	root := repo(t)
	ps, err := Check(root, "hi")
	if err != nil {
		t.Fatal(err)
	}
	if len(ps) != 5*3 || !strings.Contains(ps[0].Reason, "not recorded") {
		t.Fatalf("want every track in every persona not recorded, got %d: %v", len(ps), ps)
	}

	// Record everything, then change one text.
	tracks, _ := Tracks(root, "hi")
	voices, _ := Voices(root, "hi")
	m := &Manifest{Language: "hi", Tracks: map[string]map[string]Recording{}}
	for _, tr := range tracks {
		m.Tracks[tr.Key] = map[string]Recording{}
		for _, p := range Personas {
			file := FileFor(tr.Key, p)
			full := filepath.Join(AudioDir(root, "hi"), filepath.FromSlash(file))
			_ = os.MkdirAll(filepath.Dir(full), 0o755)
			_ = os.WriteFile(full, []byte("mp3"), 0o644)
			m.Tracks[tr.Key][p] = Recording{File: file, Hash: Hash(voices[p], tr.Text), Bytes: 3}
		}
	}
	raw, _ := json.Marshal(m)
	_ = os.WriteFile(filepath.Join(AudioDir(root, "hi"), "manifest.json"), raw, 0o644)
	if ps, _ := Check(root, "hi"); len(ps) != 0 {
		t.Fatalf("all recorded: %v", ps)
	}

	lesson := filepath.Join(root, "public-content/lang/hi/lessons/1-intro.junior.json")
	b, _ := os.ReadFile(lesson)
	_ = os.WriteFile(lesson, []byte(strings.Replace(string(b), "परिचय", "नया परिचय", 1)), 0o644)
	_ = os.Remove(filepath.Join(AudioDir(root, "hi"), "1-intro", "junior", "section-1-alan.mp3"))
	ps, _ = Check(root, "hi")
	reasons := map[string]bool{}
	for _, p := range ps {
		reasons[p.Key+": "+p.Reason] = true
	}
	for _, want := range []string{
		"1-intro/junior/intro-guide-note: chip: recording is out of date",
		"1-intro/junior/section-1: alan: recording file is missing",
	} {
		if !reasons[want] {
			t.Errorf("missing %q in %v", want, ps)
		}
	}
	if len(ps) != 4 {
		t.Errorf("want 3 out of date and 1 missing, got %v", ps)
	}
}

func TestCheckNeedsChosenVoices(t *testing.T) {
	root := repo(t)
	_ = os.WriteFile(filepath.Join(root, "content/voices/hi.json"), []byte(`{"personas":{"chip":{"voice":""}}}`), 0o644)
	ps, _ := Check(root, "hi")
	if len(ps) == 0 || !strings.Contains(ps[0].Reason, "no voice chosen") {
		t.Errorf("%v", ps)
	}
}
