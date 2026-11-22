// SPEC: FR-004, FR-005, NFR-SEC-01 (password storage)
package auth

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/binary"
	"fmt"
	"strconv"
	"strings"
	"sync"
)

const (
	pbkdf2Scheme = "pbkdf2-sha256"
	// defaultPasswordIterations is below OWASP's current 600,000 for PBKDF2-HMAC-SHA256 because
	// passwords here are machine-generated (about 42 bits) and the instance may be small. The count
	// is stored with every hash, so it can be raised later and old hashes still verify.
	defaultPasswordIterations = 200_000
	saltBytes                 = 16
	hashBytes                 = 32
)

// passwordIterations is a variable only so tests can lower it.
var passwordIterations = defaultPasswordIterations

// pbkdf2Sha256 is PBKDF2 (RFC 8018) with HMAC-SHA-256. golang.org/x/crypto is not available and Go
// 1.23 has no crypto/pbkdf2 (added in Go 1.24).
func pbkdf2Sha256(password, salt []byte, iter, keyLen int) []byte {
	prf := hmac.New(sha256.New, password)
	hLen := prf.Size()
	blocks := (keyLen + hLen - 1) / hLen
	out := make([]byte, 0, blocks*hLen)
	var counter [4]byte
	for b := 1; b <= blocks; b++ {
		prf.Reset()
		prf.Write(salt)
		binary.BigEndian.PutUint32(counter[:], uint32(b))
		prf.Write(counter[:])
		u := prf.Sum(nil)
		t := append([]byte(nil), u...)
		for i := 1; i < iter; i++ {
			prf.Reset()
			prf.Write(u)
			u = prf.Sum(u[:0])
			for j := range t {
				t[j] ^= u[j]
			}
		}
		out = append(out, t...)
	}
	return out[:keyLen]
}

// HashPassword returns "pbkdf2-sha256$<iterations>$<base64 salt>$<base64 hash>".
func HashPassword(password string) string {
	salt := make([]byte, saltBytes)
	if _, err := rand.Read(salt); err != nil {
		panic("auth: no randomness available: " + err.Error())
	}
	return encodeHash(password, salt, passwordIterations)
}

func encodeHash(password string, salt []byte, iter int) string {
	key := pbkdf2Sha256([]byte(password), salt, iter, hashBytes)
	return fmt.Sprintf("%s$%d$%s$%s", pbkdf2Scheme, iter,
		base64.RawStdEncoding.EncodeToString(salt), base64.RawStdEncoding.EncodeToString(key))
}

// VerifyPassword reports whether password matches encoded. Any malformed input returns false.
func VerifyPassword(password, encoded string) bool {
	parts := strings.Split(encoded, "$")
	if len(parts) != 4 || parts[0] != pbkdf2Scheme {
		return false
	}
	iter, err := strconv.Atoi(parts[1])
	if err != nil || iter < 1 || iter > 10_000_000 {
		return false
	}
	salt, err := base64.RawStdEncoding.DecodeString(parts[2])
	if err != nil || len(salt) == 0 {
		return false
	}
	want, err := base64.RawStdEncoding.DecodeString(parts[3])
	if err != nil || len(want) == 0 {
		return false
	}
	got := pbkdf2Sha256([]byte(password), salt, iter, len(want))
	return subtle.ConstantTimeCompare(got, want) == 1
}

var (
	dummyOnce sync.Once
	dummyHash string
)

// DummyVerify does the same work as a real verification so that an unknown Beta ID takes as long
// as a known one.
func DummyVerify() {
	dummyOnce.Do(func() {
		dummyHash = encodeHash("dummy-password-for-timing", make([]byte, saltBytes), passwordIterations)
	})
	VerifyPassword("not-the-password", dummyHash)
}
