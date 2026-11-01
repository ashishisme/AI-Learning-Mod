// SPEC: FR-013, SC-004, SC-009
package auth

import (
	"context"
	"time"

	"ai-foundations-coach/internal/state"
)

const (
	lockWindow = 15 * time.Minute // failures older than this are forgotten
	lockMax    = 10               // failures inside the window that trigger a block
	pruneAbove = 5000             // attempt keys; above this a failure also prunes stale ones
)

// LockedError means sign-in is blocked for now. It matches ErrLocked with errors.Is.
type LockedError struct{ RetryAfter time.Duration }

func (*LockedError) Error() string        { return ErrLocked.Error() }
func (*LockedError) Is(target error) bool { return target == ErrLocked }

func attemptKeys(id, addr string, accountExists bool) []string {
	var keys []string
	if addr != "" {
		keys = append(keys, "ip:"+addr)
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
		for _, k := range attemptKeys(id, addr, accountExists) {
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

func (s *Service) loginFailed(ctx context.Context, id, addr string, accountExists bool) {
	now := s.now()
	_ = s.store.Do(ctx, func(tx state.Tx) error {
		for _, k := range attemptKeys(id, addr, accountExists) {
			tx.PutAttempts(k, append(recent(tx.GetAttempts(k), now), now))
		}
		if len(tx.ListAttemptKeys()) > pruneAbove {
			s.pruneAttempts(tx, now)
		}
		return nil
	})
}

func (s *Service) loginSucceeded(ctx context.Context, id string) {
	_ = s.store.Do(ctx, func(tx state.Tx) error {
		if len(tx.GetAttempts("id:"+id)) > 0 {
			tx.PutAttempts("id:"+id, nil)
		}
		return nil
	})
}

// pruneAttempts drops lockout records with no failure in the last 15 minutes.
func (s *Service) pruneAttempts(tx state.Tx, now time.Time) {
	for _, k := range tx.ListAttemptKeys() {
		if len(recent(tx.GetAttempts(k), now)) == 0 {
			tx.PutAttempts(k, nil)
		}
	}
}
