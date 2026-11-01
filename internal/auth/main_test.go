package auth

import (
	"os"
	"testing"
)

// Tests use a low iteration count so concurrency tests stay fast, including under -race. The
// production value is pinned in TestHashAndVerify and the known-answer vectors use their own counts.
func TestMain(m *testing.M) {
	passwordIterations = 2000
	os.Exit(m.Run())
}
