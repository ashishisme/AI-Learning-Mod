// SPEC: FR-001..FR-013, FR-017, FR-035
// Package auth holds the invite-only access rules: invites, accounts, sessions, admin actions.
package auth

import (
	"context"
	"errors"
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"time"

	"ai-foundations-coach/internal/state"
)

var (
	ErrSeatCap        = errors.New("seat cap reached")
	ErrInviteInvalid  = errors.New("invite not found")
	ErrInviteUsed     = errors.New("invite already used")
	ErrInviteExpired  = errors.New("invite expired")
	ErrInviteRevoked  = errors.New("invite revoked")
	ErrBadCredentials = errors.New("beta id or password is incorrect")
	ErrLocked         = errors.New("too many attempts")
	ErrAccountExpired = errors.New("your beta access has expired")
	ErrAccountRevoked = errors.New("your beta access was revoked")
	ErrNoSession      = errors.New("sign in required")
	ErrNotFound       = errors.New("not found")
	ErrInvalidInput   = errors.New("invalid input")
)

// Config holds the access rules. DefaultConfig gives the beta values from the spec.
type Config struct {
	SeatCap       int           // accounts plus unused unexpired invites
	InviteTTL     time.Duration // FR-003
	SessionTTL    time.Duration // FR-012
	AccountMonths int           // FR-007
	BaseURL       string        // for invite links
}

func DefaultConfig(baseURL string) Config {
	return Config{SeatCap: 1000, InviteTTL: 14 * 24 * time.Hour, SessionTTL: 14 * 24 * time.Hour, AccountMonths: 2, BaseURL: strings.TrimRight(baseURL, "/")}
}

type Service struct {
	store      state.Store
	cfg        Config
	clock      func() time.Time
	sweepHooks []SweepHook
}

func NewService(st state.Store, cfg Config) *Service {
	if cfg.SeatCap <= 0 {
		cfg.SeatCap = 1000
	}
	return &Service{store: st, cfg: cfg, clock: time.Now}
}

// SetClock replaces the time source (tests).
func (s *Service) SetClock(f func() time.Time) { s.clock = f }

func (s *Service) now() time.Time { return s.clock().UTC() }

// SeatCap is the configured hard cap.
func (s *Service) SeatCap() int { return s.cfg.SeatCap }

var labelRe = regexp.MustCompile(`^[A-Za-z0-9 _.-]{0,40}$`)

// ValidLabel reports whether label is a usable group label: at most 40 characters of letters,
// digits, space, "-", "_" and ".".
func ValidLabel(label string) bool { return labelRe.MatchString(label) }

// seatsUsed counts active accounts (expired ones keep their seat until purged) plus pending,
// unexpired invites.
func seatsUsed(tx state.Tx, now time.Time) int {
	n := 0
	for _, a := range tx.ListAccounts() {
		if a.Status == state.AccountActive {
			n++
		}
	}
	for _, in := range tx.ListInvites() {
		if in.Status == state.InvitePending && !now.After(in.ExpiresAt) {
			n++
		}
	}
	return n
}

func appendAudit(tx state.Tx, at time.Time, actor, action, target, detail string) {
	if len(detail) > 200 {
		detail = detail[:200]
	}
	tx.AppendAudit(state.AuditEntry{At: at, Actor: actor, Action: action, Target: target, Detail: detail})
}

// CreateInvites makes n single-use invites (1 to 100) and returns their links. The whole batch is
// refused when it would take the seat count above the cap. Only token hashes are stored.
func (s *Service) CreateInvites(ctx context.Context, actor string, n int, label string) ([]string, error) {
	label = strings.TrimSpace(label)
	if n < 1 || n > 100 || !ValidLabel(label) {
		return nil, ErrInvalidInput
	}
	var links []string
	err := s.store.Do(ctx, func(tx state.Tx) error {
		now := s.now()
		if seatsUsed(tx, now)+n > s.cfg.SeatCap {
			return ErrSeatCap
		}
		links = links[:0]
		for i := 0; i < n; i++ {
			token := NewToken()
			id := newInviteID()
			for {
				if _, taken := tx.GetInviteByID(id); !taken {
					break
				}
				id = newInviteID()
			}
			tx.PutInvite(state.Invite{
				ID: id, TokenHash: HashToken(token), Label: label, CreatedBy: actor,
				CreatedAt: now, ExpiresAt: now.Add(s.cfg.InviteTTL), Status: state.InvitePending,
			})
			links = append(links, s.cfg.BaseURL+"/invite/"+token)
		}
		appendAudit(tx, now, actor, "invite.create", labelOrDash(label), fmt.Sprintf("count=%d label=%s", n, label))
		return nil
	})
	if err != nil {
		return nil, err
	}
	return links, nil
}

func labelOrDash(l string) string {
	if l == "" {
		return "-"
	}
	return l
}

// accountExpired is derived from the clock; it is never stored.
func accountExpired(a state.Account, now time.Time) bool { return !now.Before(a.ExpiresAt) }

func itoa(n int) string { return strconv.Itoa(n) }

func trimSpace(s string) string { return strings.TrimSpace(s) }
