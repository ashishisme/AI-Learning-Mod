// SPEC: FR-026, FR-031, NFR-SEC-08
package api

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"

	"ai-foundations-coach/internal/spend"
	"ai-foundations-coach/internal/state"
)

func TestTutorRefusesWhenTheLatchIsOffOrUnreadable(t *testing.T) {
	st, err := state.OpenFileStore(filepath.Join(t.TempDir(), "state.json"))
	if err != nil {
		t.Fatal(err)
	}
	latch := spend.NewLatch(st, nil, 0)
	h := NewRouter(RouterConfig{ContentDir: setupTestContent(t), ModelClient: &mockModelClient{}, TutorLatch: latch})
	ask := func() int {
		w := httptest.NewRecorder()
		h.ServeHTTP(w, httptest.NewRequest(http.MethodPost, "/api/tutor", strings.NewReader(`{"lessonId":"lesson-1","question":"What is AI?"}`)))
		return w.Code
	}
	if code := ask(); code == http.StatusServiceUnavailable {
		t.Fatalf("the tutor must run while the latch is on: %d", code)
	}
	if err := latch.Trip(context.Background(), "test"); err != nil {
		t.Fatal(err)
	}
	if code := ask(); code != http.StatusServiceUnavailable {
		t.Errorf("latched: %d, want 503", code)
	}
	if err := latch.Reset(context.Background(), "owner@example.org"); err != nil {
		t.Fatal(err)
	}
	if code := ask(); code == http.StatusServiceUnavailable {
		t.Errorf("after a reset the tutor must run: %d", code)
	}
	defer st.Close()
	broken := NewRouter(RouterConfig{ContentDir: setupTestContent(t), ModelClient: &mockModelClient{}, TutorLatch: spend.NewLatch(unreadable{st}, nil, 0)})
	w := httptest.NewRecorder()
	broken.ServeHTTP(w, httptest.NewRequest(http.MethodPost, "/api/tutor", strings.NewReader(`{"lessonId":"lesson-1","question":"What is AI?"}`)))
	if w.Code != http.StatusServiceUnavailable {
		t.Errorf("unknown state must refuse: %d", w.Code)
	}
}

type unreadable struct{ state.Store }

func (unreadable) View(context.Context, func(state.Tx) error) error { return errors.New("store down") }

func TestAdminResetsTheTutorSwitchAndItIsAudited(t *testing.T) {
	e := newAdminEnv(t, []string{adminAddr})
	e.signIn(t)
	latch := spend.NewLatch(e.store, nil, 0)
	ctx := context.Background()
	if err := latch.Trip(ctx, "test"); err != nil {
		t.Fatal(err)
	}
	_, body := e.do(t, "GET", "/api/admin/costs", nil, nil)
	if !strings.Contains(string(body), `"tutorOff":true`) {
		t.Errorf("costs must report the switch: %s", body)
	}
	if resp, _ := e.do(t, "POST", "/api/admin/tutor/reset", nil, nil); resp.StatusCode != http.StatusForbidden {
		t.Errorf("a write without the CSRF token must be refused: %d", resp.StatusCode)
	}
	if off, _ := latch.Off(ctx); !off {
		t.Fatal("a refused reset must change nothing")
	}
	if resp, _ := e.post(t, "/api/admin/tutor/reset", nil); resp.StatusCode != http.StatusOK {
		t.Fatalf("reset: %d", resp.StatusCode)
	}
	if off, _ := latch.Off(ctx); off {
		t.Error("the reset must clear the switch")
	}
	found := false
	_ = e.store.View(ctx, func(tx state.Tx) error {
		for _, entry := range tx.ListAudit(0, "") {
			found = found || (entry.Action == "tutor.reset" && entry.Actor == adminAddr)
		}
		return nil
	})
	if !found {
		t.Error("the reset must be in the audit trail with the admin's email")
	}
}

func TestResponsesCarryAFreshRequestID(t *testing.T) {
	h := NewRouter(RouterConfig{ContentDir: t.TempDir()})
	get := func() string {
		w := httptest.NewRecorder()
		r := httptest.NewRequest(http.MethodGet, "/api/health", nil)
		r.Header.Set(requestIDHeader, "attacker-chosen")
		h.ServeHTTP(w, r)
		if body := w.Body.String(); body != `{"ok":true}` {
			t.Errorf("health must stay exact: %s", body)
		}
		return w.Header().Get(requestIDHeader)
	}
	a, b := get(), get()
	if len(a) != 16 || a == b || a == "attacker-chosen" {
		t.Errorf("request ids: %q %q", a, b)
	}
}

func TestPanicLogHoldsNoPanicValueOrInviteToken(t *testing.T) {
	var logs bytes.Buffer
	old := slog.Default()
	slog.SetDefault(slog.New(slog.NewTextHandler(&logs, nil)))
	defer slog.SetDefault(old)
	h := PanicRecoveryMiddleware(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
		panic("secret-value-from-a-request")
	}))
	w := httptest.NewRecorder()
	h.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/invite/token-in-the-url", nil))
	if w.Code != http.StatusInternalServerError {
		t.Errorf("status %d", w.Code)
	}
	out := logs.String()
	if strings.Contains(out, "secret-value-from-a-request") || strings.Contains(out, "token-in-the-url") {
		t.Errorf("the log leaked request data: %s", out)
	}
	if !strings.Contains(out, "error_class=string") {
		t.Errorf("the log must still help find the bug: %s", out)
	}
}

func TestRuntimeReportsTheRelease(t *testing.T) {
	h := NewRouter(RouterConfig{ContentDir: t.TempDir(), Release: "v1.2.3"})
	w := httptest.NewRecorder()
	h.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/api/runtime", nil))
	var info RuntimeInfo
	if err := json.Unmarshal(w.Body.Bytes(), &info); err != nil || info.Release != "v1.2.3" {
		t.Errorf("runtime: %s %v", w.Body.String(), err)
	}
}
