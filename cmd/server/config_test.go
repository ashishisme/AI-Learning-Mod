// SPEC: FR-001, FR-024, FR-058
package main

import (
	"bytes"
	"log/slog"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func env(m map[string]string) func(string) string { return func(k string) string { return m[k] } }

var validAuth = map[string]string{
	"AUTH_REQUIRED": "true", "STATE_FILE": "/data/state.json", "SESSION_SECRET": strings.Repeat("s", 32),
	"PUBLIC_BASE_URL": "https://coach.example.org/", "OIDC_ISSUER": "https://idp.example.org/", "OIDC_CLIENT_ID": "id",
	"OIDC_CLIENT_SECRET": "secret", "ADMIN_EMAILS": "Owner@Example.org, ,second@example.org",
}

func with(extra map[string]string) map[string]string {
	m := map[string]string{}
	for k, v := range validAuth {
		m[k] = v
	}
	for k, v := range extra {
		m[k] = v
	}
	return m
}

func TestAuthOffByDefaultAndNothingRequired(t *testing.T) {
	c, err := LoadConfig(env(nil))
	if err != nil || c.AuthEnabled || c.Hosted || !c.TutorEnabled || c.FeedbackEnabled || c.SeatCap != 1000 {
		t.Fatalf("defaults: %+v %v", c, err)
	}
	if c.DailyCeilingUSD != 1.00 || c.MonthlyBudgetUSD != 30 || c.PriceInPerMtok != 0.15 || c.PriceOutPerMtok != 0.60 {
		t.Errorf("numeric defaults: %+v", c)
	}
}

func TestHostedForcesAuthAndTurnsTutorOff(t *testing.T) {
	c, err := LoadConfig(env(with(map[string]string{"AUTH_REQUIRED": "", "HOSTED_MODE": "true"})))
	if err != nil || !c.AuthEnabled || c.TutorEnabled {
		t.Fatalf("hosted: %+v %v", c, err)
	}
	if _, err := LoadConfig(env(map[string]string{"HOSTED_MODE": "true"})); err == nil {
		t.Fatal("hosted without the auth settings must be an error")
	}
	c, _ = LoadConfig(env(with(map[string]string{"HOSTED_MODE": "true", "TUTOR_ENABLED": "true"})))
	if !c.TutorEnabled {
		t.Error("TUTOR_ENABLED=true must turn the tutor on even when hosted")
	}
}

func TestAllProblemsReportedTogether(t *testing.T) {
	_, err := LoadConfig(env(map[string]string{"AUTH_REQUIRED": "true", "SESSION_SECRET": "short", "PUBLIC_BASE_URL": "ftp://x"}))
	if err == nil {
		t.Fatal("expected an error")
	}
	for _, want := range []string{"SESSION_SECRET", "STATE_FILE", "PUBLIC_BASE_URL", "OIDC_ISSUER", "OIDC_CLIENT_ID", "OIDC_CLIENT_SECRET", "ADMIN_EMAILS"} {
		if !strings.Contains(err.Error(), want) {
			t.Errorf("error does not mention %s: %v", want, err)
		}
	}
}

func TestValidAuthConfig(t *testing.T) {
	c, err := LoadConfig(env(validAuth))
	if err != nil {
		t.Fatal(err)
	}
	if c.PublicBaseURL != "https://coach.example.org" || c.OIDCIssuer != "https://idp.example.org" {
		t.Errorf("trailing slashes: %q %q", c.PublicBaseURL, c.OIDCIssuer)
	}
	if len(c.AdminEmails) != 2 || c.AdminEmails[0] != "owner@example.org" {
		t.Errorf("admin emails: %v", c.AdminEmails)
	}
}

func TestFeedbackNeedsAllThreeAuditorSettings(t *testing.T) {
	three := map[string]string{"FEEDBACK_AUDITOR_BASE_URL": "https://api.example.org/v1", "FEEDBACK_AUDITOR_API_KEY": "k", "FEEDBACK_AUDITOR_MODEL": "m"}
	c, err := LoadConfig(env(with(three)))
	if err != nil || !c.FeedbackEnabled {
		t.Fatalf("all three set: %+v %v", c, err)
	}
	c, _ = LoadConfig(env(validAuth))
	if c.FeedbackEnabled {
		t.Error("feedback must be off without an auditor")
	}
	for _, drop := range []string{"FEEDBACK_AUDITOR_BASE_URL", "FEEDBACK_AUDITOR_API_KEY", "FEEDBACK_AUDITOR_MODEL"} {
		partial := with(three)
		delete(partial, drop)
		if _, err := LoadConfig(env(partial)); err == nil {
			t.Errorf("a partial auditor set (missing %s) must be an error", drop)
		}
	}
	// With auth off, feedback stays off even with a full auditor set.
	c, _ = LoadConfig(env(three))
	if c.FeedbackEnabled {
		t.Error("feedback needs access control")
	}
}

func TestNumbersAreValidated(t *testing.T) {
	for _, bad := range []map[string]string{{"SEAT_CAP": "x"}, {"DAILY_SPEND_CEILING_USD": "-1"}, {"HOSTED_MODE": "maybe"}, {"TRUSTED_PROXY_HOPS": "-2"}} {
		if _, err := LoadConfig(env(bad)); err == nil {
			t.Errorf("%v accepted", bad)
		}
	}
}

// What a correct Cloud Run revision looks like: Firestore, and secrets as mounted files.
func cloudRunEnv(t *testing.T) map[string]string {
	t.Helper()
	m := with(map[string]string{"K_SERVICE": "coach", "HOSTED_MODE": "true", "STATE_BACKEND": "firestore", "FIRESTORE_PROJECT_ID": "staging"})
	delete(m, "SESSION_SECRET")
	delete(m, "OIDC_CLIENT_SECRET")
	dir := t.TempDir()
	for name, value := range map[string]string{"SESSION_SECRET": strings.Repeat("s", 32), "OIDC_CLIENT_SECRET": "secret"} {
		path := filepath.Join(dir, name)
		if err := os.WriteFile(path, []byte(value+"\n"), 0o600); err != nil {
			t.Fatal(err)
		}
		m[name+"_FILE"] = path
	}
	return m
}

func TestCloudRunConfigIsAccepted(t *testing.T) {
	c, err := LoadConfig(env(cloudRunEnv(t)))
	if err != nil {
		t.Fatal(err)
	}
	if c.StateBackend != "firestore" || c.SessionSecret != strings.Repeat("s", 32) || c.OIDCClientSecret != "secret" {
		t.Errorf("config: %+v", c)
	}
}

func TestCloudRunRefusesUnsafeConfig(t *testing.T) {
	cases := map[string]struct {
		set  map[string]string
		drop string
		want string
	}{
		"no backend":        {drop: "STATE_BACKEND", want: "STATE_BACKEND must be firestore"},
		"file backend":      {set: map[string]string{"STATE_BACKEND": "file"}, want: "STATE_BACKEND must be firestore"},
		"not hosted":        {set: map[string]string{"HOSTED_MODE": "false"}, want: "HOSTED_MODE must be true"},
		"no project":        {drop: "FIRESTORE_PROJECT_ID", want: "FIRESTORE_PROJECT_ID is required"},
		"emulator":          {set: map[string]string{"FIRESTORE_EMULATOR_HOST": "127.0.0.1:8080"}, want: "FIRESTORE_EMULATOR_HOST must not"},
		"plain session":     {set: map[string]string{"SESSION_SECRET": strings.Repeat("s", 32)}, want: "only one of SESSION_SECRET"},
		"missing file":      {set: map[string]string{"SESSION_SECRET_FILE": "/does/not/exist"}, want: "SESSION_SECRET_FILE cannot be read"},
		"plain auditor key": {set: map[string]string{"FEEDBACK_AUDITOR_BASE_URL": "https://a.example.org/v1", "FEEDBACK_AUDITOR_MODEL": "m", "FEEDBACK_AUDITOR_API_KEY": "k"}, want: "FEEDBACK_AUDITOR_API_KEY must not be a plain"},
	}
	for name, tc := range cases {
		t.Run(name, func(t *testing.T) {
			m := cloudRunEnv(t)
			for k, v := range tc.set {
				m[k] = v
			}
			delete(m, tc.drop)
			if _, err := LoadConfig(env(m)); err == nil || !strings.Contains(err.Error(), tc.want) {
				t.Errorf("got %v, want it to mention %q", err, tc.want)
			}
		})
	}
	m := cloudRunEnv(t)
	delete(m, "OIDC_CLIENT_SECRET_FILE")
	m["OIDC_CLIENT_SECRET"] = "plain"
	if _, err := LoadConfig(env(m)); err == nil || !strings.Contains(err.Error(), "OIDC_CLIENT_SECRET must not be a plain") {
		t.Errorf("plain OIDC secret: %v", err)
	}
}

func TestStateBackendRules(t *testing.T) {
	if c, err := LoadConfig(env(validAuth)); err != nil || c.StateBackend != "file" {
		t.Errorf("default backend: %+v %v", c.StateBackend, err)
	}
	if _, err := LoadConfig(env(with(map[string]string{"STATE_BACKEND": "redis"}))); err == nil {
		t.Error("an unknown backend must be refused")
	}
	if _, err := LoadConfig(env(with(map[string]string{"STATE_BACKEND": "firestore"}))); err == nil {
		t.Error("firestore needs a project ID")
	}
	// Self-hosting on a file is still allowed off Cloud Run (DC-09).
	if _, err := LoadConfig(env(with(map[string]string{"HOSTED_MODE": "true"}))); err != nil {
		t.Errorf("hosted self-hosting on a file: %v", err)
	}
}

func TestAuditorKeyFile(t *testing.T) {
	three := func(keyFile string) map[string]string {
		return with(map[string]string{"FEEDBACK_AUDITOR_BASE_URL": "https://a.example.org/v1", "FEEDBACK_AUDITOR_MODEL": "m", "FEEDBACK_AUDITOR_API_KEY_FILE": keyFile})
	}
	path := filepath.Join(t.TempDir(), "key")
	c, err := LoadConfig(env(three(path)))
	if err != nil || c.FeedbackEnabled || !c.AuditorKeyUnreadable {
		t.Errorf("an unreadable key hides feedback without stopping the server: %+v %v", c, err)
	}
	if err := os.WriteFile(path, []byte("k\n"), 0o600); err != nil {
		t.Fatal(err)
	}
	c, err = LoadConfig(env(three(path)))
	if err != nil || !c.FeedbackEnabled {
		t.Errorf("a readable key turns feedback on: %+v %v", c, err)
	}
	both := three(path)
	both["FEEDBACK_AUDITOR_API_KEY"] = "k"
	if _, err := LoadConfig(env(both)); err == nil {
		t.Error("a plain key and a key file together must be refused")
	}
}

// The final flush must fit inside Cloud Run's 10-second window.
func TestShutdownFitsCloudRunWindow(t *testing.T) {
	if shutdownDrain+shutdownFlush >= 10*time.Second {
		t.Errorf("drain %v plus flush %v must be under 10s", shutdownDrain, shutdownFlush)
	}
}

func TestBudgetPushNeedsBothSettings(t *testing.T) {
	if _, err := LoadConfig(env(with(map[string]string{"BUDGET_PUSH_AUDIENCE": "https://x"}))); err == nil {
		t.Error("an audience without a service account must be refused")
	}
	c, err := LoadConfig(env(with(map[string]string{"BUDGET_PUSH_AUDIENCE": "https://x", "BUDGET_PUSH_SERVICE_ACCOUNT": "a@b"})))
	if err != nil || c.BudgetPushAudience != "https://x" {
		t.Errorf("%+v %v", c.BudgetPushAudience, err)
	}
}

// Cloud Logging reads severity and message from these exact keys.
func TestCloudLogFormat(t *testing.T) {
	var buf bytes.Buffer
	old := os.Stdout
	r, w, err := os.Pipe()
	if err != nil {
		t.Fatal(err)
	}
	os.Stdout = w
	h := cloudLogHandler()
	os.Stdout = old
	slog.New(h).Warn("auth_failure", "kind", "locked")
	w.Close()
	_, _ = buf.ReadFrom(r)
	line := buf.String()
	if !strings.Contains(line, `"severity":"WARN"`) || !strings.Contains(line, `"message":"auth_failure"`) {
		t.Errorf("log line: %s", line)
	}
}
