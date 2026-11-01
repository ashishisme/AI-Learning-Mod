// SPEC: FR-044, FR-045
package cost

import (
	"context"
	"encoding/json"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"ai-foundations-coach/internal/spend"
	"ai-foundations-coach/internal/state"
)

var bg = context.Background()

func newProv(t *testing.T, at time.Time, budget float64, counters map[string]int64, h HostingSource) *Provider {
	t.Helper()
	st, err := state.OpenFileStore(filepath.Join(t.TempDir(), "state.json"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { st.Close() })
	_ = st.Do(bg, func(tx state.Tx) error {
		for k, v := range counters {
			tx.AddCounter(k, v)
		}
		return nil
	})
	p := NewProvider(spend.New(st, spend.Config{CeilingUSD: 1, InputPerMtokUSD: 0.15, OutputPerMtokUSD: 0.60}), budget, h)
	p.SetClock(func() time.Time { return at })
	return p
}

var nov10 = time.Date(2026, 11, 10, 6, 0, 0, 0, time.UTC) // 11:30 IST on the 10th

func TestMonthToDateAndToday(t *testing.T) {
	p := newProv(t, nov10, 30, map[string]int64{
		"spend:2026-11-10": 120_000, "spend:2026-11-01": 500_000, "spend:2026-10-31": 900_000,
	}, nil)
	s, err := p.Snapshot(bg)
	if err != nil {
		t.Fatal(err)
	}
	a := s.AI
	if a.TodayUSD != 0.12 || a.MonthToDateUSD != 0.62 || a.CeilingUSD != 1 || a.BudgetUSD != 30 || !a.Estimated {
		t.Errorf("%+v", a)
	}
	if len(a.Daily) != 2 || a.Daily[0].Date != "2026-11-01" || a.Daily[1].USD != 0.12 {
		t.Errorf("daily: %+v", a.Daily)
	}
	if a.CeilingReached {
		t.Error("12% of the ceiling is not reached")
	}
}

func TestBudgetThresholds(t *testing.T) {
	cases := []struct {
		micro          int64
		p50, p90, p100 bool
		pct            float64
	}{
		{14_990_000, false, false, false, 50.0}, // rounds to 50.0 for display but is under 50
		{15_000_000, true, false, false, 50},
		{27_000_000, true, true, false, 90},
		{30_000_000, true, true, true, 100},
	}
	for _, c := range cases {
		p := newProv(t, nov10, 30, map[string]int64{"spend:2026-11-02": c.micro}, nil)
		s, _ := p.Snapshot(bg)
		th := s.AI.Thresholds
		if th.P50 != c.p50 || th.P90 != c.p90 || th.P100 != c.p100 || s.AI.BudgetUsedPct != c.pct {
			t.Errorf("%d: %+v pct %v", c.micro, th, s.AI.BudgetUsedPct)
		}
	}
}

func TestProjectionOnlyFromDayFour(t *testing.T) {
	day3 := time.Date(2026, 11, 3, 6, 0, 0, 0, time.UTC)
	if s, _ := newProv(t, day3, 30, map[string]int64{"spend:2026-11-01": 1_000_000}, nil).Snapshot(bg); s.AI.ProjectedMonthUSD != nil {
		t.Errorf("day 3 must not project: %v", *s.AI.ProjectedMonthUSD)
	}
	day4 := time.Date(2026, 11, 4, 6, 0, 0, 0, time.UTC)
	s, _ := newProv(t, day4, 30, map[string]int64{"spend:2026-11-01": 1_000_000}, nil).Snapshot(bg)
	if s.AI.ProjectedMonthUSD == nil || *s.AI.ProjectedMonthUSD != 7.5 { // 1.00 / 4 * 30
		t.Errorf("day 4 projection: %v", s.AI.ProjectedMonthUSD)
	}
}

func TestCeilingReachedNearTheTop(t *testing.T) {
	today := "spend:2026-11-10"
	if s, _ := newProv(t, nov10, 30, map[string]int64{today: 980_000}, nil).Snapshot(bg); s.AI.CeilingReached {
		t.Error("98% is not reached")
	}
	if s, _ := newProv(t, nov10, 30, map[string]int64{today: 999_500}, nil).Snapshot(bg); !s.AI.CeilingReached {
		t.Error("reservations stop just short of the ceiling, 99.95% must count as reached")
	}
}

// FR-045: never an invented amount.
func TestHostingNotConnectedHasNoAmount(t *testing.T) {
	s, _ := newProv(t, nov10, 30, nil, nil).Snapshot(bg)
	if s.Hosting.Connected || s.Hosting.Reason != "Cloud billing source is not connected" || len(s.Hosting.Items) != 0 {
		t.Errorf("%+v", s.Hosting)
	}
	raw, _ := json.Marshal(s)
	for _, want := range []string{`"connected":false`, `"items":[]`, `"projectedMonthUSD":`, `"thresholds":{"50":false,"90":false,"100":false}`} {
		if !strings.Contains(string(raw), want) {
			t.Errorf("json lacks %s: %s", want, raw)
		}
	}
}

type fakeBilling struct{}

func (fakeBilling) Hosting(context.Context) Hosting {
	return Hosting{Connected: true, Items: []LineItem{{Name: "Cloud Run", USD: 1.5}}}
}

func TestHostingSourceIsReplaceable(t *testing.T) {
	s, _ := newProv(t, nov10, 30, nil, fakeBilling{}).Snapshot(bg)
	if !s.Hosting.Connected || len(s.Hosting.Items) != 1 {
		t.Errorf("%+v", s.Hosting)
	}
}

func TestEmptyMonthIsZeroes(t *testing.T) {
	s, err := newProv(t, nov10, 30, nil, nil).Snapshot(bg)
	if err != nil || s.AI.TodayUSD != 0 || s.AI.Daily == nil || s.GeneratedAt.IsZero() {
		t.Errorf("%+v %v", s, err)
	}
}
