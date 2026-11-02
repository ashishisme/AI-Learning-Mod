// SPEC: FR-047..FR-053, SC-016
package feedback

import (
	"context"
	"encoding/json"
	"errors"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"ai-foundations-coach/internal/state"
	"ai-foundations-coach/internal/state/statetest"
)

type stubAuditor struct{ v Verdict }

func (s stubAuditor) Review(context.Context, string) (Verdict, error) { return s.v, nil }

func newSvc(t *testing.T) (*Service, state.Store, *time.Time) {
	t.Helper()
	fileStore, err := state.OpenFileStore(filepath.Join(t.TempDir(), "state.json"))
	if err != nil {
		t.Fatal(err)
	}
	st := statetest.Rerunning(fileStore)
	t.Cleanup(func() { st.Close() })
	now := time.Date(2026, 11, 2, 6, 0, 0, 0, time.UTC)
	s := NewService(st, stubAuditor{Verdict{Pass: true}})
	s.SetClock(func() time.Time { return now })
	return s, st, &now
}

func TestValidation(t *testing.T) {
	s, _, _ := newSvc(t)
	mut := map[string]func(*Input){
		"rating 0":       func(i *Input) { i.Rating = 0 },
		"rating 6":       func(i *Input) { i.Rating = 6 },
		"bad category":   func(i *Input) { i.Category = "rant" },
		"bad mode":       func(i *Input) { i.Mode = "pirate" },
		"long message":   func(i *Input) { i.Message = strings.Repeat("a", 501) },
		"bad lesson":     func(i *Input) { i.LessonID = "../etc" },
		"long version":   func(i *Input) { i.AppVersion = strings.Repeat("1", 21) },
		"version spaces": func(i *Input) { i.AppVersion = "call me" },
	}
	for name, m := range mut {
		in := clean
		m(&in)
		if err := s.Submit(bg, "BETA-A", "", in); !errors.Is(err, ErrInvalid) {
			t.Errorf("%s: %v", name, err)
		}
	}
	in := clean
	in.Message = strings.Repeat("क", 500) // 500 characters, not bytes
	if err := s.Submit(bg, "BETA-A", "", in); err != nil {
		t.Errorf("500 runes must be accepted: %v", err)
	}
}

func TestPersonalDetailsInTheLessonFieldAreRefusedToo(t *testing.T) {
	s, _, _ := newSvc(t)
	in := clean
	in.LessonID = "call-9876543210"
	var pii *PIIError
	if err := s.Submit(bg, "BETA-A", "", in); !errors.As(err, &pii) {
		t.Errorf("the lesson id is client text as well: %v", err)
	}
}

func TestHourlyLimitCountsRefusedMessagesAndHoldsNoIdentity(t *testing.T) {
	s, st, now := newSvc(t)
	bad := clean
	bad.Message = "9876543210"
	for i := 0; i < 2; i++ {
		var pii *PIIError
		if err := s.Submit(bg, "BETA-AAAA-AAAA", "", bad); !errors.As(err, &pii) {
			t.Fatal(err)
		}
	}
	for i := 0; i < 3; i++ {
		if err := s.Submit(bg, "BETA-AAAA-AAAA", "", clean); err != nil {
			t.Fatal(err)
		}
	}
	if err := s.Submit(bg, "BETA-AAAA-AAAA", "", clean); !errors.Is(err, ErrLimit) {
		t.Fatalf("sixth: %v", err)
	}
	if err := s.Submit(bg, "BETA-BBBB-BBBB", "", clean); err != nil {
		t.Errorf("another account is unaffected: %v", err)
	}
	_ = st.View(bg, func(tx state.Tx) error {
		for k := range tx.ListCounters(ratePrefix) {
			if strings.Contains(k, "BETA") {
				t.Errorf("rate key holds the Beta ID: %s", k)
			}
		}
		raw, _ := json.Marshal(tx.ListFeedback())
		if strings.Contains(string(raw), "BETA") || strings.Contains(string(raw), "betaId") {
			t.Errorf("record holds identity: %s", raw)
		}
		return nil
	})
	*now = now.Add(time.Hour)
	if err := s.Submit(bg, "BETA-AAAA-AAAA", "", clean); err != nil {
		t.Errorf("a new hour: %v", err)
	}
}

func seedPassed(t *testing.T, s *Service, label string, in Input) {
	t.Helper()
	if err := s.Submit(bg, "BETA-"+label+in.Category, label, in); err != nil {
		t.Fatal(err)
	}
	s.ProcessWaiting(bg)
}

func TestFiltersStatusUnreadAndDelete(t *testing.T) {
	s, st, _ := newSvc(t)
	a, b := clean, clean
	a.Rating, a.Category, a.LessonID = 5, "bug", "1-intro"
	b.Rating, b.Category, b.LessonID = 2, "idea", "2-symbolic"
	seedPassed(t, s, "A", a)
	seedPassed(t, s, "B", b)

	check := func(name string, f Filter, want int) {
		t.Helper()
		items, total, _, _, err := s.List(bg, f)
		if err != nil || len(items) != want || total != want {
			t.Errorf("%s: %d items, total %d, %v", name, len(items), total, err)
		}
	}
	check("all", Filter{}, 2)
	check("category", Filter{Category: "bug"}, 1)
	check("rating", Filter{Rating: 2}, 1)
	check("lesson", Filter{LessonID: "1-intro"}, 1)
	check("label", Filter{Label: "B"}, 1)
	check("status", Filter{Status: "read"}, 0)

	items, _, unread, _, _ := s.List(bg, Filter{Limit: 1})
	if unread != 2 || len(items) != 1 {
		t.Errorf("unread %d, limit: %d", unread, len(items))
	}
	id := items[0].ID
	if err := s.SetStatus(bg, "o@x.org", id, "read"); err != nil {
		t.Fatal(err)
	}
	if n, _ := s.Unread(bg); n != 1 {
		t.Errorf("unread after read: %d", n)
	}
	if err := s.SetStatus(bg, "o@x.org", id, "done"); !errors.Is(err, ErrInvalid) {
		t.Errorf("bad status: %v", err)
	}
	if err := s.SetStatus(bg, "o@x.org", "nope", "read"); !errors.Is(err, ErrNotFound) {
		t.Errorf("unknown: %v", err)
	}
	if err := s.Delete(bg, "o@x.org", id); err != nil {
		t.Fatal(err)
	}
	check("after delete", Filter{}, 1)
	_ = st.View(bg, func(tx state.Tx) error {
		var actions []string
		for _, e := range tx.ListAudit(10, "") {
			actions = append(actions, e.Action)
			if e.Actor != "o@x.org" || strings.Contains(e.Detail+e.Target, clean.Message) {
				t.Errorf("audit entry: %+v", e)
			}
		}
		if strings.Join(actions, ",") != "feedback.delete,feedback.status" {
			t.Errorf("audit: %v", actions)
		}
		return nil
	})
}

func TestAdminsCannotActOnHeldItems(t *testing.T) {
	s, st, _ := newSvc(t)
	_ = s.Submit(bg, "BETA-A", "", clean)
	var id string
	_ = st.View(bg, func(tx state.Tx) error { id = tx.ListFeedback()[0].ID; return nil })
	if err := s.SetStatus(bg, "o@x.org", id, "read"); !errors.Is(err, ErrNotFound) {
		t.Errorf("status on a waiting item: %v", err)
	}
	if err := s.Delete(bg, "o@x.org", id); !errors.Is(err, ErrNotFound) {
		t.Errorf("delete on a waiting item: %v", err)
	}
}

func TestCSVIsFormulaSafePassedOnlyAndAudited(t *testing.T) {
	s, st, _ := newSvc(t)
	in := clean
	in.Message = "=SUM(A1:A2)"
	seedPassed(t, s, "A", in)
	_ = s.Submit(bg, "BETA-Z", "", Input{Rating: 1, Category: "other", Message: "still waiting here"})
	raw, err := s.CSV(bg, "o@x.org", Filter{})
	if err != nil {
		t.Fatal(err)
	}
	out := string(raw)
	if !strings.HasPrefix(out, "at,rating,category,message,label,lessonId,mode,appVersion,status\n") || !strings.Contains(out, "'=SUM") {
		t.Errorf("csv: %s", out)
	}
	if strings.Contains(out, "still waiting") {
		t.Error("a waiting item must not be exported")
	}
	_ = st.View(bg, func(tx state.Tx) error {
		if a := tx.ListAudit(1, ""); len(a) != 1 || a[0].Action != "feedback.export" || a[0].Detail != "count=1" {
			t.Errorf("audit: %+v", a)
		}
		return nil
	})
}

func TestSweepRetention(t *testing.T) {
	s, st, now := newSvc(t)
	seedPassed(t, s, "A", clean) // passed, day 0
	*now = now.Add(100 * 24 * time.Hour)
	_ = s.Submit(bg, "BETA-Z", "", clean) // waiting, day 100; not processed
	sweep := func() {
		if err := s.Sweep(bg, s.now()); err != nil {
			t.Fatal(err)
		}
	}
	count := func() int {
		n := 0
		_ = st.View(bg, func(tx state.Tx) error { n = len(tx.ListFeedback()); return nil })
		return n
	}
	sweep()
	if count() != 2 {
		t.Fatalf("nothing is old enough yet: %d", count())
	}
	*now = now.Add(8 * 24 * time.Hour) // waiting item is 8 days old
	sweep()
	if count() != 1 {
		t.Errorf("a waiting item older than 7 days must go: %d", count())
	}
	*now = now.Add(73 * 24 * time.Hour) // passed item is 181 days old
	sweep()
	if count() != 0 {
		t.Errorf("an item older than 180 days must go: %d", count())
	}
	_ = st.View(bg, func(tx state.Tx) error {
		if len(tx.ListCounters(ratePrefix)) != 0 {
			t.Errorf("finished rate counters must go: %v", tx.ListCounters(ratePrefix))
		}
		return nil
	})
}
