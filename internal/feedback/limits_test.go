// SPEC: FR-I18N-12 (SPEC-016 owner decision 2026-11-21): each learner may send at most 10 reports a day and
// 50 in total; an admin may change both, and the change is audited.
package feedback

import (
	"errors"
	"strings"
	"testing"
	"time"

	"ai-foundations-coach/internal/state"
)

// send submits one clean report, moving the clock on an hour first so the hourly limit never interferes.
func send(t *testing.T, s *Service, now *time.Time, who string) error {
	t.Helper()
	*now = now.Add(time.Hour)
	return s.Submit(bg, who, "", clean)
}

func TestDailyLimitIsTenStoredReportsPerLearner(t *testing.T) {
	s, _, now := newSvc(t)
	*now = time.Date(2026, 11, 20, 17, 31, 0, 0, time.UTC) // 23:01 IST on 20 Nov; the first send moves to 00:01 IST on 21 Nov
	for i := 0; i < 10; i++ {
		if err := send(t, s, now, "BETA-A"); err != nil {
			t.Fatalf("report %d: %v", i+1, err)
		}
	}
	if err := send(t, s, now, "BETA-A"); !errors.Is(err, ErrDailyLimit) {
		t.Fatalf("11th report the same day: got %v", err)
	}
	if err := send(t, s, now, "BETA-B"); err != nil {
		t.Errorf("another learner is not affected: %v", err)
	}
	*now = now.Add(24 * time.Hour)
	if err := send(t, s, now, "BETA-A"); err != nil {
		t.Errorf("a new IST day resets the daily count: %v", err)
	}
}

func TestTotalLimitIsFiftyAndRefusedMessagesDoNotCount(t *testing.T) {
	s, _, now := newSvc(t)
	bad := clean
	bad.Message = "call me on 9876543210"
	var pii *PIIError
	if err := s.Submit(bg, "BETA-A", "", bad); !errors.As(err, &pii) {
		t.Fatal(err)
	}
	for i := 0; i < 50; i++ {
		if i%10 == 0 {
			*now = now.Add(24 * time.Hour)
		}
		if err := send(t, s, now, "BETA-A"); err != nil {
			t.Fatalf("report %d: %v", i+1, err)
		}
	}
	*now = now.Add(24 * time.Hour)
	if err := send(t, s, now, "BETA-A"); !errors.Is(err, ErrTotalLimit) {
		t.Fatalf("51st report: got %v", err)
	}
}

func TestAdminCanRaiseTheLimitsAndTheChangeIsAudited(t *testing.T) {
	s, st, now := newSvc(t)
	if l, _ := s.GetLimits(bg); l != (Limits{Daily: 10, Total: 50}) {
		t.Fatalf("defaults: %+v", l)
	}
	for _, bad := range []Limits{{0, 50}, {10, 0}, {101, 200}, {10, 1001}, {20, 10}} {
		if err := s.SetLimits(bg, "admin@example.org", bad); !errors.Is(err, ErrInvalid) {
			t.Errorf("%+v: got %v", bad, err)
		}
	}
	if err := s.SetLimits(bg, "admin@example.org", Limits{Daily: 12, Total: 80}); err != nil {
		t.Fatal(err)
	}
	if l, _ := s.GetLimits(bg); l != (Limits{Daily: 12, Total: 80}) {
		t.Errorf("after change: %+v", l)
	}
	for i := 0; i < 12; i++ {
		if err := send(t, s, now, "BETA-A"); err != nil {
			t.Fatalf("report %d under the raised limit: %v", i+1, err)
		}
	}
	var found bool
	_ = st.View(bg, func(tx state.Tx) error {
		for _, e := range tx.ListAudit(10, "") {
			found = found || (e.Action == "feedback.limits" && strings.Contains(e.Detail, "daily=10->12 total=50->80"))
		}
		return nil
	})
	if !found {
		t.Error("no audit entry for the limit change")
	}
}

func TestSweepDropsYesterdaysDailyCounts(t *testing.T) {
	s, st, now := newSvc(t)
	if err := send(t, s, now, "BETA-A"); err != nil {
		t.Fatal(err)
	}
	if err := s.Sweep(bg, now.Add(48*time.Hour)); err != nil {
		t.Fatal(err)
	}
	_ = st.View(bg, func(tx state.Tx) error {
		if n := len(tx.ListCounters(dayPrefix)); n != 0 {
			t.Errorf("%d old daily counters left", n)
		}
		if tx.GetCounter(totalKey("BETA-A")) != 1 {
			t.Error("the total count must survive the sweep")
		}
		return nil
	})
}
