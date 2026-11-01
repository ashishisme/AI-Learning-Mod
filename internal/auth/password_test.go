// SPEC: FR-004, FR-005
package auth

import (
	"encoding/hex"
	"fmt"
	"strings"
	"testing"
)

// RFC 7914 section 11 PBKDF2-HMAC-SHA-256 vectors. The hex values were cross-checked once with
// Python's hashlib.pbkdf2_hmac at authoring time; Python is not part of the repository.
func TestPBKDF2KnownAnswers(t *testing.T) {
	cases := []struct {
		pw, salt string
		iter     int
		want     string
	}{
		{"passwd", "salt", 1, "55ac046e56e3089fec1691c22544b605f94185216dde0465e68b9d57c20dacbc49ca9cccf179b645991664b39d77ef317c71b845b1e30bd509112041d3a19783"},
		{"Password", "NaCl", 80000, "4ddcd8f60b98be21830cee5ef22701f9641a4418d04c0414aeff08876b34ab56a1d425a1225833549adb841b51c9b3176a272bdebba1d078478f62b397f33c8d"},
	}
	for _, c := range cases {
		got := hex.EncodeToString(pbkdf2Sha256([]byte(c.pw), []byte(c.salt), c.iter, 64))
		if got != c.want {
			t.Errorf("pbkdf2(%q,%q,%d) = %s", c.pw, c.salt, c.iter, got)
		}
	}
}

func TestHashAndVerify(t *testing.T) {
	h := HashPassword("maple-tiger-river-cloud-482")
	if !strings.HasPrefix(h, fmt.Sprintf("pbkdf2-sha256$%d$", passwordIterations)) {
		t.Fatalf("unexpected format: %s", h)
	}
	if defaultPasswordIterations != 200_000 {
		t.Fatal("the production iteration count is pinned at 200000 until the owner decides otherwise")
	}
	if strings.Contains(h, "maple") {
		t.Fatal("hash must not contain the password")
	}
	if !VerifyPassword("maple-tiger-river-cloud-482", h) {
		t.Fatal("correct password rejected")
	}
	if VerifyPassword("maple-tiger-river-cloud-483", h) {
		t.Fatal("wrong password accepted")
	}
	if HashPassword("same") == HashPassword("same") {
		t.Fatal("salts must differ between hashes")
	}
}

func TestVerifyMalformedAndStoredIterations(t *testing.T) {
	for _, bad := range []string{"", "x", "pbkdf2-sha256$1$a$b", "md5$1$AAAA$AAAA", "pbkdf2-sha256$0$AAAA$AAAA",
		"pbkdf2-sha256$abc$AAAA$AAAA", "pbkdf2-sha256$99999999999$AAAA$AAAA", "pbkdf2-sha256$1$!!$AAAA"} {
		if VerifyPassword("pw", bad) {
			t.Errorf("malformed hash %q verified", bad)
		}
	}
	// A hash made with a lower stored iteration count still verifies: the count comes from the string.
	old := encodeHash("old-password", []byte("0123456789abcdef"), 1000)
	if !VerifyPassword("old-password", old) {
		t.Fatal("hash with a different stored iteration count must verify")
	}
}
