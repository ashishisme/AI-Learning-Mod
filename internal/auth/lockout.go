// SPEC: FR-013, SC-004, SC-009
package auth

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"log/slog"
	"time"

	"ai-foundations-coach/internal/state"
)

const (
	lockWindow = 15 * time.Minute // failures older than this are forgotten
	lockMax    = 10               // failures inside the window that trigger a block
	pruneEvery = 500              // failed sign-ins between prunes, so an address flood stays bounded between sweeps
)

// LockedError means sign-in is blocked for now. It matches ErrLocked with errors.Is.
type LockedError struct{ RetryAfter time.Duration }

func (*LockedError) Error() string        { return ErrLocked.Error() }
func (*LockedError) Is(target error) bool { return target == ErrLocked }

// ipKey never stores the address itself: a daily backup would otherwise keep it well past the
// 15-minute lockout window.
func (s *Service) ipKey(addr string) string {
	m := hmac.New(sha256.New, s.cfg.LockoutKey)
	m.Write([]byte(addr))
	return "ip:" + hex.EncodeToString(m.Sum(nil))[:32]
}

func (s *Service) attemptKeys(id, addr string, accountExists bool) []string {
	var keys []string
	if addr != "" {
		keys = append(keys, s.ipKey(addr))
	}
	// Unknown IDs are only counted against the address, so an attacker cannot grow the table by
	// inventing IDs.
	if accountExists {
		keys = append(keys, "id:"+id)
	}
	return keys
}

func recent(ts []time.Time, now time.Time) []time.Time {
	var out []time.Time
	for _, t := range ts {
		if now.Sub(t) < lockWindow {
			out = append(out, t)
		}
	}
	return out
}

// loginAllowed refuses an attempt while the account or the address is blocked. A block lasts until
// 15 minutes after the failure that triggered it, and applies even to the right password.
func (s *Service) loginAllowed(ctx context.Context, id, addr string, accountExists bool) error {
	now := s.now()
	var blocked *LockedError
	err := s.store.View(ctx, func(tx state.Tx) error {
		for _, k := range s.attemptKeys(id, addr, accountExists) {
			r := recent(tx.GetAttempts(k), now)
			if len(r) >= lockMax {
				if wait := r[lockMax-1].Add(lockWindow).Sub(now); wait > 0 && (blocked == nil || wait > blocked.RetryAfter) {
					blocked = &LockedError{RetryAfter: wait}
				}
			}
		}
		return nil
	})
	if err != nil {
		return err
	}
	if blocked != nil {
		return blocked
	}
	return nil
}

// loginFailed records a failure. An error means it was not recorded, and the caller must refuse the
// request: otherwise an outage would allow unlimited guessing.
func (s *Service) loginFailed(ctx context.Context, id, addr string, accountExists bool) error {
	now := s.now()
	err := s.store.Do(ctx, func(tx state.Tx) error {
		for _, k := range s.attemptKeys(id, addr, accountExists) {
			tx.PutAttempts(k, append(recent(tx.GetAttempts(k), now), now))
		}
		return nil
	})
	if err != nil {
		return err
	}
	if s.failedLogins.Add(1)%pruneEvery == 0 {
		if err := s.pruneAttempts(ctx, now); err != nil {
			slog.Warn("Could not prune sign-in attempts", "error", err.Error())
		}
	}
	return nil
}

func (s *Service) loginSucceeded(ctx context.Context, id string) {
	err := s.store.Do(ctx, func(tx state.Tx) error {
		if len(tx.GetAttempts("id:"+id)) > 0 {
			tx.PutAttempts("id:"+id, nil)
		}
		return nil
	})
	if err != nil {
		slog.Warn("Could not clear sign-in attempts", "error", err.Error())
	}
}

// pruneAttempts drops lockout records with no failure in the last 15 minutes.
func (s *Service) pruneAttempts(ctx context.Context, now time.Time) error {
	var stale []string
	if err := s.store.View(ctx, func(tx state.Tx) error {
		stale = nil
		for _, k := range tx.ListAttemptKeys() {
			if len(recent(tx.GetAttempts(k), now)) == 0 {
				stale = append(stale, k)
			}
		}
		return nil
	}); err != nil {
		return err
	}
	_, err := state.DoBatches(ctx, s.store, stale, func(tx state.Tx, k string) bool {
		if len(recent(tx.GetAttempts(k), now)) > 0 {
			return false
		}
		tx.PutAttempts(k, nil)
		return true
	})
	return err
}
