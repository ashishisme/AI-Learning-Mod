// SPEC: FR-002, FR-008, FR-009, FR-010, FR-014, FR-015, FR-016, FR-017
package api

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/cookiejar"
	"net/http/httptest"
	"net/url"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"ai-foundations-coach/internal/auth"
	"ai-foundations-coach/internal/auth/fakeidp"
	"ai-foundations-coach/internal/cost"
	"ai-foundations-coach/internal/feedback"
	"ai-foundations-coach/internal/spend"
	"ai-foundations-coach/internal/state"
	"ai-foundations-coach/internal/usage"
)

type adminEnv struct {
	app   *httptest.Server
	idp   *fakeidp.IDP
	svc   *auth.Service
	store state.Store
	jar   http.CookieJar
	http  *http.Client // follows redirects, keeps cookies
	usage *usage.Recorder
	fb    *feedback.Service
	audit *fakeAuditor
}

// fakeAuditor stands in for the AI auditor in HTTP tests.
type fakeAuditor struct {
	verdict feedback.Verdict
	err     error
	seen    []string
}

func (f *fakeAuditor) Review(_ context.Context, msg string) (feedback.Verdict, error) {
	f.seen = append(f.seen, msg)
	return f.verdict, f.err
}

const adminAddr = "owner@example.org"

func newAdminEnv(t *testing.T, allowlist []string, mutate ...func(*auth.Config)) *adminEnv {
	t.Helper()
	st, err := state.OpenFileStore(filepath.Join(t.TempDir(), "state.json"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { st.Close() })

	idp := fakeidp.New("", "dev", "secret", adminAddr)
	idpSrv := httptest.NewServer(idp.Handler())
	t.Cleanup(idpSrv.Close)
	idp.Issuer = idpSrv.URL

	app := httptest.NewUnstartedServer(nil)
	appURL := "http://" + app.Listener.Addr().String()
	acfg := auth.DefaultConfig(appURL)
	for _, m := range mutate {
		m(&acfg)
	}
	svc := auth.NewService(st, acfg)
	signer, _ := auth.NewSigner(strings.Repeat("k", 32))
	oidc := auth.NewOIDC(auth.OIDCConfig{Issuer: idpSrv.URL, ClientID: "dev", ClientSecret: "secret",
		RedirectURL: appURL + "/api/auth/admin/callback", AdminEmails: []string{adminAddr}})
	tally := spend.New(st, spend.Config{CeilingUSD: 1, InputPerMtokUSD: 0.15, OutputPerMtokUSD: 0.60})
	rec := usage.New(st)
	audit := &fakeAuditor{verdict: feedback.Verdict{Pass: true}}
	fb := feedback.NewService(st, audit)
	app.Config.Handler = NewRouter(RouterConfig{ContentDir: setupTestContent(t), Auth: svc, OIDC: oidc, Signer: signer,
		AdminEmails: allowlist, ModelClient: &mockModelClient{}, Spend: tally, Usage: rec, Cost: cost.NewProvider(tally, 30, nil),
		Feedback: fb, FeedbackEnabled: true})
	app.Start()
	t.Cleanup(app.Close)

	jar, _ := cookiejar.New(nil)
	return &adminEnv{app: app, idp: idp, svc: svc, store: st, jar: jar, http: &http.Client{Jar: jar, Timeout: 20 * time.Second},
		usage: rec, fb: fb, audit: audit}
}

// signIn runs the whole redirect dance and returns the final response.
func (e *adminEnv) signIn(t *testing.T) *http.Response {
	t.Helper()
	resp, err := e.http.Get(e.app.URL + "/api/auth/admin/login")
	if err != nil {
		t.Fatal(err)
	}
	resp.Body.Close()
	return resp
}

func (e *adminEnv) hasCookie(name string) bool {
	for _, c := range e.jar.Cookies(mustURL(e.app.URL + "/")) {
		if c.Name == name && c.Value != "" {
			return true
		}
	}
	return false
}

func (e *adminEnv) me(t *testing.T) (email, csrf string) {
	t.Helper()
	resp, body := e.do(t, "GET", "/api/admin/me", nil, nil)
	if resp.StatusCode != 200 {
		t.Fatalf("me: %d %s", resp.StatusCode, body)
	}
	var m map[string]string
	_ = json.Unmarshal([]byte(body), &m)
	return m["email"], m["csrfToken"]
}

func (e *adminEnv) do(t *testing.T, method, path string, body any, hdr map[string]string) (*http.Response, string) {
	t.Helper()
	var rd io.Reader
	if body != nil {
		raw, _ := json.Marshal(body)
		rd = bytes.NewReader(raw)
	}
	req, _ := http.NewRequest(method, e.app.URL+path, rd)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	for k, v := range hdr {
		req.Header.Set(k, v)
	}
	resp, err := e.http.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	b, _ := io.ReadAll(resp.Body)
	return resp, string(b)
}

// post sends a write with the CSRF token of the current admin session.
func (e *adminEnv) post(t *testing.T, path string, body any) (*http.Response, string) {
	t.Helper()
	_, csrf := e.me(t)
	if body == nil {
		body = map[string]any{}
	}
	return e.do(t, "POST", path, body, map[string]string{csrfHeader: csrf})
}

func TestAdminSignInFlowAndMe(t *testing.T) {
	e := newAdminEnv(t, []string{adminAddr})
	if resp, body := e.do(t, "GET", "/api/admin/me", nil, nil); resp.StatusCode != 401 || !strings.Contains(body, "admin_required") {
		t.Fatalf("before sign-in: %d %s", resp.StatusCode, body)
	}
	final := e.signIn(t)
	if final.Request.URL.Path != "/admin" || final.Request.URL.RawQuery != "" {
		t.Errorf("the flow should end on /admin without an error, got %s", final.Request.URL)
	}
	if !e.hasCookie(adminCookie) {
		t.Fatal("no admin cookie after sign-in")
	}
	if e.hasCookie(flowCookie) {
		t.Error("the one-time flow cookie must be cleared")
	}
	email, csrf := e.me(t)
	if email != adminAddr || len(csrf) < 20 {
		t.Errorf("me: %q %q", email, csrf)
	}
	for _, c := range e.jar.Cookies(mustURL(e.app.URL + "/")) {
		if c.Name == adminCookie && strings.Contains(c.Value, adminAddr) {
			t.Error("the admin email must not be readable in the cookie value")
		}
	}
}

func TestAdminSignInRefusals(t *testing.T) {
	e := newAdminEnv(t, []string{adminAddr})
	e.idp.Email = "stranger@example.org"
	final := e.signIn(t)
	if final.Request.URL.Query().Get("error") != "not_allowed" || strings.Contains(final.Request.URL.String(), "stranger") {
		t.Errorf("not on the list: %s", final.Request.URL)
	}
	if e.hasCookie(adminCookie) {
		t.Error("a refused sign-in must not set an admin cookie")
	}

	// A callback without the flow cookie, or with a forged state, is a state error.
	fresh := &http.Client{CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}
	resp, _ := fresh.Get(e.app.URL + "/api/auth/admin/callback?code=x&state=y")
	if loc := resp.Header.Get("Location"); resp.StatusCode != 302 || loc != "/admin?error=state" {
		t.Errorf("callback without a flow: %d %q", resp.StatusCode, loc)
	}
}

func TestAdminCookieTamperedOrRemovedFromAllowlistIsRefused(t *testing.T) {
	e := newAdminEnv(t, []string{adminAddr})
	e.signIn(t)
	u := mustURL(e.app.URL + "/")
	var good *http.Cookie
	for _, c := range e.jar.Cookies(u) {
		if c.Name == adminCookie {
			good = c
		}
	}
	jar2, _ := cookiejar.New(nil)
	jar2.SetCookies(u, []*http.Cookie{{Name: adminCookie, Value: "A" + good.Value[1:], Path: "/"}})
	resp, err := (&http.Client{Jar: jar2}).Get(e.app.URL + "/api/admin/me")
	if err != nil || resp.StatusCode != 401 {
		t.Errorf("tampered cookie: %v %v", resp, err)
	}

	// Signed in fine, but the allowlist no longer has the address: refused on the next request.
	gone := newAdminEnv(t, []string{"someone-else@example.org"})
	gone.signIn(t)
	if !gone.hasCookie(adminCookie) {
		t.Fatal("setup: the provider side still allows the sign-in")
	}
	if resp, _ := gone.do(t, "GET", "/api/admin/me", nil, nil); resp.StatusCode != 401 {
		t.Errorf("an address removed from ADMIN_EMAILS must lose access at once, got %d", resp.StatusCode)
	}
}

func TestAdminWritesNeedCSRFOriginAndJSON(t *testing.T) {
	e := newAdminEnv(t, []string{adminAddr})
	e.signIn(t)
	_, csrf := e.me(t)
	body := map[string]any{"count": 1}
	cases := map[string]struct {
		hdr  map[string]string
		want int
	}{
		"no token":         {nil, 403},
		"wrong token":      {map[string]string{csrfHeader: "nope"}, 403},
		"foreign origin":   {map[string]string{csrfHeader: csrf, "Origin": "https://evil.example"}, 403},
		"correct":          {map[string]string{csrfHeader: csrf}, 201},
		"same-site origin": {map[string]string{csrfHeader: csrf, "Origin": e.app.URL}, 201},
	}
	for name, c := range cases {
		if resp, b := e.do(t, "POST", "/api/admin/invites", body, c.hdr); resp.StatusCode != c.want {
			t.Errorf("%s: %d %s, want %d", name, resp.StatusCode, b, c.want)
		}
	}
	req, _ := http.NewRequest("POST", e.app.URL+"/api/admin/invites", strings.NewReader("count=1"))
	req.Header.Set(csrfHeader, csrf)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	if resp, _ := e.http.Do(req); resp.StatusCode != 415 {
		t.Errorf("form post: %d, want 415", resp.StatusCode)
	}
}

func TestLearnerSessionCannotUseAdminRoutes(t *testing.T) {
	e := newAdminEnv(t, []string{adminAddr})
	links, _ := e.svc.CreateInvites(context.Background(), adminAddr, 1, "")
	learner := &http.Client{}
	learner.Jar, _ = cookiejar.New(nil)
	raw, _ := json.Marshal(map[string]string{"token": links[0][strings.LastIndex(links[0], "/")+1:]})
	req, _ := http.NewRequest("POST", e.app.URL+"/api/auth/activate", bytes.NewReader(raw))
	req.Header.Set("Content-Type", "application/json")
	if resp, err := learner.Do(req); err != nil || resp.StatusCode != 200 {
		t.Fatalf("setup: %v %v", resp, err)
	}
	for _, p := range []string{"/api/admin/me", "/api/admin/dashboard", "/api/admin/accounts", "/api/admin/audit"} {
		resp, _ := learner.Get(e.app.URL + p)
		if resp.StatusCode != 401 {
			t.Errorf("%s as a learner: %d, want 401", p, resp.StatusCode)
		}
	}
}

func TestAdminInviteLifecycleOverHTTP(t *testing.T) {
	e := newAdminEnv(t, []string{adminAddr}, func(c *auth.Config) { c.SeatCap = 3 })
	e.signIn(t)

	resp, body := e.post(t, "/api/admin/invites", map[string]any{"count": 2, "label": "School A - Grade 7"})
	var made struct {
		Links []string `json:"links"`
	}
	_ = json.Unmarshal([]byte(body), &made)
	if resp.StatusCode != 201 || len(made.Links) != 2 || resp.Header.Get("Cache-Control") != "no-store" {
		t.Fatalf("create: %d %s %v", resp.StatusCode, body, resp.Header)
	}
	token := made.Links[0][strings.LastIndex(made.Links[0], "/")+1:]

	// The list never shows tokens or hashes.
	resp, body = e.do(t, "GET", "/api/admin/invites", nil, nil)
	if resp.StatusCode != 200 || strings.Contains(body, token) || strings.Contains(body, auth.HashToken(token)) || !strings.Contains(body, `"total":2`) {
		t.Errorf("list: %d %s", resp.StatusCode, body)
	}

	// Seats: 2 of 3 are used, so asking for 2 more must fail whole.
	resp, body = e.post(t, "/api/admin/invites", map[string]any{"count": 2})
	if resp.StatusCode != 409 || !strings.Contains(body, `"code":"seat_cap"`) || !strings.Contains(body, "Seat cap reached (3)") {
		t.Errorf("seat cap: %d %s", resp.StatusCode, body)
	}
	if resp, body = e.post(t, "/api/admin/invites", map[string]any{"count": 0}); resp.StatusCode != 400 {
		t.Errorf("zero invites: %d %s", resp.StatusCode, body)
	}

	// Revoke one pending invite, then the other is activated, then revoke that account.
	var list struct {
		Items []struct{ ID, Status string } `json:"items"`
	}
	_, body = e.do(t, "GET", "/api/admin/invites?status=pending", nil, nil)
	_ = json.Unmarshal([]byte(body), &list)
	if resp, _ := e.post(t, "/api/admin/invites/"+list.Items[0].ID+"/revoke", nil); resp.StatusCode != 204 {
		t.Errorf("revoke invite: %d", resp.StatusCode)
	}
	if resp, body := e.post(t, "/api/admin/invites/"+list.Items[0].ID+"/revoke", nil); resp.StatusCode != 409 {
		t.Errorf("revoking twice: %d %s", resp.StatusCode, body)
	}
	if resp, _ := e.post(t, "/api/admin/invites/nosuchid/revoke", nil); resp.StatusCode != 404 {
		t.Errorf("unknown invite: %d", resp.StatusCode)
	}

	act, err := e.svc.Activate(context.Background(), token)
	if err != nil {
		// The revoked one may have been the first link; use the other.
		act, err = e.svc.Activate(context.Background(), made.Links[1][strings.LastIndex(made.Links[1], "/")+1:])
		if err != nil {
			t.Fatal(err)
		}
	}
	_, body = e.do(t, "GET", "/api/admin/accounts?label=School%20A%20-%20Grade%207", nil, nil)
	if !strings.Contains(body, act.BetaID) || strings.Contains(body, act.Password) || strings.Contains(body, "pbkdf2") {
		t.Errorf("accounts: %s", body)
	}

	resp, body = e.post(t, "/api/admin/accounts/"+act.BetaID+"/reissue", nil)
	if resp.StatusCode != 200 || !strings.Contains(body, `"password"`) || resp.Header.Get("Cache-Control") != "no-store" {
		t.Errorf("reissue: %d %s", resp.StatusCode, body)
	}
	if resp, _ := e.post(t, "/api/admin/accounts/"+act.BetaID+"/revoke", nil); resp.StatusCode != 204 {
		t.Errorf("revoke account: %d", resp.StatusCode)
	}
	if resp, _ := e.post(t, "/api/admin/accounts/"+act.BetaID+"/reissue", nil); resp.StatusCode != 409 {
		t.Errorf("reissue after revoke: %d", resp.StatusCode)
	}
	if resp, _ := e.post(t, "/api/admin/accounts/BETA-ZZZZ-ZZZZ/revoke", nil); resp.StatusCode != 404 {
		t.Errorf("unknown account: %d", resp.StatusCode)
	}

	_, body = e.do(t, "GET", "/api/admin/dashboard", nil, nil)
	if !strings.Contains(body, `"seatCap":3`) || !strings.Contains(body, `"revoked":1`) {
		t.Errorf("dashboard: %s", body)
	}
	_, body = e.do(t, "GET", "/api/admin/audit?limit=50", nil, nil)
	for _, want := range []string{"invite.create", "invite.revoke", "account.reissue", "account.revoke"} {
		if !strings.Contains(body, want) {
			t.Errorf("audit lacks %s: %s", want, body)
		}
	}
	if strings.Contains(body, token) {
		t.Error("the audit trail must not contain an invite token")
	}
}

func TestAccountsCSVOverHTTP(t *testing.T) {
	e := newAdminEnv(t, []string{adminAddr})
	e.signIn(t)
	links, _ := e.svc.CreateInvites(context.Background(), adminAddr, 1, "Class")
	act, _ := e.svc.Activate(context.Background(), links[0][strings.LastIndex(links[0], "/")+1:])
	resp, body := e.do(t, "GET", "/api/admin/accounts.csv", nil, nil)
	if resp.StatusCode != 200 || !strings.HasPrefix(resp.Header.Get("Content-Type"), "text/csv") ||
		!strings.Contains(resp.Header.Get("Content-Disposition"), "attachment") {
		t.Fatalf("headers: %d %v", resp.StatusCode, resp.Header)
	}
	if !strings.Contains(body, act.BetaID) || strings.Contains(body, act.Password) {
		t.Errorf("csv: %s", body)
	}
	if resp, _ := e.do(t, "GET", "/api/admin/accounts?status=bogus", nil, nil); resp.StatusCode != 400 {
		t.Errorf("bad status filter: %d", resp.StatusCode)
	}
}

func TestAdminLogout(t *testing.T) {
	e := newAdminEnv(t, []string{adminAddr})
	e.signIn(t)
	if resp, _ := e.post(t, "/api/auth/admin/logout", nil); resp.StatusCode != 204 {
		t.Errorf("logout: %d", resp.StatusCode)
	}
	if resp, _ := e.do(t, "GET", "/api/admin/me", nil, nil); resp.StatusCode != 401 {
		t.Errorf("after logout: %d", resp.StatusCode)
	}
}

func mustURL(s string) *urlT { u, _ := parseURL(s); return u }

type urlT = url.URL

func parseURL(s string) (*url.URL, error) { return url.Parse(s) }
