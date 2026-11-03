// SPEC: SPEC-009 FR-002, FR-022; FR-048
package api

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"ai-foundations-coach/internal/auth"
	"ai-foundations-coach/internal/feedback"
	"ai-foundations-coach/internal/i18n"
	"ai-foundations-coach/internal/state"
)

// The rejection is in the requested language only when that language is approved, and the
// matched text is never in the reply.
func TestFeedbackRejectionLanguage(t *testing.T) {
	st, err := state.OpenFileStore(filepath.Join(t.TempDir(), "state.json"))
	if err != nil {
		t.Fatal(err)
	}
	h := submitFeedback(feedback.NewService(st, nil), langSet(t, "approved"))
	hidden := submitFeedback(feedback.NewService(st, nil), langSet(t, "hidden"))

	for _, c := range []struct {
		name    string
		h       http.Handler
		lang    string
		want    string
		notWant string
	}{
		{"hindi", h, "hi", "कृपया निजी जानकारी (फ़ोन नंबर)", ""},
		{"english", h, "en", "Please remove personal details (phone)", "कृपया"},
		{"no lang", h, "", "Please remove personal details (phone)", "कृपया"},
		{"unknown", h, "../hi", "Please remove personal details (phone)", "कृपया"},
		{"hidden hindi", hidden, "hi", "Please remove personal details (phone)", "कृपया"},
	} {
		body, _ := json.Marshal(map[string]any{"rating": 4, "category": "content", "message": "मेरा नंबर ९८७६५४३२१० है", "lang": c.lang})
		req := httptest.NewRequest(http.MethodPost, "/api/feedback", strings.NewReader(string(body)))
		req = req.WithContext(context.WithValue(req.Context(), sessionKey{}, auth.SessionInfo{BetaID: "BETA-" + c.name, Label: "School A"}))
		rec := httptest.NewRecorder()
		c.h.ServeHTTP(rec, req)
		got := rec.Body.String()
		if rec.Code != http.StatusUnprocessableEntity || !strings.Contains(got, `"kind":"phone"`) || !strings.Contains(got, c.want) {
			t.Errorf("%s: %d %s", c.name, rec.Code, got)
		}
		if (c.notWant != "" && strings.Contains(got, c.notWant)) || strings.Contains(got, "९८७६५") || strings.Contains(got, "98765") {
			t.Errorf("%s: reply has unwanted text: %s", c.name, got)
		}
	}
}

func langSet(t *testing.T, status string) *i18n.Set {
	t.Helper()
	dir := t.TempDir()
	if err := os.WriteFile(filepath.Join(dir, "languages.json"), []byte(`{"languages":[{"code":"hi","name":"हिन्दी","speechLang":"hi-IN","status":"`+status+`"}]}`), 0o644); err != nil {
		t.Fatal(err)
	}
	s, err := i18n.Load(dir)
	if err != nil {
		t.Fatal(err)
	}
	return s
}
