// SPEC: FR-026, SC-010
package spend

import (
	"context"
	"time"

	"ai-foundations-coach/internal/auth"
	"ai-foundations-coach/internal/state"
)

const (
	latchKey       = "policy:tutor_off"
	latchResetPref = "policy:tutor_reset:" // + YYYY-MM
)

// Latch switches the tutor off when the monthly budget is reached and keeps it off until an admin
// resets it (FR-026). It is one-way and idempotent, because budget notifications can repeat and
// arrive late or out of order. The daily ceiling in Tally stays the real limit on spend.
type Latch struct {
	store  state.Store
	tally  *Tally
	budget int64 // micro-US-dollars per month; 0 turns off the app's own check
	clock  func() time.Time
}

func NewLatch(st state.Store, t *Tally, monthlyBudgetUSD float64) *Latch {
	return &Latch{store: st, tally: t, budget: toMicro(monthlyBudgetUSD), clock: time.Now}
}

// SetClock replaces the time source (tests).
func (l *Latch) SetClock(f func() time.Time) { l.clock = f }

func (l *Latch) resetKey() string { return latchResetPref + auth.DayKey(l.clock())[:7] }

// Allowed reports whether the tutor may run. An error means the state is unknown, and the caller
// must refuse the request.
func (l *Latch) Allowed(ctx context.Context) (bool, error) {
	var off, reset bool
	if err := l.store.View(ctx, func(tx state.Tx) error {
		off = tx.GetCounter(latchKey) > 0
		reset = tx.GetCounter(l.resetKey()) > 0
		return nil
	}); err != nil {
		return false, err
	}
	if off {
		return false, nil
	}
	if reset || l.budget <= 0 || l.tally == nil {
		return true, nil
	}
	days, err := l.tally.Month(ctx, auth.DayKey(l.clock())[:7])
	if err != nil {
		return false, err
	}
	var month int64
	for _, v := range days {
		month += v
	}
	if month < l.budget {
		return true, nil
	}
	return false, l.Trip(ctx, "monthly budget reached")
}

// Off reports the latch itself, for the admin console.
func (l *Latch) Off(ctx context.Context) (bool, error) {
	var off bool
	err := l.store.View(ctx, func(tx state.Tx) error { off = tx.GetCounter(latchKey) > 0; return nil })
	return off, err
}

// Trip switches the tutor off. After an admin reset, signals for the rest of that month are ignored:
// budget notifications keep repeating, and the admin has accepted the spend, which the daily ceiling
// still limits. The next month arms the latch again.
func (l *Latch) Trip(ctx context.Context, reason string) error {
	return l.store.Do(ctx, func(tx state.Tx) error {
		if tx.GetCounter(latchKey) > 0 || tx.GetCounter(l.resetKey()) > 0 {
			return nil
		}
		tx.AddCounter(latchKey, 1)
		tx.AppendAudit(state.AuditEntry{At: l.clock().UTC(), Actor: "system", Action: "tutor.latch", Target: "tutor", Detail: reason})
		return nil
	})
}

// Reset is the only way back on, and it is recorded in the audit trail.
func (l *Latch) Reset(ctx context.Context, actor string) error {
	return l.store.Do(ctx, func(tx state.Tx) error {
		tx.DeleteCounter(latchKey)
		if tx.GetCounter(l.resetKey()) == 0 {
			tx.AddCounter(l.resetKey(), 1)
		}
		tx.AppendAudit(state.AuditEntry{At: l.clock().UTC(), Actor: actor, Action: "tutor.reset", Target: "tutor"})
		return nil
	})
}
