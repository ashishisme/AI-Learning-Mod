// SPEC: SPEC-013 FR-004, FR-016 (T039)
package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

const ownColab = "https://colab.research.google.com/github/ashishisme/AI-Learning-Mod/blob/cloud-beta/notebooks/"

// Every shipped Detailed lesson is ours, has a 3-5 item "Go further" list of https links that
// avoid Microsoft's course, and opens our own notebook, which exists in notebooks/.
func TestEveryShippedDetailedLessonLinksOnlyToOurNotebookAndNeutralSources(t *testing.T) {
	repo := filepath.Join("..", "..")
	files, err := filepath.Glob(filepath.Join(repo, "public-content", "lessons", "*.detailed.json"))
	if err != nil {
		t.Fatal(err)
	}
	for _, f := range files {
		id := strings.TrimSuffix(filepath.Base(f), ".detailed.json")
		raw, err := os.ReadFile(f)
		if err != nil {
			t.Fatal(err)
		}
		var l struct {
			Origin    string `json:"origin"`
			ColabURL  string `json:"colabUrl"`
			GoFurther []struct {
				Title string `json:"title"`
				URL   string `json:"url"`
				Note  string `json:"note"`
			} `json:"goFurther"`
		}
		if err := json.Unmarshal(raw, &l); err != nil {
			t.Fatalf("%s: %v", f, err)
		}
		if l.Origin != "own" {
			t.Errorf("%s: origin %q, want \"own\"", id, l.Origin)
		}
		if n := len(l.GoFurther); n < 3 || n > 5 {
			t.Errorf("%s: goFurther has %d items, want 3-5", id, n)
		}
		for _, g := range l.GoFurther {
			if !strings.HasPrefix(g.URL, "https://") || strings.Contains(strings.ToLower(g.URL), "microsoft/ai-for-beginners") {
				t.Errorf("%s: goFurther url %q must be https and not Microsoft's course", id, g.URL)
			}
			if g.Title == "" || g.Note == "" {
				t.Errorf("%s: goFurther item %q needs a title and a note", id, g.URL)
			}
		}
		if want := ownColab + id + ".ipynb"; l.ColabURL != want {
			t.Errorf("%s: colabUrl %q, want %q", id, l.ColabURL, want)
		}
		if _, err := os.Stat(filepath.Join(repo, "notebooks", id+".ipynb")); err != nil {
			t.Errorf("%s: notebooks/%s.ipynb is missing", id, id)
		}
	}
}
