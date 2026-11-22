// SPEC: FR-040, FR-042, FR-043, FR-044, SC-016
package usage

import (
	"context"
	"encoding/json"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"ai-foundations-coach/internal/auth"
	"ai-foundations-coach/internal/state"
	"ai-foundations-coach/internal/state/statetest"
)

var bg = context.Background()

type clock struct{ t atomic.Int64 }

func (c *clock) Now() time.Time          { return time.Unix(0, c.t.Load()).UTC() }
func (c *clock) Set(t time.Time)         { c.t.Store(t.UnixNano()) }
func (c *clock) Advance(d time.Duration) { c.t.Add(int64(d)) }

func newRec(t *testing.T) (*Recorder, state.Store, *clock) {
	t.Helper()
	fileStore, err := state.OpenFileStore(filepath.Join(t.TempDir(), "state.json"))
	if err != nil {
		t.Fatal(err)
	}
	st := statetest.Rerunning(fileStore)
	t.Cleanup(func() { st.Close() })
	c := &clock{}
	c.Set(time.Date(2026, 11, 2, 6, 0, 0, 0, time.UTC)) // 11:30 IST
	r := New(st)
	r.SetClock(c.Now)
	return r, st, c
}

func addAccount(t *testing.T, st state.Store, id string, lastSeen *time.Time) {
	t.Helper()
	_ = st.Do(bg, func(tx state.Tx) error {
		tx.PutAccount(state.Account{BetaID: id, Status: state.AccountActive, LastSeenAt: lastSeen})
		return nil
	})
}

func counters(t *testing.T, st state.Store) map[string]int64 {
	t.Helper()
	var out map[string]int64
	_ = st.View(bg, func(tx state.Tx) error { out = tx.ListCounters(""); return nil })
	return out
}

func TestConcurrentIncAndFlush(t *testing.T) {
	r, st, _ := newRec(t)
	var wg sync.WaitGroup
	for i := 0; i < 200; i++ {
		wg.Add(1)
		go func() { defer wg.Done(); r.Inc(Requests) }()
	}
	wg.Wait()
	if got := counters(t, st)["usage:2026-11-02:req"]; got != 0 {
		t.Fatalf("nothing is written before Flush, got %d", got)
	}
	if err := r.Flush(bg); err != nil {
		t.Fatal(err)
	}
	if got := counters(t, st)["usage:2026-11-02:req"]; got != 200 {
		t.Fatalf("flushed %d, want 200", got)
	}
	r.Inc(Requests)
	_ = r.Flush(bg)
	if got := counters(t, st)["usage:2026-11-02:req"]; got != 201 {
		t.Errorf("a second flush must add only the new count: %d", got)
	}
}

func TestDailyActiveCountsOnceAndSurvivesRestart(t *testing.T) {
	r, st, c := newRec(t)
	addAccount(t, st, "BETA-AAAA-AAAA", nil)
	r.Seen(bg, "BETA-AAAA-AAAA")
	r.Seen(bg, "BETA-AAAA-AAAA")
	c.Advance(time.Hour)
	r.Seen(bg, "BETA-AAAA-AAAA")
	_ = r.Flush(bg)
	if got := counters(t, st)["usage:2026-11-02:dau"]; got != 1 {
		t.Fatalf("one account, one day: %d", got)
	}

	// Restart: a fresh recorder must not count the same account again today.
	r2 := New(st)
	r2.SetClock(c.Now)
	r2.Seen(bg, "BETA-AAAA-AAAA")
	_ = r2.Flush(bg)
	if got := counters(t, st)["usage:2026-11-02:dau"]; got != 1 {
		t.Errorf("after a restart the same day: %d, want 1", got)
	}

	// IST midnight starts a new day.
	c.Set(time.Date(2026, 11, 2, 18, 30, 0, 0, time.UTC))
	r2.Seen(bg, "BETA-AAAA-AAAA")
	_ = r2.Flush(bg)
	if got := counters(t, st)["usage:2026-11-03:dau"]; got != 1 {
		t.Errorf("new IST day: %d, want 1", got)
	}
}

func TestLastSeenIsFlushedAtMinutePrecision(t *testing.T) {
	r, st, c := newRec(t)
	addAccount(t, st, "BETA-AAAA-AAAA", nil)
	c.Advance(37 * time.Second)
	r.Seen(bg, "BETA-AAAA-AAAA")
	r.Seen(bg, "BETA-GONE-GONE") // an account that no longer exists is simply skipped
	if err := r.Flush(bg); err != nil {
		t.Fatal(err)
	}
	_ = st.View(bg, func(tx state.Tx) error {
		a, _ := tx.GetAccount("BETA-AAAA-AAAA")
		if a.LastSeenAt == nil || a.LastSeenAt.Second() != 0 || a.LastSeenAt.Nanosecond() != 0 {
			t.Errorf("last seen: %v", a.LastSeenAt)
		}
		if _, ok := tx.GetAccount("BETA-GONE-GONE"); ok {
			t.Error("Seen must not create accounts")
		}
		return nil
	})
}

func TestReportMergesFlushedAndPending(t *testing.T) {
	r, st, c := newRec(t)
	_ = st.Do(bg, func(tx state.Tx) error {
		tx.AddCounter("usage:2026-11-01:req", 5)
		tx.AddCounter("usage:2026-11-01:lesson:1-intro", 2)
		tx.AddCounter("usage:2026-10-20:req", 7)  // inside 30 days, outside 7
		tx.AddCounter("usage:2026-09-01:req", 99) // outside 30 days
		tx.AddCounter("spend:2026-11-01", 1234)   // not a usage counter
		return nil
	})
	r.Inc(Requests)
	r.Inc(Errors5xx)
	r.Inc(SigninOK)
	r.Inc(SigninFail)
	r.Inc(Activations)
	r.Inc(Quiz)
	r.Inc(TutorQ)
	r.IncLesson("1-intro")
	r.IncLesson("2-symbolic")
	r.IncLesson("2-symbolic")
	addAccount(t, st, "BETA-AAAA-AAAA", nil)
	r.Seen(bg, "BETA-AAAA-AAAA")
	seen := New(st) // daily-active counts reach the store at flush; the rest above stay pending
	seen.SetClock(c.Now)
	seen.Seen(bg, "BETA-AAAA-AAAA")
	if err := seen.Flush(bg); err != nil {
		t.Fatal(err)
	}

	rep, err := r.Report(bg, 7)
	if err != nil {
		t.Fatal(err)
	}
	if len(rep.Series) != 7 || rep.Series[6].Date != "2026-11-02" || rep.Series[5].Date != "2026-11-01" {
		t.Fatalf("series dates: %+v", rep.Series)
	}
	today := rep.Series[6]
	want := Measures{DAU: 1, SigninOK: 1, SigninFail: 1, Activations: 1, Quiz: 1, TutorQuestions: 1, Requests: 1, Errors5xx: 1}
	if today.Measures != want {
		t.Errorf("today: %+v", today.Measures)
	}
	if rep.Totals.Today.Requests != 1 || rep.Totals.Last7d.Requests != 6 || rep.Totals.Last30d.Requests != 13 {
		t.Errorf("totals: %+v", rep.Totals)
	}
	if len(rep.Lessons) != 2 || rep.Lessons[0].LessonID != "1-intro" || rep.Lessons[0].Views != 3 || rep.Lessons[1].Views != 2 {
		t.Errorf("lessons: %+v", rep.Lessons)
	}
	rep, _ = r.Report(bg, 30)
	if len(rep.Series) != 30 {
		t.Errorf("30 days: %d", len(rep.Series))
	}
	_ = c
}

func TestEmptyReportIsZeroesNotAnError(t *testing.T) {
	r, _, _ := newRec(t)
	rep, err := r.Report(bg, 7)
	if err != nil || len(rep.Series) != 7 || rep.Lessons == nil || len(rep.Lessons) != 0 {
		t.Errorf("%+v %v", rep, err)
	}
	raw, _ := json.Marshal(rep)
	if !strings.Contains(string(raw), `"lessons":[]`) || !strings.Contains(string(raw), `"errors5xx":0`) {
		t.Errorf("json: %s", raw)
	}
}

func TestDecorateMergesMemoryAndFlagsActiveNow(t *testing.T) {
	r, st, c := newRec(t)
	addAccount(t, st, "BETA-AAAA-AAAA", nil)
	old := c.Now().Add(-time.Hour)
	rows := []auth.AccountRow{{BetaID: "BETA-AAAA-AAAA"}, {BetaID: "BETA-BBBB-BBBB", LastSeenAt: &old}, {BetaID: "BETA-CCCC-CCCC"}}
	r.Seen(bg, "BETA-AAAA-AAAA")
	r.Decorate(rows)
	if !rows[0].ActiveNow || rows[0].LastSeenAt == nil {
		t.Errorf("just seen: %+v", rows[0])
	}
	if rows[1].ActiveNow || !rows[1].LastSeenAt.Equal(old) {
		t.Errorf("seen an hour ago: %+v", rows[1])
	}
	if rows[2].ActiveNow || rows[2].LastSeenAt != nil {
		t.Errorf("never seen: %+v", rows[2])
	}
	c.Advance(ActiveNowWindow + time.Minute)
	r.Decorate(rows)
	if rows[0].ActiveNow {
		t.Error("the active-now window is 5 minutes")
	}
}

func TestFailedFlushKeepsCounts(t *testing.T) {
	r, st, _ := newRec(t)
	r.Inc(Requests)
	st.Close()
	if err := r.Flush(bg); err == nil {
		t.Fatal("a closed store must fail")
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	if len(r.delta) != 1 {
		t.Errorf("the count must be kept for the next try: %v", r.delta)
	}
}

// SC-016: counter keys hold dates, measures and lesson ids only.
func TestCounterKeysHoldNoIdentity(t *testing.T) {
	r, st, _ := newRec(t)
	addAccount(t, st, "BETA-AAAA-AAAA", nil)
	for _, m := range []string{Requests, Errors5xx, SigninOK, SigninFail, Activations, Quiz, TutorQ} {
		r.Inc(m)
	}
	r.IncLesson("1-intro")
	r.Seen(bg, "BETA-AAAA-AAAA")
	_ = r.Flush(bg)
	shape := regexp.MustCompile(`^usage:\d{4}-\d{2}-\d{2}:(req|err5xx|signin_ok|signin_fail|activation|quiz|tutor_q|dau|lesson:[a-z0-9_-]+)$`)
	for k := range counters(t, st) {
		if !shape.MatchString(k) || strings.Contains(k, "BETA") {
			t.Errorf("unexpected counter key %q", k)
		}
	}
}

func TestNilRecorderIsSafe(t *testing.T) {
	var r *Recorder
	r.Inc(Requests)
	r.IncLesson("x")
	r.Seen(bg, "x")
	r.Decorate(nil)
	if err := r.Flush(bg); err != nil {
		t.Error(err)
	}
}

func TestSweepDropsOldCounters(t *testing.T) {
	r, st, c := newRec(t)
	_ = st.Do(bg, func(tx state.Tx) error {
		tx.AddCounter("usage:2025-01-01:req", 1)
		tx.AddCounter("spend:2025-01-01", 1)
		tx.AddCounter("usage:2026-10-01:req", 1)
		tx.AddCounter("spend:2026-10-01", 1)
		tx.AddCounter("other:2025-01-01", 1)
		return nil
	})
	if err := r.Sweep(bg, c.Now()); err != nil {
		t.Fatal(err)
	}
	got := counters(t, st)
	if _, ok := got["usage:2025-01-01:req"]; ok {
		t.Error("old usage counter kept")
	}
	if _, ok := got["spend:2025-01-01"]; ok {
		t.Error("old spend counter kept")
	}
	for _, keep := range []string{"usage:2026-10-01:req", "spend:2026-10-01", "other:2025-01-01"} {
		if _, ok := got[keep]; !ok {
			t.Errorf("%s must stay", keep)
		}
	}
}

// Two instances sharing a store must count one account once a day, and each must see the other's
// flushed activity as "active now".
func TestInstancesSharingAStoreCountAnAccountOnce(t *testing.T) {
	one, st, c := newRec(t)
	two := New(st)
	two.SetClock(c.Now)
	addAccount(t, st, "BETA-AAAA-AAAA", nil)
	one.Seen(bg, "BETA-AAAA-AAAA")
	two.Seen(bg, "BETA-AAAA-AAAA")
	c.Advance(time.Minute)
	two.Seen(bg, "BETA-AAAA-AAAA")
	if err := one.Flush(bg); err != nil {
		t.Fatal(err)
	}
	if err := two.Flush(bg); err != nil {
		t.Fatal(err)
	}
	if got := counters(t, st)["usage:2026-11-02:dau"]; got != 1 {
		t.Errorf("one account on two instances: %d, want 1", got)
	}
	var seen *time.Time
	_ = st.View(bg, func(tx state.Tx) error {
		a, _ := tx.GetAccount("BETA-AAAA-AAAA")
		seen = a.LastSeenAt
		return nil
	})
	three := New(st)
	three.SetClock(c.Now)
	rows := []auth.AccountRow{{BetaID: "BETA-AAAA-AAAA", LastSeenAt: seen}}
	three.Decorate(rows)
	if !rows[0].ActiveNow {
		t.Error("an instance must see activity flushed by another")
	}
}
