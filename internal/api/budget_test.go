// SPEC: FR-026
package api

import (
	"context"
	"crypto"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"ai-foundations-coach/internal/auth"
	"ai-foundations-coach/internal/spend"
	"ai-foundations-coach/internal/state"
)

const pushAccount = "budget-push@staging.iam.gserviceaccount.com"

// fakeGoogle publishes a key set and signs push tokens with it.
type fakeGoogle struct {
	*httptest.Server
	key *rsa.PrivateKey
}

func newFakeGoogle(t *testing.T) *fakeGoogle {
	t.Helper()
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatal(err)
	}
	f := &fakeGoogle{key: key}
	mux := http.NewServeMux()
	mux.HandleFunc("/.well-known/openid-configuration", func(w http.ResponseWriter, _ *http.Request) {
		_ = json.NewEncoder(w).Encode(map[string]string{"issuer": f.URL, "authorization_endpoint": f.URL + "/a", "token_endpoint": f.URL + "/t", "jwks_uri": f.URL + "/keys"})
	})
	mux.HandleFunc("/keys", func(w http.ResponseWriter, _ *http.Request) {
		_ = json.NewEncoder(w).Encode(map[string]any{"keys": []map[string]string{{"kty": "RSA", "kid": "k1", "alg": "RS256", "use": "sig",
			"n": base64.RawURLEncoding.EncodeToString(key.N.Bytes()),
			"e": base64.RawURLEncoding.EncodeToString(big.NewInt(int64(key.E)).Bytes())}}})
	})
	f.Server = httptest.NewServer(mux)
	t.Cleanup(f.Close)
	return f
}

func (f *fakeGoogle) token(t *testing.T, claims map[string]any) string {
	t.Helper()
	base := map[string]any{"iss": f.URL, "aud": "https://coach.example/push", "email": pushAccount, "email_verified": true,
		"exp": time.Now().Add(time.Hour).Unix()}
	for k, v := range claims {
		if v == nil {
			delete(base, k)
		} else {
			base[k] = v
		}
	}
	head, _ := json.Marshal(map[string]string{"alg": "RS256", "kid": "k1", "typ": "JWT"})
	body, _ := json.Marshal(base)
	signed := base64.RawURLEncoding.EncodeToString(head) + "." + base64.RawURLEncoding.EncodeToString(body)
	digest := sha256.Sum256([]byte(signed))
	sig, err := rsa.SignPKCS1v15(rand.Reader, f.key, crypto.SHA256, digest[:])
	if err != nil {
		t.Fatal(err)
	}
	return signed + "." + base64.RawURLEncoding.EncodeToString(sig)
}

func pushBody(threshold string) string {
	data := base64.StdEncoding.EncodeToString([]byte(fmt.Sprintf(`{"costAmount":100,"budgetAmount":100%s}`, threshold)))
	return `{"message":{"data":"` + data + `"}}`
}

func TestBudgetPush(t *testing.T) {
	google := newFakeGoogle(t)
	st, err := state.OpenFileStore(filepath.Join(t.TempDir(), "state.json"))
	if err != nil {
		t.Fatal(err)
	}
	defer st.Close()
	latch := spend.NewLatch(st, nil, 0)
	h := NewRouter(RouterConfig{ContentDir: t.TempDir(), TutorLatch: latch, BudgetPush: &BudgetPush{
		Verifier: auth.NewOIDC(auth.OIDCConfig{Issuer: google.URL}), Audience: "https://coach.example/push", ServiceAccount: pushAccount}})
	send := func(token, body string) int {
		r := httptest.NewRequest(http.MethodPost, budgetPushPath, strings.NewReader(body))
		if token != "" {
			r.Header.Set("Authorization", "Bearer "+token)
		}
		w := httptest.NewRecorder()
		h.ServeHTTP(w, r)
		return w.Code
	}
	off := func() bool {
		v, err := latch.Off(context.Background())
		if err != nil {
			t.Fatal(err)
		}
		return v
	}
	over := pushBody(`,"alertThresholdExceeded":1.0`)
	for name, token := range map[string]string{
		"no token":        "",
		"garbage":         "not.a.token",
		"wrong audience":  google.token(t, map[string]any{"aud": "https://other.example"}),
		"wrong account":   google.token(t, map[string]any{"email": "attacker@example.org"}),
		"email unproven":  google.token(t, map[string]any{"email_verified": false}),
		"email unclaimed": google.token(t, map[string]any{"email_verified": nil}),
		"expired":         google.token(t, map[string]any{"exp": time.Now().Add(-time.Hour).Unix()}),
		"wrong issuer":    google.token(t, map[string]any{"iss": "https://evil.example"}),
	} {
		if code := send(token, over); code != http.StatusUnauthorized {
			t.Errorf("%s: %d, want 401", name, code)
		}
		if off() {
			t.Fatalf("%s switched the tutor off", name)
		}
	}
	good := google.token(t, nil)
	if code := send(good, "{not json"); code != http.StatusBadRequest {
		t.Errorf("bad envelope: %d", code)
	}
	if code := send(good, pushBody(`,"alertThresholdExceeded":0.9`)); code != http.StatusNoContent || off() {
		t.Errorf("90%% must not switch it off: %d", code)
	}
	if code := send(good, pushBody("")); code != http.StatusNoContent || off() {
		t.Errorf("no threshold must not switch it off: %d", code)
	}
	if code := send(good, over); code != http.StatusNoContent || !off() {
		t.Errorf("100%% must switch it off: %d", code)
	}
	if code := send(good, over); code != http.StatusNoContent {
		t.Errorf("a repeated notification must succeed: %d", code)
	}
}

func TestBudgetPushDoesNotExistUnlessConfigured(t *testing.T) {
	h := NewRouter(RouterConfig{ContentDir: t.TempDir()})
	w := httptest.NewRecorder()
	h.ServeHTTP(w, httptest.NewRequest(http.MethodPost, budgetPushPath, strings.NewReader("{}")))
	if w.Code == http.StatusNoContent || w.Code == http.StatusUnauthorized {
		t.Errorf("an unconfigured server must not offer this route: %d", w.Code)
	}
}
