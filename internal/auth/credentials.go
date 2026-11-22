// SPEC: FR-004, FR-005, FR-003
package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"strings"
)

const betaIDAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // 32 symbols, no 0 O 1 I

func randBytes(n int) []byte {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		panic("auth: no randomness available: " + err.Error())
	}
	return b
}

// randFrom picks n symbols from alphabet without modulo bias (rejection sampling).
func randFrom(alphabet string, n int) string {
	out := make([]byte, 0, n)
	limit := 256 - (256 % len(alphabet))
	for len(out) < n {
		for _, b := range randBytes(n * 2) {
			if int(b) < limit {
				out = append(out, alphabet[int(b)%len(alphabet)])
				if len(out) == n {
					break
				}
			}
		}
	}
	return string(out)
}

// NewBetaID returns an ID such as BETA-7KQ3-M9XP (40 random bits).
func NewBetaID() string {
	s := randFrom(betaIDAlphabet, 8)
	return "BETA-" + s[:4] + "-" + s[4:]
}

// NewPassphrase returns four words and a 3-digit number, such as maple-tiger-river-cloud-482
// (32 + about 10 bits).
func NewPassphrase() string {
	parts := make([]string, 0, 5)
	for _, b := range randBytes(4) {
		parts = append(parts, wordList[b])
	}
	parts = append(parts, randFrom("0123456789", 3))
	return strings.Join(parts, "-")
}

// NormalizeBetaID accepts any case, spaces or dashes, and a missing "BETA" dash.
func NormalizeBetaID(s string) string {
	var b strings.Builder
	for _, r := range strings.ToUpper(s) {
		if r != ' ' && r != '-' && r != '_' && r != ' ' {
			b.WriteRune(r)
		}
	}
	c := b.String()
	if strings.HasPrefix(c, "BETA") && len(c) == 12 {
		return "BETA-" + c[4:8] + "-" + c[8:]
	}
	return c
}

// NormalizePassword is case-insensitive and treats spaces and dashes alike.
func NormalizePassword(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	return strings.Join(strings.FieldsFunc(s, func(r rune) bool { return r == ' ' || r == '-' || r == '_' || r == ' ' }), "-")
}

// NewToken returns 32 random bytes as base64url (256 bits). Used for invite links and sessions.
func NewToken() string { return base64.RawURLEncoding.EncodeToString(randBytes(32)) }

// HashToken is the hex SHA-256 of a token. Only the hash is ever stored.
func HashToken(t string) string {
	h := sha256.Sum256([]byte(t))
	return hex.EncodeToString(h[:])
}

// newInviteID returns a 10-character public handle for admins (list and revoke).
func newInviteID() string { return randFrom("abcdefghijklmnopqrstuvwxyz23456789", 10) }
