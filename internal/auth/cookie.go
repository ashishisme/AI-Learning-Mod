// SPEC: FR-014 (admin session and OIDC flow state as signed cookies)
package auth

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"strings"
	"time"
)

// Signer makes and checks HMAC-SHA256 signed values: base64url(json).base64url(mac).
type Signer struct{ secret []byte }

var ErrBadSignature = errors.New("invalid or expired signed value")

// NewSigner needs a secret of at least 32 bytes.
func NewSigner(secret string) (*Signer, error) {
	if len(secret) < 32 {
		return nil, errors.New("SESSION_SECRET must be at least 32 bytes")
	}
	return &Signer{secret: []byte(secret)}, nil
}

type envelope struct {
	Exp int64           `json:"exp"`
	V   json.RawMessage `json:"v"`
}

func (s *Signer) mac(payload string) []byte {
	m := hmac.New(sha256.New, s.secret)
	m.Write([]byte(payload))
	return m.Sum(nil)
}

// Sign encodes v with an expiry of now+ttl.
func (s *Signer) Sign(v any, ttl time.Duration) string {
	raw, err := json.Marshal(v)
	if err != nil {
		panic("auth: cannot encode signed value: " + err.Error())
	}
	body, _ := json.Marshal(envelope{Exp: time.Now().Add(ttl).Unix(), V: raw})
	p := base64.RawURLEncoding.EncodeToString(body)
	return p + "." + base64.RawURLEncoding.EncodeToString(s.mac(p))
}

// Verify checks the signature and expiry, then decodes the value into out.
func (s *Signer) Verify(signed string, out any) error {
	i := strings.IndexByte(signed, '.')
	if i < 0 {
		return ErrBadSignature
	}
	p := signed[:i]
	got, err := base64.RawURLEncoding.DecodeString(signed[i+1:])
	if err != nil || !hmac.Equal(got, s.mac(p)) {
		return ErrBadSignature
	}
	body, err := base64.RawURLEncoding.DecodeString(p)
	if err != nil {
		return ErrBadSignature
	}
	var env envelope
	if json.Unmarshal(body, &env) != nil || time.Now().Unix() >= env.Exp {
		return ErrBadSignature
	}
	if json.Unmarshal(env.V, out) != nil {
		return ErrBadSignature
	}
	return nil
}
