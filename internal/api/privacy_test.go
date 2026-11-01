// SPEC: FR-004, FR-035, FR-038, FR-044, FR-049, SC-012, SC-016
package api

import (
	"bytes"
	"context"
	"log"
	"log/slog"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"ai-foundations-coach/internal/auth"
	"ai-foundations-coach/internal/feedback"
	"ai-foundations-coach/internal/state"
	"ai-foundations-coach/internal/usage"
)

// This exercises the shared durable file, where accidental collection would persist after
// requests finish. The separate handler tests cover the HTTP response and audit surfaces.
func TestPrivacyAcrossActivationLoginUsageFeedbackAndAdminActions(t *testing.T) {
	var logs bytes.Buffer
	oldSlog := slog.Default()
	oldLog := log.Writer()
	slog.SetDefault(slog.New(slog.NewTextHandler(&logs, nil)))
	log.SetOutput(&logs)
	defer func() { slog.SetDefault(oldSlog); log.SetOutput(oldLog) }()
	ctx := context.Background()
	path := filepath.Join(t.TempDir(), "state.json")
	store, err := state.OpenFileStore(path)
	if err != nil {
		t.Fatal(err)
	}
	defer store.Close()
	svc := auth.NewService(store, auth.DefaultConfig("https://coach.example.org"))
	links, err := svc.CreateInvites(ctx, "admin@example.org", 1, "Class 7B")
	if err != nil {
		t.Fatal(err)
	}
	token := strings.TrimPrefix(links[0], "https://coach.example.org/invite/")
	activated, err := svc.Activate(ctx, token)
	if err != nil {
		t.Fatal(err)
	}
	addr := "198.51.100.25"
	if _, err := svc.Login(ctx, activated.BetaID, activated.Password, addr); err != nil {
		t.Fatal(err)
	}
	recorder := usage.New(store)
	recorder.Seen(ctx, activated.BetaID)
	recorder.Inc(usage.Requests)
	if err := recorder.Flush(ctx); err != nil {
		t.Fatal(err)
	}
	fb := feedback.NewService(store, nil)
	phone := "9876543210"
	if err := fb.Submit(ctx, activated.BetaID, "Class 7B", feedback.Input{Rating: 4, Category: "content", Message: "call " + phone}); err == nil {
		t.Fatal("personal details were accepted")
	}
	if err := fb.Submit(ctx, activated.BetaID, "Class 7B", feedback.Input{Rating: 4, Category: "content", Message: "The quiz was clear"}); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.CreateInvites(ctx, "admin@example.org", 1, "Class 8A"); err != nil {
		t.Fatal(err)
	}
	if err := store.Flush(ctx); err != nil {
		t.Fatal(err)
	}
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	for _, secret := range []string{token, activated.Password, activated.SessionToken, addr, phone} {
		if strings.Contains(string(raw), secret) {
			t.Errorf("durable state contains a secret or personal detail")
		}
		if strings.Contains(logs.String(), secret) {
			t.Errorf("logs contain a secret or personal detail")
		}
	}
	if strings.Contains(string(raw), `"password":`) || strings.Contains(string(raw), `"token":`) {
		t.Error("durable state contains a raw credential field")
	}
}
