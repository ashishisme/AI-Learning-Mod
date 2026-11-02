// SPEC: FR-001, FR-018, FR-023, FR-024, FR-025, FR-029, FR-058 (deployment configuration)
package main

import (
	"errors"
	"fmt"
	"net/url"
	"os"
	"strconv"
	"strings"
)

// AppConfig is everything the server reads from its environment for SPEC-008.
type AppConfig struct {
	Hosted           bool
	AuthEnabled      bool
	StateBackend     string // file (development, tests, self-hosting) or firestore (Cloud Run)
	StateFile        string
	FirestoreProject string
	EmulatorHost     string // development and CI only
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
	AuditorKeyFile  string // a mounted secret, read on every review so rotation needs no deploy
	AuditorModel    string
	FeedbackEnabled bool
	// AuditorKeyUnreadable means the auditor is configured but its key cannot be read, so feedback
	// stays hidden. It is not a startup failure: the rest of the app works without feedback.
	AuditorKeyUnreadable bool

	// BudgetPushAudience and BudgetPushAccount turn on the verified budget notification route.
	BudgetPushAudience string
	BudgetPushAccount  string
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

	onCloudRun := get("K_SERVICE") != "" // set by the platform on every service revision

	// secret reads NAME_FILE, a mounted Secret Manager volume. A plain NAME stays available for
	// development and self-hosting, but is refused on Cloud Run (FR-023).
	secret := func(name string) string {
		file, plain := get(name+"_FILE"), getenv(name)
		switch {
		case file != "" && plain != "":
			bad("set only one of %s and %s_FILE", name, name)
		case onCloudRun && plain != "":
			bad("%s must not be a plain variable on Cloud Run: mount it from Secret Manager and set %s_FILE", name, name)
		case file != "":
			raw, err := os.ReadFile(file)
			if err != nil {
				bad("%s_FILE cannot be read", name)
				return ""
			}
			return strings.TrimSpace(string(raw))
		}
		return plain
	}

	var c AppConfig
	c.Hosted, _ = boolOf("HOSTED_MODE")
	authReq, _ := boolOf("AUTH_REQUIRED")
	c.AuthEnabled = c.Hosted || authReq // hosted always requires sign-in (FR-001)
	c.StateBackend = strings.ToLower(get("STATE_BACKEND"))
	if c.StateBackend == "" {
		c.StateBackend = "file"
	}
	c.StateFile = get("STATE_FILE")
	c.FirestoreProject = get("FIRESTORE_PROJECT_ID")
	c.EmulatorHost = get("FIRESTORE_EMULATOR_HOST")
	if onCloudRun {
		// The file store loses every account on Cloud Run, and an instance without access control
		// would have no state at all. Neither may ever start there (FR-029).
		if !c.Hosted {
			bad("HOSTED_MODE must be true on Cloud Run")
		}
		if c.StateBackend != "firestore" {
			bad("STATE_BACKEND must be firestore on Cloud Run: a state file does not survive an instance")
		}
		if c.EmulatorHost != "" {
			bad("FIRESTORE_EMULATOR_HOST must not be set on Cloud Run")
		}
	}
	c.SessionSecret = secret("SESSION_SECRET")
	c.PublicBaseURL = strings.TrimRight(get("PUBLIC_BASE_URL"), "/")
	c.OIDCIssuer = strings.TrimRight(get("OIDC_ISSUER"), "/")
	c.OIDCClientID = get("OIDC_CLIENT_ID")
	c.OIDCClientSecret = strings.TrimSpace(secret("OIDC_CLIENT_SECRET"))
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
	c.BudgetPushAudience = get("BUDGET_PUSH_AUDIENCE")
	c.BudgetPushAccount = get("BUDGET_PUSH_SERVICE_ACCOUNT")
	if (c.BudgetPushAudience == "") != (c.BudgetPushAccount == "") {
		bad("BUDGET_PUSH_AUDIENCE and BUDGET_PUSH_SERVICE_ACCOUNT must both be set or both be empty")
	}

	c.AuditorBaseURL = strings.TrimRight(get("FEEDBACK_AUDITOR_BASE_URL"), "/")
	c.AuditorAPIKey = get("FEEDBACK_AUDITOR_API_KEY")
	c.AuditorKeyFile = get("FEEDBACK_AUDITOR_API_KEY_FILE")
	c.AuditorModel = get("FEEDBACK_AUDITOR_MODEL")
	switch {
	case c.AuditorAPIKey != "" && c.AuditorKeyFile != "":
		bad("set only one of FEEDBACK_AUDITOR_API_KEY and FEEDBACK_AUDITOR_API_KEY_FILE")
	case onCloudRun && c.AuditorAPIKey != "":
		bad("FEEDBACK_AUDITOR_API_KEY must not be a plain variable on Cloud Run: mount it from Secret Manager and set FEEDBACK_AUDITOR_API_KEY_FILE")
	}
	set := 0
	for _, v := range []string{c.AuditorBaseURL, c.AuditorAPIKey + c.AuditorKeyFile, c.AuditorModel} {
		if v != "" {
			set++
		}
	}
	if set != 0 && set != 3 {
		bad("FEEDBACK_AUDITOR_BASE_URL, FEEDBACK_AUDITOR_API_KEY (or _FILE) and FEEDBACK_AUDITOR_MODEL must all be set or all be empty")
	}
	if c.AuditorKeyFile != "" {
		raw, err := os.ReadFile(c.AuditorKeyFile)
		c.AuditorKeyUnreadable = err != nil || strings.TrimSpace(string(raw)) == ""
	}
	c.FeedbackEnabled = c.AuthEnabled && set == 3 && !c.AuditorKeyUnreadable

	if c.AuthEnabled {
		if len(c.SessionSecret) < 32 {
			bad("SESSION_SECRET must be at least 32 bytes")
		}
		switch c.StateBackend {
		case "file":
			if c.StateFile == "" {
				bad("STATE_FILE is required (the JSON file for accounts, invites and sessions)")
			}
		case "firestore":
			if c.FirestoreProject == "" {
				bad("FIRESTORE_PROJECT_ID is required with STATE_BACKEND=firestore")
			}
		default:
			bad("STATE_BACKEND must be file or firestore")
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
