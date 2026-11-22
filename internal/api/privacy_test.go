// SPEC: FR-004, FR-035, FR-038, FR-044, FR-049, SC-012, SC-016
package api

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"log"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"ai-foundations-coach/internal/auth"
	"ai-foundations-coach/internal/feedback"
	"ai-foundations-coach/internal/state"
	"ai-foundations-coach/internal/state/firestorefake"
	"ai-foundations-coach/internal/usage"
)

// This exercises durable state, where accidental collection would persist after requests finish,
// and on Firestore would also reach every daily backup. The separate handler tests cover the HTTP
// response and audit surfaces.
func TestPrivacyAcrossActivationLoginUsageFeedbackAndAdminActions(t *testing.T) {
	t.Run("file store", func(t *testing.T) {
		path := filepath.Join(t.TempDir(), "state.json")
		store, err := state.OpenFileStore(path)
		if err != nil {
			t.Fatal(err)
		}
		defer store.Close()
		privacyFlow(t, store, func() string {
			raw, err := os.ReadFile(path)
			if err != nil {
				t.Fatal(err)
			}
			return string(raw)
		})
	})
	t.Run("firestore", func(t *testing.T) {
		srv := firestorefake.New()
		defer srv.Close()
		store, err := state.OpenFirestoreStore(context.Background(), state.FirestoreConfig{ProjectID: "p", BaseURL: srv.URL,
			Token: func(context.Context) (string, error) { return "t", nil }})
		if err != nil {
			t.Fatal(err)
		}
		privacyFlow(t, store, func() string { return srv.Dump("p") })
	})
	t.Run("firestore emulator", func(t *testing.T) {
		host := os.Getenv("FIRESTORE_EMULATOR_HOST")
		if host == "" {
			t.Skip("FIRESTORE_EMULATOR_HOST is not set")
		}
		project := fmt.Sprintf("privacy-%d", time.Now().UnixNano())
		store, err := state.OpenFirestoreStore(context.Background(), state.FirestoreConfig{ProjectID: project, BaseURL: "http://" + host,
			Token: func(context.Context) (string, error) { return "owner", nil }, MaxAttempts: 50, TxTimeout: 2 * time.Minute})
		if err != nil {
			t.Fatal(err)
		}
		privacyFlow(t, store, func() string { return dumpEmulator(t, host, project) })
	})
}

// dumpEmulator reads every stored document back over the emulator's REST API: what a backup would hold.
func dumpEmulator(t *testing.T, host, project string) string {
	t.Helper()
	var all strings.Builder
	for _, coll := range []string{"invites", "accounts", "sessions", "audit", "counters", "attempts", "feedback", "meta"} {
		req, _ := http.NewRequest(http.MethodGet, "http://"+host+"/v1/projects/"+project+"/databases/(default)/documents/"+coll+"?pageSize=1000", nil)
		req.Header.Set("Authorization", "Bearer owner")
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatal(err)
		}
		raw, err := io.ReadAll(resp.Body)
		resp.Body.Close()
		if err != nil || resp.StatusCode != http.StatusOK {
			t.Fatalf("list %s: %d %v", coll, resp.StatusCode, err)
		}
		all.Write(raw)
	}
	return all.String()
}

func privacyFlow(t *testing.T, store state.Store, stored func() string) {
	t.Helper()
	var logs bytes.Buffer
	oldSlog := slog.Default()
	oldLog := log.Writer()
	slog.SetDefault(slog.New(slog.NewTextHandler(&logs, nil)))
	log.SetOutput(&logs)
	defer func() { slog.SetDefault(oldSlog); log.SetOutput(oldLog) }()
	ctx := context.Background()
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
	if _, err := svc.Login(ctx, activated.BetaID, "wrong", addr); err == nil { // a failure records the address
		t.Fatal("a wrong password was accepted")
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
	raw := stored()
	if !strings.Contains(raw, activated.BetaID) {
		t.Fatal("the scan is not reading the stored records")
	}
	for name, secret := range map[string]string{"invite token": token, "password": activated.Password,
		"session token": activated.SessionToken, "network address": addr, "phone number": phone} {
		if strings.Contains(raw, secret) {
			t.Errorf("durable state contains a %s", name)
		}
		if strings.Contains(logs.String(), secret) {
			t.Errorf("logs contain a %s", name)
		}
	}
	if strings.Contains(raw, `"password":`) || strings.Contains(raw, `"token":`) {
		t.Error("durable state contains a raw credential field")
	}
}
