// SPEC: FR-025, SC-010
package spend

import (
	"context"
	"errors"
	"path/filepath"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"ai-foundations-coach/internal/state"
	"ai-foundations-coach/internal/state/statetest"
)

var bg = context.Background()

type clock struct{ t atomic.Int64 }

func (c *clock) Now() time.Time { return time.Unix(0, c.t.Load()).UTC() }

func newTally(t *testing.T, ceiling float64) (*Tally, state.Store, *clock) {
	t.Helper()
	fileStore, err := state.OpenFileStore(filepath.Join(t.TempDir(), "state.json"))
	if err != nil {
		t.Fatal(err)
	}
	st := statetest.Rerunning(fileStore)
	t.Cleanup(func() { st.Close() })
	c := &clock{}
	c.t.Store(time.Date(2026, 11, 2, 6, 0, 0, 0, time.UTC).UnixNano()) // 11:30 IST
	tl := New(st, Config{CeilingUSD: ceiling, InputPerMtokUSD: 0.15, OutputPerMtokUSD: 0.60})
	tl.SetClock(c.Now)
	return tl, st, c
}

func counter(t *testing.T, st state.Store, key string) int64 {
	t.Helper()
	var v int64
	_ = st.View(bg, func(tx state.Tx) error { v = tx.GetCounter(key); return nil })
	return v
}

func TestReserveThenSettleKeepsTheActualCost(t *testing.T) {
	tl, st, _ := newTally(t, 1.00)
	r, err := tl.Reserve(bg, 1000, 800) // 150 + 480 micro-dollars
	if err != nil {
		t.Fatal(err)
	}
	if got := counter(t, st, "spend:2026-11-02"); got != 630 {
		t.Fatalf("reserved %d, want 630", got)
	}
	r.Settle(bg, 1000, 100) // 150 + 60
	if got := counter(t, st, "spend:2026-11-02"); got != 210 {
		t.Errorf("after settling lower: %d, want 210", got)
	}
	r2, _ := tl.Reserve(bg, 0, 100) // 60
	r2.Settle(bg, 0, 200)           // 120: more than reserved
	if got := counter(t, st, "spend:2026-11-02"); got != 330 {
		t.Errorf("after settling higher: %d, want 330", got)
	}
}

func TestSettlingTwiceCountsOnce(t *testing.T) {
	tl, st, _ := newTally(t, 1.00)
	r, _ := tl.Reserve(bg, 1000, 0)
	r.Settle(bg, 0, 0)
	r.Settle(bg, 1000, 1000)
	if got := counter(t, st, "spend:2026-11-02"); got != 0 {
		t.Errorf("a second Settle must do nothing: %d", got)
	}
}

func TestCostRoundsUpToWholeMicroDollars(t *testing.T) {
	tl, st, _ := newTally(t, 1.00)
	if _, err := tl.Reserve(bg, 1, 0); err != nil { // 0.15 micro-dollars rounds to 1
		t.Fatal(err)
	}
	if got := counter(t, st, "spend:2026-11-02"); got != 1 {
		t.Errorf("one token: %d, want 1", got)
	}
}

func TestReserveRefusedAtTheCeiling(t *testing.T) {
	tl, st, _ := newTally(t, 0.001)                      // 1000 micro-dollars
	if _, err := tl.Reserve(bg, 1000, 800); err != nil { // 630
		t.Fatal(err)
	}
	if _, err := tl.Reserve(bg, 1000, 800); !errors.Is(err, ErrCeilingReached) { // would be 1260
		t.Fatalf("over the ceiling: %v", err)
	}
	if got := counter(t, st, "spend:2026-11-02"); got != 630 {
		t.Errorf("a refused reservation must not count: %d", got)
	}
}

// SC-010: real spend can never pass the ceiling, however many requests arrive at once.
func TestConcurrentReservationsNeverExceedTheCeiling(t *testing.T) {
	tl, st, _ := newTally(t, 0.01) // 10,000 micro-dollars; 630 each fits 15 times
	var wg sync.WaitGroup
	var ok atomic.Int32
	for i := 0; i < 100; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if _, err := tl.Reserve(bg, 1000, 800); err == nil {
				ok.Add(1)
			}
		}()
	}
	wg.Wait()
	if ok.Load() != 15 {
		t.Errorf("granted %d, want 15", ok.Load())
	}
	if got := counter(t, st, "spend:2026-11-02"); got > 10000 {
		t.Errorf("tally %d is above the ceiling", got)
	}
}

func TestCeilingResetsAtISTMidnight(t *testing.T) {
	tl, _, c := newTally(t, 0.001)
	if _, err := tl.Reserve(bg, 1000, 800); err != nil {
		t.Fatal(err)
	}
	if _, err := tl.Reserve(bg, 1000, 800); !errors.Is(err, ErrCeilingReached) {
		t.Fatalf("setup: %v", err)
	}
	c.t.Store(time.Date(2026, 11, 2, 18, 29, 0, 0, time.UTC).UnixNano()) // 23:59 IST
	if _, err := tl.Reserve(bg, 1000, 800); !errors.Is(err, ErrCeilingReached) {
		t.Errorf("still the same IST day: %v", err)
	}
	c.t.Store(time.Date(2026, 11, 2, 18, 30, 0, 0, time.UTC).UnixNano()) // 00:00 IST
	if _, err := tl.Reserve(bg, 1000, 800); err != nil {
		t.Errorf("a new IST day starts a new tally: %v", err)
	}
}

func TestSettleAfterMidnightAdjustsTheDayItWasReservedOn(t *testing.T) {
	tl, st, c := newTally(t, 1.00)
	r, _ := tl.Reserve(bg, 1000, 800)
	c.t.Store(time.Date(2026, 11, 3, 0, 0, 0, 0, time.UTC).UnixNano())
	r.Settle(bg, 1000, 0)
	if got := counter(t, st, "spend:2026-11-02"); got != 150 {
		t.Errorf("reservation day: %d, want 150", got)
	}
	if got := counter(t, st, "spend:2026-11-03"); got != 0 {
		t.Errorf("next day must be untouched: %d", got)
	}
}

func TestStoreErrorFailsClosed(t *testing.T) {
	tl, st, _ := newTally(t, 1.00)
	st.Close()
	if _, err := tl.Reserve(bg, 1, 1); err == nil || errors.Is(err, ErrCeilingReached) {
		t.Errorf("a store failure must be an error, not a free pass: %v", err)
	}
}

func TestDayAndMonthReadings(t *testing.T) {
	tl, st, c := newTally(t, 1.00)
	if _, err := tl.Reserve(bg, 1000, 800); err != nil {
		t.Fatal(err)
	}
	c.t.Store(time.Date(2026, 11, 3, 6, 0, 0, 0, time.UTC).UnixNano())
	if _, err := tl.Reserve(bg, 0, 100); err != nil {
		t.Fatal(err)
	}
	_ = st.Do(bg, func(tx state.Tx) error { tx.AddCounter("spend:2026-10-31", 999); return nil })
	if got, _ := tl.Day(bg, "2026-11-02"); got != 630 {
		t.Errorf("day: %d", got)
	}
	m, err := tl.Month(bg, "2026-11")
	if err != nil || len(m) != 2 || m["2026-11-02"] != 630 || m["2026-11-03"] != 60 {
		t.Errorf("month: %v %v", m, err)
	}
	if tl.CeilingMicro() != 1_000_000 {
		t.Errorf("ceiling: %d", tl.CeilingMicro())
	}
}
