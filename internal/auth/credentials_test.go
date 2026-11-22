// SPEC: FR-004, FR-005
package auth

import (
	"regexp"
	"testing"
)

func TestBetaIDAndPassphraseFormat(t *testing.T) {
	idRe := regexp.MustCompile(`^BETA-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$`)
	pwRe := regexp.MustCompile(`^([a-z]{3,6}-){4}[0-9]{3}$`)
	seen := map[string]bool{}
	for i := 0; i < 10000; i++ {
		id := NewBetaID()
		if !idRe.MatchString(id) {
			t.Fatalf("bad beta id %q", id)
		}
		if seen[id] {
			t.Fatalf("duplicate beta id %q in 10000", id)
		}
		seen[id] = true
		if pw := NewPassphrase(); !pwRe.MatchString(pw) {
			t.Fatalf("bad passphrase %q", pw)
		}
	}
}

func TestNormalization(t *testing.T) {
	for _, in := range []string{"beta-7kq3-m9xp", "BETA 7KQ3 M9XP", "beta7kq3m9xp", "  Beta-7KQ3-M9XP "} {
		if got := NormalizeBetaID(in); got != "BETA-7KQ3-M9XP" {
			t.Errorf("NormalizeBetaID(%q) = %q", in, got)
		}
	}
	for _, in := range []string{"Maple Tiger  River-Cloud 482", "maple-tiger-river-cloud-482", " MAPLE_tiger-river cloud-482 "} {
		if got := NormalizePassword(in); got != "maple-tiger-river-cloud-482" {
			t.Errorf("NormalizePassword(%q) = %q", in, got)
		}
	}
}

func TestWordListInvariants(t *testing.T) {
	re := regexp.MustCompile(`^[a-z]{3,6}$`)
	seen := map[string]bool{}
	for _, w := range wordList {
		if !re.MatchString(w) {
			t.Errorf("word %q is not 3-6 lowercase letters", w)
		}
		if seen[w] {
			t.Errorf("duplicate word %q", w)
		}
		seen[w] = true
	}
	if len(seen) != 256 {
		t.Fatalf("want 256 unique words, got %d", len(seen))
	}
}

func TestTokens(t *testing.T) {
	a, b := NewToken(), NewToken()
	if a == b || len(a) != 43 {
		t.Fatalf("tokens: %q %q", a, b)
	}
	if HashToken(a) == a || len(HashToken(a)) != 64 || HashToken(a) != HashToken(a) {
		t.Fatal("hash must be a stable 64-char hex digest different from the token")
	}
}
