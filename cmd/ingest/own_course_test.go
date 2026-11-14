// SPEC: AC-75 (FR-CNT-12, NFR-LIC-01); SPEC-013 SC-003 (T054)
package main

import (
	"bytes"
	"io/fs"
	"os"
	"path/filepath"
	"testing"
)

// Nothing we ship names or links to the course this product once imported. Recorded audio is
// skipped: it is sound, not text, and is not in the repository.
func TestShippedTextNamesNoOtherCourse(t *testing.T) {
	repo := filepath.Join("..", "..")
	needles := [][]byte{[]byte("ai-for-beginners"), []byte("microsoft/")}
	// Paths, relative to the repository, that may keep a reference. None today.
	allowed := map[string]bool{}

	for _, dir := range []string{"public-content", "web/src", "web/public", "internal"} {
		err := filepath.WalkDir(filepath.Join(repo, dir), func(path string, d fs.DirEntry, err error) error {
			if err != nil {
				return err
			}
			rel, _ := filepath.Rel(repo, path)
			rel = filepath.ToSlash(rel)
			if d.IsDir() {
				if rel == "public-content/audio" {
					return filepath.SkipDir
				}
				return nil
			}
			if allowed[rel] {
				return nil
			}
			raw, err := os.ReadFile(path)
			if err != nil {
				return err
			}
			raw = bytes.ToLower(raw)
			for _, n := range needles {
				if bytes.Contains(raw, n) {
					t.Errorf("%s mentions %q", rel, n)
				}
			}
			return nil
		})
		if err != nil {
			t.Fatal(err)
		}
	}
}
