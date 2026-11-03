// SPEC: SPEC-009 FR-022, SC-006; FR-048, SC-018
package feedback

import (
	"encoding/json"
	"os"
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

func TestCheckRejectsHindiPersonalDetails(t *testing.T) {
	var items []struct{ Text, Kind string }
	loadJSON(t, "testdata/hi_personal_details.json", &items)
	if len(items) < 60 {
		t.Fatalf("corpus has %d items, want at least 60", len(items))
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

func TestCheckPassesCleanHindi(t *testing.T) {
	var msgs []string
	loadJSON(t, "testdata/hi_clean.json", &msgs)
	if len(msgs) < 60 {
		t.Fatalf("corpus has %d items, want at least 60", len(msgs))
	}
	refused := 0
	for _, m := range msgs {
		if kind, found := Check(m); found {
			refused++
			t.Logf("refused clean message %q as %s", m, kind)
		}
	}
	// SC-006: at least 95% of clean Hindi passes.
	if passed := len(msgs) - refused; passed*100 < 95*len(msgs) {
		t.Errorf("%d of %d clean messages passed, want at least 95%%", passed, len(msgs))
	}
}
