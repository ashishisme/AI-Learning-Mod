// SPEC: FR-011, FR-012
package auth

import "time"

// SessionInfo is what the app knows about a signed-in learner. It carries no secret.
type SessionInfo struct {
	BetaID       string    `json:"betaId"`
	Label        string    `json:"label"`
	ExpiresAt    time.Time `json:"expiresAt"`
	DaysLeft     int       `json:"daysLeft"`
	ExpiringSoon bool      `json:"expiringSoon"` // within 7 days of expiry (FR-011)
}

func newSessionInfo(betaID, label string, expiresAt, now time.Time) SessionInfo {
	left := expiresAt.Sub(now)
	days := int((left + 24*time.Hour - 1) / (24 * time.Hour)) // whole days, rounded up
	if days < 0 {
		days = 0
	}
	return SessionInfo{BetaID: betaID, Label: label, ExpiresAt: expiresAt, DaysLeft: days, ExpiringSoon: days <= 7}
}
