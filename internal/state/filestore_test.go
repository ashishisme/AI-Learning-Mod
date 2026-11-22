// SPEC: DC-09, FR-029
package state_test

import (
	"os"
	"path/filepath"
	"testing"

	"ai-foundations-coach/internal/state"
	"ai-foundations-coach/internal/state/statetest"
)

func TestFileStoreContract(t *testing.T) {
	statetest.RunStoreTests(t, func(path string) (state.Store, error) { return state.OpenFileStore(path) })
}

func TestFileStoreExclusiveLockAndModes(t *testing.T) {
	dir := filepath.Join(t.TempDir(), "data")
	path := filepath.Join(dir, "state.json")
	s, err := state.OpenFileStore(path)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := state.OpenFileStore(path); err == nil {
		t.Fatal("a second open of the same state file must fail while the first is open")
	}
	if info, err := os.Stat(path); err != nil || info.Mode().Perm() != 0o600 {
		t.Errorf("state file mode: %v %v", info, err)
	}
	if info, err := os.Stat(dir); err != nil || info.Mode().Perm() != 0o700 {
		t.Errorf("state directory mode: %v %v", info, err)
	}
	s.Close()
	s2, err := state.OpenFileStore(path)
	if err != nil {
		t.Fatalf("reopen after close: %v", err)
	}
	s2.Close()
}

func TestFileStoreRejectsUnknownVersion(t *testing.T) {
	path := filepath.Join(t.TempDir(), "state.json")
	if err := os.WriteFile(path, []byte(`{"version":99}`), 0o600); err != nil {
		t.Fatal(err)
	}
	if s, err := state.OpenFileStore(path); err == nil {
		s.Close()
		t.Fatal("an unknown version was accepted")
	}
}

func TestFileStoreRejectsCorruptFile(t *testing.T) {
	path := filepath.Join(t.TempDir(), "state.json")
	if err := os.WriteFile(path, []byte("{not json"), 0o600); err != nil {
		t.Fatal(err)
	}
	if s, err := state.OpenFileStore(path); err == nil {
		s.Close()
		t.Fatal("a corrupt state file was accepted")
	}
}
