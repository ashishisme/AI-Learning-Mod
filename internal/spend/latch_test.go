// SPEC: FR-026, SC-010
package spend

import (
	"context"
	"errors"
	"path/filepath"
	"testing"
	"time"

	"ai-foundations-coach/internal/state"
	"ai-foundations-coach/internal/state/statetest"
)

func newLatch(t *testing.T, budget float64) (*Latch, *Tally, state.Store, *time.Time) {
	t.Helper()
	fileStore, err := state.OpenFileStore(filepath.Join(t.TempDir(), "state.json"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { fileStore.Close() })
	st := statetest.Rerunning(fileStore)
	now := time.Date(2026, 11, 2, 6, 0, 0, 0, time.UTC)
	tally := New(st, Config{CeilingUSD: 100, InputPerMtokUSD: 1_000_000, OutputPerMtokUSD: 0})
	tally.SetClock(func() time.Time { return now })
	l := NewLatch(st, tally, budget)
	l.SetClock(func() time.Time { return now })
	return l, tally, st, &now
}

func allowed(t *testing.T, l *Latch) bool {
	t.Helper()
	ok, err := l.Allowed(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	return ok
}

func auditActions(t *testing.T, st state.Store) []string {
	t.Helper()
	var out []string
	_ = st.View(context.Background(), func(tx state.Tx) error {
		for _, e := range tx.ListAudit(0, "") {
			out = append(out, e.Action+":"+e.Actor)
		}
		return nil
	})
	return out
}

func TestLatchTripsAtTheBudgetAndStaysOffUntilAnAuditedReset(t *testing.T) {
	ctx := context.Background()
	l, tally, st, _ := newLatch(t, 2)
	if !allowed(t, l) {
		t.Fatal("under budget the tutor may run")
	}
	if _, err := tally.Reserve(ctx, 2, 0); err != nil { // US $2.00
		t.Fatal(err)
	}
	if allowed(t, l) {
		t.Fatal("at the budget the tutor must switch off")
	}
	if allowed(t, l) {
		t.Fatal("it must stay off")
	}
	if got := auditActions(t, st); len(got) != 1 || got[0] != "tutor.latch:system" {
		t.Errorf("one audit entry however often it is checked: %v", got)
	}
	if err := l.Reset(ctx, "owner@example.org"); err != nil {
		t.Fatal(err)
	}
	if !allowed(t, l) {
		t.Error("an authorized reset must turn it back on, even with this month's spend still over budget")
	}
	if got := auditActions(t, st); len(got) != 2 || got[0] != "tutor.reset:owner@example.org" {
		t.Errorf("the reset must be audited: %v", got)
	}
}

func TestRepeatedBudgetSignalsDoNotUndoAReset(t *testing.T) {
	ctx := context.Background()
	l, _, _, now := newLatch(t, 0)
	if err := l.Trip(ctx, "budget notification"); err != nil {
		t.Fatal(err)
	}
	if err := l.Trip(ctx, "budget notification"); err != nil { // a repeat
		t.Fatal(err)
	}
	if allowed(t, l) {
		t.Fatal("a budget signal must switch the tutor off")
	}
	if err := l.Reset(ctx, "owner@example.org"); err != nil {
		t.Fatal(err)
	}
	if err := l.Trip(ctx, "budget notification"); err != nil { // repeats arrive for days
		t.Fatal(err)
	}
	if !allowed(t, l) {
		t.Error("a repeat of the same month's signal must not undo the reset")
	}
	*now = now.AddDate(0, 1, 0)
	if err := l.Trip(ctx, "budget notification"); err != nil {
		t.Fatal(err)
	}
	if allowed(t, l) {
		t.Error("next month's signal must switch it off again")
	}
}

type brokenView struct{ state.Store }

func (brokenView) View(context.Context, func(state.Tx) error) error { return errors.New("store down") }

func TestLatchFailsClosedWhenItCannotBeRead(t *testing.T) {
	l, _, st, _ := newLatch(t, 2)
	l.store = brokenView{st}
	if ok, err := l.Allowed(context.Background()); ok || err == nil {
		t.Errorf("unknown state must refuse: %v %v", ok, err)
	}
}
