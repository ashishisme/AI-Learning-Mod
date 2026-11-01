// SPEC: FR-001, FR-018, FR-024, FR-025, FR-058 (deployment configuration)
package main

import (
	"errors"
	"fmt"
	"net/url"
	"strconv"
	"strings"
)

// AppConfig is everything the server reads from its environment for SPEC-008.
type AppConfig struct {
	Hosted           bool
	AuthEnabled      bool
	StateFile        string
	SessionSecret    string
	PublicBaseURL    string
	OIDCIssuer       string
	OIDCClientID     string
	OIDCClientSecret string
	OIDCRequireMFA   bool
	AdminEmails      []string
	SeatCap          int
	TutorEnabled     bool
	DailyCeilingUSD  float64
	PriceInPerMtok   float64
	PriceOutPerMtok  float64
	MonthlyBudgetUSD float64
	TrustedProxyHops int

	AuditorBaseURL  string
	AuditorAPIKey   string
	AuditorModel    string
	FeedbackEnabled bool
}

// LoadConfig reads and checks the environment. When access control is on, every missing or invalid
// value is reported together so a deployment can be fixed in one pass.
func LoadConfig(getenv func(string) string) (AppConfig, error) {
	var problems []string
	bad := func(format string, a ...any) { problems = append(problems, fmt.Sprintf(format, a...)) }
	get := func(k string) string { return strings.TrimSpace(getenv(k)) }
	boolOf := func(k string) (v, set bool) {
		raw := get(k)
		if raw == "" {
			return false, false
		}
		b, err := strconv.ParseBool(raw)
		if err != nil {
			bad("%s must be true or false", k)
		}
		return b, true
	}
	floatOf := func(k string, def float64) float64 {
		raw := get(k)
		if raw == "" {
			return def
		}
		f, err := strconv.ParseFloat(raw, 64)
		if err != nil || f < 0 {
			bad("%s must be a non-negative number", k)
			return def
		}
		return f
	}
	intOf := func(k string, def int) int {
		raw := get(k)
		if raw == "" {
			return def
		}
		n, err := strconv.Atoi(raw)
		if err != nil || n < 0 {
			bad("%s must be a non-negative whole number", k)
			return def
		}
		return n
	}

	var c AppConfig
	c.Hosted, _ = boolOf("HOSTED_MODE")
	authReq, _ := boolOf("AUTH_REQUIRED")
	c.AuthEnabled = c.Hosted || authReq // hosted always requires sign-in (FR-001)
	c.StateFile = get("STATE_FILE")
	c.SessionSecret = getenv("SESSION_SECRET")
	c.PublicBaseURL = strings.TrimRight(get("PUBLIC_BASE_URL"), "/")
	c.OIDCIssuer = strings.TrimRight(get("OIDC_ISSUER"), "/")
	c.OIDCClientID = get("OIDC_CLIENT_ID")
	c.OIDCClientSecret = get("OIDC_CLIENT_SECRET")
	c.OIDCRequireMFA, _ = boolOf("OIDC_REQUIRE_MFA")
	for _, e := range strings.Split(get("ADMIN_EMAILS"), ",") {
		if e = strings.ToLower(strings.TrimSpace(e)); e != "" {
			c.AdminEmails = append(c.AdminEmails, e)
		}
	}
	c.SeatCap = intOf("SEAT_CAP", 1000)
	if v, set := boolOf("TUTOR_ENABLED"); set {
		c.TutorEnabled = v
	} else {
		c.TutorEnabled = !c.Hosted // off by default for the hosted beta (FR-024)
	}
	c.DailyCeilingUSD = floatOf("DAILY_SPEND_CEILING_USD", 1.00)
	c.PriceInPerMtok = floatOf("AI_PRICE_INPUT_PER_MTOK", 0.15)
	c.PriceOutPerMtok = floatOf("AI_PRICE_OUTPUT_PER_MTOK", 0.60)
	c.MonthlyBudgetUSD = floatOf("MONTHLY_BUDGET_USD", 30)
	c.TrustedProxyHops = intOf("TRUSTED_PROXY_HOPS", 0)

	c.AuditorBaseURL = strings.TrimRight(get("FEEDBACK_AUDITOR_BASE_URL"), "/")
	c.AuditorAPIKey = get("FEEDBACK_AUDITOR_API_KEY")
	c.AuditorModel = get("FEEDBACK_AUDITOR_MODEL")
	set := 0
	for _, v := range []string{c.AuditorBaseURL, c.AuditorAPIKey, c.AuditorModel} {
		if v != "" {
			set++
		}
	}
	if set != 0 && set != 3 {
		bad("FEEDBACK_AUDITOR_BASE_URL, FEEDBACK_AUDITOR_API_KEY and FEEDBACK_AUDITOR_MODEL must all be set or all be empty")
	}
	c.FeedbackEnabled = c.AuthEnabled && set == 3

	if c.AuthEnabled {
		if len(c.SessionSecret) < 32 {
			bad("SESSION_SECRET must be at least 32 bytes")
		}
		if c.StateFile == "" {
			bad("STATE_FILE is required (the JSON file for accounts, invites and sessions)")
		}
		if u, err := url.Parse(c.PublicBaseURL); err != nil || c.PublicBaseURL == "" || (u.Scheme != "http" && u.Scheme != "https") || u.Host == "" {
			bad("PUBLIC_BASE_URL must be an http or https URL, for example https://coach.example.org")
		}
		if c.OIDCIssuer == "" {
			bad("OIDC_ISSUER is required for admin sign-in")
		}
		if c.OIDCClientID == "" {
			bad("OIDC_CLIENT_ID is required for admin sign-in")
		}
		if c.OIDCClientSecret == "" {
			bad("OIDC_CLIENT_SECRET is required for admin sign-in")
		}
		if len(c.AdminEmails) == 0 {
			bad("ADMIN_EMAILS needs at least one admin email")
		}
		if c.SeatCap < 1 {
			bad("SEAT_CAP must be at least 1")
		}
	}
	if len(problems) > 0 {
		return c, errors.New("invalid configuration:\n  - " + strings.Join(problems, "\n  - "))
	}
	return c, nil
}
