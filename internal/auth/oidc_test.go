// SPEC: FR-014
package auth

import (
	"context"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"

	"ai-foundations-coach/internal/auth/fakeidp"
)

const redirectURL = "https://coach.example.org/api/auth/admin/callback"

type oidcEnv struct {
	idp *fakeidp.IDP
	srv *httptest.Server
	o   *OIDC
}

func newOIDCEnv(t *testing.T, mutate ...func(*OIDCConfig)) *oidcEnv {
	t.Helper()
	idp := fakeidp.New("", "dev", "secret", "admin@example.org")
	srv := httptest.NewServer(idp.Handler())
	t.Cleanup(srv.Close)
	idp.Issuer = srv.URL
	cfg := OIDCConfig{Issuer: srv.URL, ClientID: "dev", ClientSecret: "secret", RedirectURL: redirectURL, AdminEmails: []string{"admin@example.org"}}
	for _, m := range mutate {
		m(&cfg)
	}
	return &oidcEnv{idp: idp, srv: srv, o: NewOIDC(cfg)}
}

// authorize plays the browser: it follows the provider's redirect by hand and returns code and state.
func (e *oidcEnv) authorize(t *testing.T, authURL string) (code, state string) {
	t.Helper()
	c := &http.Client{CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}
	resp, err := c.Get(authURL)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusFound {
		t.Fatalf("authorize: status %d", resp.StatusCode)
	}
	loc, err := url.Parse(resp.Header.Get("Location"))
	if err != nil || loc.Scheme+"://"+loc.Host+loc.Path != redirectURL {
		t.Fatalf("redirect: %v %v", loc, err)
	}
	return loc.Query().Get("code"), loc.Query().Get("state")
}

func (e *oidcEnv) run(t *testing.T, mutateFlow func(*FlowState)) (string, error) {
	t.Helper()
	authURL, flow, err := e.o.Begin(context.Background())
	if err != nil {
		return "", err
	}
	code, state := e.authorize(t, authURL)
	if mutateFlow != nil {
		mutateFlow(&flow)
	}
	return e.o.Finish(context.Background(), flow, code, state)
}

func TestOIDCHappyPathUsesPKCEStateAndNonce(t *testing.T) {
	e := newOIDCEnv(t)
	authURL, flow, err := e.o.Begin(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	u, _ := url.Parse(authURL)
	q := u.Query()
	if q.Get("response_type") != "code" || q.Get("code_challenge_method") != "S256" || q.Get("client_id") != "dev" ||
		q.Get("redirect_uri") != redirectURL || q.Get("scope") != "openid email" ||
		q.Get("state") != flow.State || q.Get("nonce") != flow.Nonce || q.Get("code_challenge") == "" {
		t.Fatalf("authorization request: %v", q)
	}
	if q.Get("code_challenge") == flow.Verifier {
		t.Error("the challenge must be a hash of the verifier, not the verifier")
	}
	code, state := e.authorize(t, authURL)
	email, err := e.o.Finish(context.Background(), flow, code, state)
	if err != nil || email != "admin@example.org" {
		t.Fatalf("finish: %q %v", email, err)
	}
}

func TestOIDCRejectsEveryBadToken(t *testing.T) {
	bad := map[string]func(*fakeidp.IDP){
		"wrong issuer":              func(p *fakeidp.IDP) { p.Tamper.Issuer = "https://evil.example" },
		"wrong audience":            func(p *fakeidp.IDP) { p.Tamper.Audience = "someone-else" },
		"audience list without azp": func(p *fakeidp.IDP) { p.Tamper.ExtraAud = true },
		"expired":                   func(p *fakeidp.IDP) { p.Tamper.Expired = true },
		"issued in the future":      func(p *fakeidp.IDP) { p.Tamper.FutureIssue = true },
		"wrong nonce":               func(p *fakeidp.IDP) { p.Tamper.Nonce = "not-the-nonce" },
		"alg none":                  func(p *fakeidp.IDP) { p.Tamper.Alg = "none" },
		"alg HS256":                 func(p *fakeidp.IDP) { p.Tamper.Alg = "HS256" },
		// Valid RS256 signature under a different algorithm label: only the algorithm pin stops this.
		"alg label RS512 on an RS256 signature": func(p *fakeidp.IDP) { p.Tamper.Alg = "RS512" },
		"unknown key id":                        func(p *fakeidp.IDP) { p.Tamper.KID = "other-key" },
		"signed by another key":                 func(p *fakeidp.IDP) { p.Tamper.OtherKey = true },
		"no email":                              func(p *fakeidp.IDP) { p.Tamper.OmitEmail = true },
		"email not verified":                    func(p *fakeidp.IDP) { p.EmailUnverified = true },
	}
	for name, tamper := range bad {
		e := newOIDCEnv(t)
		tamper(e.idp)
		if email, err := e.run(t, nil); err != ErrOIDCToken || email != "" {
			t.Errorf("%s: email %q, err %v; want ErrOIDCToken", name, email, err)
		}
	}
}

func TestOIDCAllowlistIsCaseInsensitiveAndEnforced(t *testing.T) {
	e := newOIDCEnv(t)
	e.idp.Email = "ADMIN@Example.org"
	if email, err := e.run(t, nil); err != nil || email != "admin@example.org" {
		t.Errorf("case-insensitive match: %q %v", email, err)
	}
	e.idp.Email = "stranger@example.org"
	if _, err := e.run(t, nil); err != ErrOIDCNotAllowed {
		t.Errorf("stranger: %v, want ErrOIDCNotAllowed", err)
	}
}

func TestOIDCRequireMFA(t *testing.T) {
	e := newOIDCEnv(t, func(c *OIDCConfig) { c.RequireMFA = true })
	if _, err := e.run(t, nil); err != ErrOIDCMFA {
		t.Errorf("no amr claim: %v, want ErrOIDCMFA", err)
	}
	e.idp.AMR = []string{"pwd"}
	if _, err := e.run(t, nil); err != ErrOIDCMFA {
		t.Errorf("password only: %v, want ErrOIDCMFA", err)
	}
	e.idp.AMR = []string{"pwd", "mfa"}
	if email, err := e.run(t, nil); err != nil || email == "" {
		t.Errorf("with mfa: %q %v", email, err)
	}
}

func TestOIDCFlowAttacks(t *testing.T) {
	e := newOIDCEnv(t)
	if _, err := e.run(t, func(f *FlowState) { f.State = "forged" }); err != ErrOIDCState {
		t.Errorf("state mismatch: %v", err)
	}
	if _, err := e.run(t, func(f *FlowState) { f.State = "" }); err != ErrOIDCState {
		t.Errorf("empty state: %v", err)
	}
	if _, err := e.run(t, func(f *FlowState) { f.Verifier = "wrong-verifier" }); err != ErrOIDCToken {
		t.Errorf("wrong PKCE verifier: %v", err)
	}

	// A code works once.
	authURL, flow, _ := e.o.Begin(context.Background())
	code, state := e.authorize(t, authURL)
	if _, err := e.o.Finish(context.Background(), flow, code, state); err != nil {
		t.Fatal(err)
	}
	if _, err := e.o.Finish(context.Background(), flow, code, state); err != ErrOIDCToken {
		t.Errorf("code reuse: %v", err)
	}
	if _, err := e.o.Finish(context.Background(), flow, "", state); err != ErrOIDCToken {
		t.Errorf("empty code: %v", err)
	}

	wrongSecret := newOIDCEnv(t, func(c *OIDCConfig) { c.ClientSecret = "nope" })
	if _, err := wrongSecret.run(t, nil); err != ErrOIDCToken {
		t.Errorf("wrong client secret: %v", err)
	}
}

func TestOIDCDiscoveryIsCachedAndChecked(t *testing.T) {
	e := newOIDCEnv(t)
	for i := 0; i < 3; i++ {
		if _, _, err := e.o.Begin(context.Background()); err != nil {
			t.Fatal(err)
		}
	}
	if e.idp.DiscoHits != 1 {
		t.Errorf("discovery fetched %d times, want 1 (cached for an hour)", e.idp.DiscoHits)
	}

	mismatch := newOIDCEnv(t)
	mismatch.idp.Issuer = "https://someone-else.example"
	if _, _, err := mismatch.o.Begin(context.Background()); err == nil {
		t.Error("a discovery document for a different issuer must be refused")
	}
}

func TestOIDCIsAdmin(t *testing.T) {
	o := NewOIDC(OIDCConfig{AdminEmails: []string{"A@x.org"}})
	if !o.IsAdmin(" a@X.org ") || o.IsAdmin("b@x.org") || o.IsAdmin("") {
		t.Error("IsAdmin must trim, ignore case and refuse everyone else")
	}
}
