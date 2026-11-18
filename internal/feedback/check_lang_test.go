// SPEC: SPEC-009 FR-022, SC-006; FR-048, SC-018; AC-82 (FR-I18N-05 amended 2.18.0)
package feedback

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func loadJSON(t *testing.T, path string, v any) {
	t.Helper()
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	if err := json.Unmarshal(data, v); err != nil {
		t.Fatalf("%s: %v", path, err)
	}
}

// languages lists the codes with a testdata/<code>_personal_details.json test set (hi, kn, ta).
func languages(t *testing.T) []string {
	files, _ := filepath.Glob("testdata/*_personal_details.json")
	var codes []string
	for _, f := range files {
		codes = append(codes, strings.TrimSuffix(filepath.Base(f), "_personal_details.json"))
	}
	if len(codes) < 3 {
		t.Fatalf("found %v, want hi, kn and ta", codes)
	}
	return codes
}

// Hindi's sets were written first and are larger; every language needs at least this many items.
func minItems(code string) int {
	if code == "hi" {
		return 60
	}
	return 30
}

func TestCheckRejectsPersonalDetailsInEveryLanguage(t *testing.T) {
	for _, code := range languages(t) {
		t.Run(code, func(t *testing.T) { rejectsPersonalDetails(t, code) })
	}
}

func TestCheckPassesCleanTextInEveryLanguage(t *testing.T) {
	for _, code := range languages(t) {
		t.Run(code, func(t *testing.T) { passesClean(t, code) })
	}
}

func rejectsPersonalDetails(t *testing.T, code string) {
	var items []struct{ Text, Kind string }
	loadJSON(t, "testdata/"+code+"_personal_details.json", &items)
	if len(items) < minItems(code) {
		t.Fatalf("corpus has %d items, want at least %d", len(items), minItems(code))
	}
	kinds := map[string]bool{}
	for _, it := range items {
		kinds[it.Kind] = true
		got, found := Check(it.Text)
		switch {
		case !found:
			t.Errorf("not caught: %q (want %s)", it.Text, it.Kind)
		case got != it.Kind:
			t.Errorf("%q: kind %s, want %s", it.Text, got, it.Kind)
		}
	}
	for _, k := range []string{KindEmail, KindPhone, KindAddress, KindIDNumber, KindDateOfBirth, KindLink} {
		if !kinds[k] {
			t.Errorf("corpus has no %s example", k)
		}
	}
}

func passesClean(t *testing.T, code string) {
	var msgs []string
	loadJSON(t, "testdata/"+code+"_clean.json", &msgs)
	if len(msgs) < minItems(code)/2 {
		t.Fatalf("corpus has %d items, want at least %d", len(msgs), minItems(code)/2)
	}
	refused := 0
	for _, m := range msgs {
		if kind, found := Check(m); found {
			refused++
			t.Logf("refused clean message %q as %s", m, kind)
		}
	}
	// SC-006: at least 95% of clean text passes.
	if passed := len(msgs) - refused; passed*100 < 95*len(msgs) {
		t.Errorf("%d of %d clean messages passed, want at least 95%%", passed, len(msgs))
	}
}
