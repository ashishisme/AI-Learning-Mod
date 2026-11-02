// SPEC: FR-014 (admin sign-in with organisation identity; MFA is enforced by the provider)
package auth

import (
	"context"
	"crypto"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math/big"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"
)

var (
	ErrOIDCState      = errors.New("oidc: state mismatch")
	ErrOIDCToken      = errors.New("oidc: token exchange or verification failed")
	ErrOIDCNotAllowed = errors.New("oidc: account is not an admin")
	ErrOIDCMFA        = errors.New("oidc: multi-factor sign-in required")
)

type OIDCConfig struct {
	Issuer       string
	ClientID     string
	ClientSecret string
	RedirectURL  string
	RequireMFA   bool
	AdminEmails  []string // lower case
	HTTPClient   *http.Client
}

// OIDC runs the authorization-code flow with PKCE and verifies the ID token with only the
// standard library. Only RS256 is accepted.
type OIDC struct {
	cfg    OIDCConfig
	admins map[string]bool
	client *http.Client

	mu       sync.Mutex
	disco    *discovery
	discoAt  time.Time
	keys     map[string]*rsa.PublicKey
	keysAt   time.Time
	clockNow func() time.Time
}

type discovery struct {
	Issuer        string `json:"issuer"`
	AuthEndpoint  string `json:"authorization_endpoint"`
	TokenEndpoint string `json:"token_endpoint"`
	JWKSURI       string `json:"jwks_uri"`
}

// FlowState is what the app must remember between sending the browser to the provider and the
// callback. The handler keeps it in a short-lived signed cookie.
type FlowState struct {
	State    string `json:"s"`
	Nonce    string `json:"n"`
	Verifier string `json:"v"`
}

func NewOIDC(cfg OIDCConfig) *OIDC {
	c := cfg.HTTPClient
	if c == nil {
		c = &http.Client{Timeout: 15 * time.Second}
	}
	admins := map[string]bool{}
	for _, e := range cfg.AdminEmails {
		admins[strings.ToLower(strings.TrimSpace(e))] = true
	}
	cfg.Issuer = strings.TrimRight(cfg.Issuer, "/")
	return &OIDC{cfg: cfg, admins: admins, client: c, clockNow: time.Now}
}

// IsAdmin reports whether email is on the allowlist.
func (o *OIDC) IsAdmin(email string) bool { return o.admins[strings.ToLower(strings.TrimSpace(email))] }

func (o *OIDC) getJSON(ctx context.Context, u string, out any) error {
	req, _ := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
	resp, err := o.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("GET %s: status %d", u, resp.StatusCode)
	}
	return json.NewDecoder(io.LimitReader(resp.Body, 1<<20)).Decode(out)
}

func (o *OIDC) discovery(ctx context.Context) (*discovery, error) {
	o.mu.Lock()
	defer o.mu.Unlock()
	if o.disco != nil && o.clockNow().Sub(o.discoAt) < time.Hour {
		return o.disco, nil
	}
	var d discovery
	if err := o.getJSON(ctx, o.cfg.Issuer+"/.well-known/openid-configuration", &d); err != nil {
		return nil, err
	}
	if strings.TrimRight(d.Issuer, "/") != o.cfg.Issuer || d.AuthEndpoint == "" || d.TokenEndpoint == "" || d.JWKSURI == "" {
		return nil, errors.New("oidc: discovery document does not match the configured issuer")
	}
	o.disco, o.discoAt = &d, o.clockNow()
	return o.disco, nil
}

func randURLToken(n int) string { return base64.RawURLEncoding.EncodeToString(randBytes(n)) }

// Begin returns the provider URL to send the browser to, and the state to remember.
func (o *OIDC) Begin(ctx context.Context) (string, FlowState, error) {
	d, err := o.discovery(ctx)
	if err != nil {
		return "", FlowState{}, err
	}
	fs := FlowState{State: randURLToken(24), Nonce: randURLToken(24), Verifier: randURLToken(32)}
	sum := sha256.Sum256([]byte(fs.Verifier))
	u, err := url.Parse(d.AuthEndpoint)
	if err != nil {
		return "", FlowState{}, err
	}
	q := u.Query()
	q.Set("response_type", "code")
	q.Set("client_id", o.cfg.ClientID)
	q.Set("redirect_uri", o.cfg.RedirectURL)
	q.Set("scope", "openid email")
	q.Set("state", fs.State)
	q.Set("nonce", fs.Nonce)
	q.Set("code_challenge", base64.RawURLEncoding.EncodeToString(sum[:]))
	q.Set("code_challenge_method", "S256")
	u.RawQuery = q.Encode()
	return u.String(), fs, nil
}

// Finish completes the flow and returns the verified admin email.
func (o *OIDC) Finish(ctx context.Context, fs FlowState, code, state string) (string, error) {
	if fs.State == "" || subtle.ConstantTimeCompare([]byte(fs.State), []byte(state)) != 1 {
		return "", ErrOIDCState
	}
	if code == "" {
		return "", ErrOIDCToken
	}
	d, err := o.discovery(ctx)
	if err != nil {
		return "", ErrOIDCToken
	}
	form := url.Values{
		"grant_type": {"authorization_code"}, "code": {code}, "redirect_uri": {o.cfg.RedirectURL},
		"client_id": {o.cfg.ClientID}, "client_secret": {o.cfg.ClientSecret}, "code_verifier": {fs.Verifier},
	}
	req, _ := http.NewRequestWithContext(ctx, http.MethodPost, d.TokenEndpoint, strings.NewReader(form.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	resp, err := o.client.Do(req)
	if err != nil {
		return "", ErrOIDCToken
	}
	defer resp.Body.Close()
	var tok struct {
		IDToken string `json:"id_token"`
	}
	if resp.StatusCode != http.StatusOK || json.NewDecoder(io.LimitReader(resp.Body, 1<<20)).Decode(&tok) != nil || tok.IDToken == "" {
		return "", ErrOIDCToken
	}
	return o.verifyIDToken(ctx, tok.IDToken, fs.Nonce)
}

func b64Decode(s string) ([]byte, error) {
	return base64.RawURLEncoding.DecodeString(strings.TrimRight(s, "="))
}

type idClaims struct {
	Iss           string          `json:"iss"`
	Aud           json.RawMessage `json:"aud"`
	Azp           string          `json:"azp"`
	Exp           int64           `json:"exp"`
	Iat           int64           `json:"iat"`
	Nbf           int64           `json:"nbf"`
	Nonce         string          `json:"nonce"`
	Email         string          `json:"email"`
	EmailVerified json.RawMessage `json:"email_verified"`
	AMR           []string        `json:"amr"`
}

func (c idClaims) audiences() []string {
	var one string
	if json.Unmarshal(c.Aud, &one) == nil {
		return []string{one}
	}
	var many []string
	_ = json.Unmarshal(c.Aud, &many)
	return many
}

// signedClaims checks the signature and returns the claims. Nothing in them is trusted before this.
func (o *OIDC) signedClaims(ctx context.Context, raw string) (idClaims, error) {
	var c idClaims
	parts := strings.Split(raw, ".")
	if len(parts) != 3 {
		return c, ErrOIDCToken
	}
	hb, err1 := b64Decode(parts[0])
	cb, err2 := b64Decode(parts[1])
	sig, err3 := b64Decode(parts[2])
	if err1 != nil || err2 != nil || err3 != nil {
		return c, ErrOIDCToken
	}
	var h struct {
		Alg string `json:"alg"`
		KID string `json:"kid"`
	}
	// Only RS256 with a key id is accepted: never "none", never an HMAC "signed" with a public key.
	if json.Unmarshal(hb, &h) != nil || h.Alg != "RS256" || h.KID == "" {
		return c, ErrOIDCToken
	}
	key, err := o.keyFor(ctx, h.KID)
	if err != nil {
		return c, ErrOIDCToken
	}
	digest := sha256.Sum256([]byte(parts[0] + "." + parts[1]))
	if rsa.VerifyPKCS1v15(key, crypto.SHA256, digest[:], sig) != nil {
		return c, ErrOIDCToken
	}
	if json.Unmarshal(cb, &c) != nil {
		return c, ErrOIDCToken
	}
	return c, nil
}

// VerifyPushToken checks the token Pub/Sub attaches to a push request: signed by the provider, for
// this audience, unexpired, and from the expected service account with a verified email.
func (o *OIDC) VerifyPushToken(ctx context.Context, raw, audience, email string) error {
	c, err := o.signedClaims(ctx, raw)
	if err != nil {
		return err
	}
	now := o.clockNow()
	audOK := false
	for _, a := range c.audiences() {
		audOK = audOK || a == audience
	}
	iss := strings.TrimRight(c.Iss, "/")
	switch {
	case iss != o.cfg.Issuer && "https://"+iss != o.cfg.Issuer, // Google may omit the scheme
		!audOK,
		c.Exp == 0 || !now.Before(time.Unix(c.Exp, 0)),
		!strings.EqualFold(c.Email, email),
		strings.Trim(string(c.EmailVerified), `"`) != "true":
		return ErrOIDCToken
	}
	return nil
}

func (o *OIDC) verifyIDToken(ctx context.Context, raw, nonce string) (string, error) {
	c, err := o.signedClaims(ctx, raw)
	if err != nil {
		return "", err
	}
	now := o.clockNow()
	auds := c.audiences()
	audOK := false
	for _, a := range auds {
		if a == o.cfg.ClientID {
			audOK = true
		}
	}
	switch {
	case strings.TrimRight(c.Iss, "/") != o.cfg.Issuer,
		!audOK,
		len(auds) > 1 && c.Azp != o.cfg.ClientID,
		c.Exp == 0 || !now.Before(time.Unix(c.Exp, 0)),
		c.Iat != 0 && time.Unix(c.Iat, 0).After(now.Add(2*time.Minute)),
		c.Nbf != 0 && time.Unix(c.Nbf, 0).After(now.Add(2*time.Minute)),
		nonce == "" || subtle.ConstantTimeCompare([]byte(c.Nonce), []byte(nonce)) != 1,
		c.Email == "":
		return "", ErrOIDCToken
	}
	if s := strings.Trim(string(c.EmailVerified), `"`); s == "false" {
		return "", ErrOIDCToken
	}
	email := strings.ToLower(strings.TrimSpace(c.Email))
	if !o.admins[email] {
		return "", ErrOIDCNotAllowed
	}
	if o.cfg.RequireMFA {
		mfa := false
		for _, m := range c.AMR {
			if m == "mfa" {
				mfa = true
			}
		}
		if !mfa {
			return "", ErrOIDCMFA
		}
	}
	return email, nil
}

// keyFor returns the signing key for kid, refetching the key set once when it is unknown.
func (o *OIDC) keyFor(ctx context.Context, kid string) (*rsa.PublicKey, error) {
	o.mu.Lock()
	k, ok := o.keys[kid]
	fresh := o.clockNow().Sub(o.keysAt) < time.Minute
	o.mu.Unlock()
	if ok {
		return k, nil
	}
	if fresh && o.keys != nil {
		return nil, errors.New("oidc: unknown key id")
	}
	d, err := o.discovery(ctx)
	if err != nil {
		return nil, err
	}
	var set struct {
		Keys []struct {
			Kty, Kid, N, E string
		} `json:"keys"`
	}
	if err := o.getJSON(ctx, d.JWKSURI, &set); err != nil {
		return nil, err
	}
	keys := map[string]*rsa.PublicKey{}
	for _, jk := range set.Keys {
		if !strings.EqualFold(jk.Kty, "RSA") {
			continue
		}
		nb, err1 := b64Decode(jk.N)
		eb, err2 := b64Decode(jk.E)
		if err1 != nil || err2 != nil || len(nb) == 0 || len(eb) == 0 || len(eb) > 4 {
			continue
		}
		e := int(new(big.Int).SetBytes(eb).Int64())
		keys[jk.Kid] = &rsa.PublicKey{N: new(big.Int).SetBytes(nb), E: e}
	}
	o.mu.Lock()
	o.keys, o.keysAt = keys, o.clockNow()
	k, ok = keys[kid]
	o.mu.Unlock()
	if !ok {
		return nil, errors.New("oidc: unknown key id")
	}
	return k, nil
}
