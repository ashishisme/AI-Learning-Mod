// SPEC: NFR-LIC-05, AC-57
package main

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func setup(t *testing.T, files map[string]string, assets []Asset) string {
	t.Helper()
	root := t.TempDir()
	for rel, body := range files {
		p := filepath.Join(root, "web", "public", "brand", filepath.FromSlash(rel))
		if err := os.MkdirAll(filepath.Dir(p), 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(p, []byte(body), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	raw, _ := json.Marshal(Register{Assets: assets})
	reg := filepath.Join(root, "design", "brand", "asset-register.json")
	if err := os.MkdirAll(filepath.Dir(reg), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(reg, raw, 0o644); err != nil {
		t.Fatal(err)
	}
	return root
}

func sum(s string) string {
	h := sha256.Sum256([]byte(s))
	return hex.EncodeToString(h[:])
}

func approvedAsset(path, body string) Asset {
	return Asset{ID: "chip-wave", Status: "approved", TrademarkScreen: "clear", AltKey: "brand.chipWave",
		ReleaseFiles: []File{{Path: path, SHA256: sum(body)}}}
}

func TestPassesWithNothingShipped(t *testing.T) {
	root := setup(t, nil, nil)
	if p, err := Check(root); err != nil || len(p) != 0 {
		t.Fatalf("problems %v, err %v", p, err)
	}
}

func TestPassesForAnApprovedMatchingFile(t *testing.T) {
	root := setup(t, map[string]string{"chip/wave.svg": "<svg/>"}, []Asset{approvedAsset("chip/wave.svg", "<svg/>")})
	if p, err := Check(root); err != nil || len(p) != 0 {
		t.Fatalf("problems %v, err %v", p, err)
	}
}

func TestRefusals(t *testing.T) {
	cases := map[string]struct {
		files  map[string]string
		assets []Asset
		want   string
	}{
		"unregistered file": {map[string]string{"x.svg": "a"}, nil, "no approved register entry"},
		"draft only": {map[string]string{"x.svg": "a"}, []Asset{func() Asset {
			a := approvedAsset("x.svg", "a")
			a.Status = "draft"
			return a
		}()}, "no approved register entry"},
		"checksum mismatch": {map[string]string{"x.svg": "changed"}, []Asset{approvedAsset("x.svg", "a")}, "does not match"},
		"trademark not clear": {map[string]string{"x.svg": "a"}, []Asset{func() Asset {
			a := approvedAsset("x.svg", "a")
			a.TrademarkScreen = "needs-review"
			return a
		}()}, "trademark screen"},
		"no alt text": {map[string]string{"x.svg": "a"}, []Asset{func() Asset {
			a := approvedAsset("x.svg", "a")
			a.AltKey = ""
			return a
		}()}, "altKey or decorative"},
		"bad type": {map[string]string{"x.gif": "a"}, nil, "file type not allowed"},
	}
	for name, c := range cases {
		root := setup(t, c.files, c.assets)
		p, err := Check(root)
		if err != nil {
			t.Fatalf("%s: %v", name, err)
		}
		if len(p) == 0 || !strings.Contains(strings.Join(p, "\n"), c.want) {
			t.Errorf("%s: problems %v, want one containing %q", name, p, c.want)
		}
	}
}

func TestDecorativeNeedsNoAltKey(t *testing.T) {
	a := approvedAsset("x.svg", "a")
	a.AltKey, a.Decorative = "", true
	root := setup(t, map[string]string{"x.svg": "a"}, []Asset{a})
	if p, _ := Check(root); len(p) != 0 {
		t.Fatalf("problems %v", p)
	}
}
