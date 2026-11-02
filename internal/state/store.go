// SPEC: DC-09 (amended 2.2.0), FR-029, FR-040, FR-049
// Package state defines the records the app persists and the transactional Store they live in.
// Nothing here may hold a learner's name, email, phone number, date of birth, network address
// (outside the short lockout window) or tutor question text.
package state

import (
	"context"
	"errors"
	"time"
)

type Invite struct {
	ID        string     `json:"id"`        // public handle for admins
	TokenHash string     `json:"tokenHash"` // hex SHA-256 of the link token; the token itself is never stored
	Label     string     `json:"label"`
	CreatedBy string     `json:"createdBy"`
	CreatedAt time.Time  `json:"createdAt"`
	ExpiresAt time.Time  `json:"expiresAt"`
	Status    string     `json:"status"` // pending | used | revoked ("expired" is derived)
	UsedAt    *time.Time `json:"usedAt,omitempty"`
	AccountID string     `json:"accountId,omitempty"`
}

const (
	InvitePending = "pending"
	InviteUsed    = "used"
	InviteRevoked = "revoked"

	AccountActive  = "active" // "expired" is derived from ExpiresAt
	AccountRevoked = "revoked"
)

type Extension struct {
	At            time.Time `json:"at"`
	By            string    `json:"by"`
	Months        int       `json:"months"`
	NewExpiresAt  time.Time `json:"newExpiresAt"`
	ByLabelAction bool      `json:"byLabelAction,omitempty"`
}

type Account struct {
	BetaID             string      `json:"betaId"`
	PasswordHash       string      `json:"passwordHash"`
	Label              string      `json:"label"`
	ActivatedAt        time.Time   `json:"activatedAt"`
	ExpiresAt          time.Time   `json:"expiresAt"`
	Status             string      `json:"status"`
	LastSeenAt         *time.Time  `json:"lastSeenAt,omitempty"`
	Extensions         []Extension `json:"extensions,omitempty"`
	PasswordReissuedAt *time.Time  `json:"passwordReissuedAt,omitempty"`
}

type Session struct {
	TokenHash string    `json:"tokenHash"`
	BetaID    string    `json:"betaId"`
	CreatedAt time.Time `json:"createdAt"`
	ExpiresAt time.Time `json:"expiresAt"`
}

type AuditEntry struct {
	ID     string    `json:"id"` // sortable: UTC timestamp + counter
	At     time.Time `json:"at"`
	Actor  string    `json:"actor"` // admin email, or "system"
	Action string    `json:"action"`
	Target string    `json:"target"`
	Detail string    `json:"detail,omitempty"`
}

// Feedback review states. A rule-check rejection never creates a record.
const (
	ReviewWaiting  = "waiting"
	ReviewPassed   = "passed"
	ReviewWithheld = "withheld"

	FeedbackNew      = "new"
	FeedbackRead     = "read"
	FeedbackResolved = "resolved"
)

type Feedback struct {
	ID             string     `json:"id"`
	At             time.Time  `json:"at"`
	Rating         int        `json:"rating"`
	Category       string     `json:"category"` // bug | content | idea | other
	Message        string     `json:"message"`  // empty once withheld
	Label          string     `json:"label"`
	LessonID       string     `json:"lessonId"`
	Mode           string     `json:"mode"` // standard | junior | plain-english
	AppVersion     string     `json:"appVersion"`
	Status         string     `json:"status"` // new | read | resolved
	Review         string     `json:"review"` // waiting | passed | withheld
	WithheldReason string     `json:"withheldReason,omitempty"`
	ReviewedAt     *time.Time `json:"reviewedAt,omitempty"`
	ReviewTries    int        `json:"reviewTries"`
	ClaimedUntil   *time.Time `json:"claimedUntil,omitempty"` // one auditor worker at a time across instances
}

var (
	// ErrReadOnly is returned by View when fn tried to change something.
	ErrReadOnly = errors.New("state: write inside a read-only view")
	// ErrCountersOnly is returned by DoCounters when fn changed anything but counters.
	ErrCountersOnly = errors.New("state: DoCounters may only change counters")
)

// Store is a transactional store. See specs/008-cloud-beta-deployment/contracts/store.md.
type Store interface {
	// Do runs fn as one atomic, serialised transaction. If fn returns an error nothing it did is kept.
	Do(ctx context.Context, fn func(Tx) error) error
	// View runs fn against a consistent read-only snapshot. Writes return ErrReadOnly.
	View(ctx context.Context, fn func(Tx) error) error
	// DoCounters runs a transaction that only changes counters. An implementation may batch these.
	DoCounters(ctx context.Context, fn func(Tx) error) error
	// Flush makes everything committed so far durable.
	Flush(ctx context.Context) error
	// Close flushes and releases the store.
	Close() error
}

// Tx reads and writes records. Values returned are copies; call Put* to change stored state.
type Tx interface {
	GetInviteByHash(tokenHash string) (Invite, bool)
	GetInviteByID(id string) (Invite, bool)
	PutInvite(Invite)
	ListInvites() []Invite
	DeleteInvite(id string)

	GetAccount(betaID string) (Account, bool)
	PutAccount(Account)
	ListAccounts() []Account
	DeleteAccount(betaID string)

	GetSession(tokenHash string) (Session, bool)
	PutSession(Session)
	DeleteSession(tokenHash string)
	DeleteSessionsFor(betaID string)
	CountSessionsFor(betaID string) int
	ListSessions() []Session

	AppendAudit(AuditEntry)
	// ListAudit returns up to limit entries, newest first, older than beforeID when it is not empty.
	ListAudit(limit int, beforeID string) []AuditEntry

	GetCounter(key string) int64
	AddCounter(key string, delta int64) int64
	ListCounters(prefix string) map[string]int64
	DeleteCounter(key string)

	GetAttempts(key string) []time.Time
	PutAttempts(key string, ts []time.Time) // an empty slice deletes the key
	ListAttemptKeys() []string

	PutFeedback(Feedback)
	GetFeedback(id string) (Feedback, bool)
	ListFeedback() []Feedback
	DeleteFeedback(id string)
}

// batchSize keeps each clean-up transaction short: a long one holds locks against live requests.
const batchSize = 50

// DoBatches runs fn for each id in short transactions and returns how many it reported as changed.
// fn must re-check the record, because it may have changed since the id was found.
func DoBatches(ctx context.Context, st Store, ids []string, fn func(tx Tx, id string) bool) (int, error) {
	total := 0
	for len(ids) > 0 {
		n := min(batchSize, len(ids))
		changed := 0
		err := st.Do(ctx, func(tx Tx) error {
			changed = 0
			for _, id := range ids[:n] {
				if fn(tx, id) {
					changed++
				}
			}
			return nil
		})
		if err != nil {
			return total, err
		}
		total += changed
		ids = ids[n:]
	}
	return total, nil
}
