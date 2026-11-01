// SPEC: FR-014
// Package fakeidp is a small OpenID Connect provider for tests and local development
// (cmd/devidp). It is never part of the production binary.
package fakeidp

import (
	"crypto"
	"crypto/hmac"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"net/url"
	"sync"
	"time"
)

// Tamper switches let tests produce each kind of bad ID token.
type Tamper struct {
	Issuer      string // override the iss claim
	Audience    string // override the aud claim
	Nonce       string // override the nonce claim
	Expired     bool
	Alg         string // "none" or "HS256" instead of RS256
	KID         string // override the kid header
	OtherKey    bool   // sign with a key that is not in the JWKS
	OmitEmail   bool
	ExtraAud    bool // aud becomes a two-element list without a matching azp
	FutureIssue bool // iat far in the future
}

// IDP is the provider. Set the exported fields before the first request.
type IDP struct {
	Issuer       string
	ClientID     string
	ClientSecret string
	Email        string
	// EmailVerified is true unless a test sets it false.
	EmailUnverified bool
	AMR             []string

	mu        sync.Mutex
	Tamper    Tamper
	key       *rsa.PrivateKey
	otherKey  *rsa.PrivateKey
	kid       string
	codes     map[string]codeInfo
	DiscoHits int
}

type codeInfo struct {
	nonce, challenge, redirect string
}

func New(issuer, clientID, clientSecret, email string) *IDP {
	k, _ := rsa.GenerateKey(rand.Reader, 2048)
	o, _ := rsa.GenerateKey(rand.Reader, 2048)
	return &IDP{Issuer: issuer, ClientID: clientID, ClientSecret: clientSecret, Email: email,
		key: k, otherKey: o, kid: "test-key-1", codes: map[string]codeInfo{}}
}

func (p *IDP) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/.well-known/openid-configuration", p.discovery)
	mux.HandleFunc("/authorize", p.authorize)
	mux.HandleFunc("/token", p.token)
	mux.HandleFunc("/jwks", p.jwks)
	return mux
}

func (p *IDP) discovery(w http.ResponseWriter, _ *http.Request) {
	p.mu.Lock()
	p.DiscoHits++
	issuer := p.Issuer
	p.mu.Unlock()
	writeJSON(w, map[string]string{
		"issuer": issuer, "authorization_endpoint": issuer + "/authorize",
		"token_endpoint": issuer + "/token", "jwks_uri": issuer + "/jwks",
	})
}

// authorize approves every request at once and redirects back with a one-time code.
func (p *IDP) authorize(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	if q.Get("client_id") != p.ClientID || q.Get("response_type") != "code" || q.Get("code_challenge_method") != "S256" ||
		q.Get("code_challenge") == "" || q.Get("state") == "" || q.Get("nonce") == "" {
		http.Error(w, "bad authorization request", http.StatusBadRequest)
		return
	}
	code := randomString(16)
	p.mu.Lock()
	p.codes[code] = codeInfo{nonce: q.Get("nonce"), challenge: q.Get("code_challenge"), redirect: q.Get("redirect_uri")}
	p.mu.Unlock()
	u, err := url.Parse(q.Get("redirect_uri"))
	if err != nil {
		http.Error(w, "bad redirect_uri", http.StatusBadRequest)
		return
	}
	v := u.Query()
	v.Set("code", code)
	v.Set("state", q.Get("state"))
	u.RawQuery = v.Encode()
	http.Redirect(w, r, u.String(), http.StatusFound)
}

func (p *IDP) token(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		http.Error(w, "bad form", http.StatusBadRequest)
		return
	}
	p.mu.Lock()
	defer p.mu.Unlock()
	info, ok := p.codes[r.PostForm.Get("code")]
	delete(p.codes, r.PostForm.Get("code")) // single use
	sum := sha256.Sum256([]byte(r.PostForm.Get("code_verifier")))
	if !ok || r.PostForm.Get("client_id") != p.ClientID || r.PostForm.Get("client_secret") != p.ClientSecret ||
		r.PostForm.Get("grant_type") != "authorization_code" || r.PostForm.Get("redirect_uri") != info.redirect ||
		base64.RawURLEncoding.EncodeToString(sum[:]) != info.challenge {
		w.WriteHeader(http.StatusBadRequest)
		writeJSON(w, map[string]string{"error": "invalid_grant"})
		return
	}
	writeJSON(w, map[string]any{"access_token": "unused", "token_type": "Bearer", "id_token": p.idToken(info.nonce)})
}

func (p *IDP) jwks(w http.ResponseWriter, _ *http.Request) {
	pub := p.key.PublicKey
	writeJSON(w, map[string]any{"keys": []map[string]string{{
		"kty": "RSA", "use": "sig", "alg": "RS256", "kid": p.kid,
		"n": b64(pub.N.Bytes()), "e": b64(big.NewInt(int64(pub.E)).Bytes()),
	}}})
}

func (p *IDP) idToken(nonce string) string {
	t := p.Tamper
	now := time.Now()
	aud := any(p.ClientID)
	if t.Audience != "" {
		aud = t.Audience
	}
	if t.ExtraAud {
		aud = []string{p.ClientID, "another-client"}
	}
	iss := p.Issuer
	if t.Issuer != "" {
		iss = t.Issuer
	}
	if t.Nonce != "" {
		nonce = t.Nonce
	}
	exp, iat := now.Add(5*time.Minute), now
	if t.Expired {
		exp, iat = now.Add(-time.Minute), now.Add(-10*time.Minute)
	}
	if t.FutureIssue {
		iat = now.Add(time.Hour)
	}
	claims := map[string]any{"iss": iss, "aud": aud, "sub": "user-1", "nonce": nonce, "exp": exp.Unix(), "iat": iat.Unix(), "email_verified": !p.EmailUnverified}
	if !t.OmitEmail {
		claims["email"] = p.Email
	}
	if len(p.AMR) > 0 {
		claims["amr"] = p.AMR
	}
	alg, kid := "RS256", p.kid
	if t.Alg != "" {
		alg = t.Alg
	}
	if t.KID != "" {
		kid = t.KID
	}
	header := map[string]string{"alg": alg, "typ": "JWT", "kid": kid}
	hb, _ := json.Marshal(header)
	cb, _ := json.Marshal(claims)
	input := b64(hb) + "." + b64(cb)
	switch alg {
	case "none":
		return input + "."
	case "HS256":
		m := hmac.New(sha256.New, p.key.PublicKey.N.Bytes())
		m.Write([]byte(input))
		return input + "." + b64(m.Sum(nil))
	}
	signer := p.key
	if t.OtherKey {
		signer = p.otherKey
	}
	h := sha256.Sum256([]byte(input))
	sig, err := rsa.SignPKCS1v15(rand.Reader, signer, crypto.SHA256, h[:])
	if err != nil {
		panic(err)
	}
	return input + "." + b64(sig)
}

func b64(b []byte) string { return base64.RawURLEncoding.EncodeToString(b) }

func randomString(n int) string {
	b := make([]byte, n)
	_, _ = rand.Read(b)
	return b64(b)
}

func writeJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(v)
}

// String is handy in logs.
func (p *IDP) String() string {
	return fmt.Sprintf("fake OIDC provider %s (client %s, user %s)", p.Issuer, p.ClientID, p.Email)
}
