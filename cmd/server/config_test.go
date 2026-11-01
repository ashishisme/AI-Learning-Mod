// SPEC: FR-001, FR-024, FR-058
package main

import (
	"strings"
	"testing"
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
