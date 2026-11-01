// SPEC: FR-044, FR-045, FR-046
// Package cost reports what the beta costs. AI spend is measured by the app. Hosting cost comes from
// a billing source behind an interface; until one exists the console says "not connected" and never
// shows an invented number (FR-045).
package cost

import (
	"context"
	"math"
	"sort"
	"strconv"
	"time"

	"ai-foundations-coach/internal/auth"
	"ai-foundations-coach/internal/spend"
)

// LineItem is one hosting or data-store cost from the billing source.
type LineItem struct {
	Name string  `json:"name"`
	USD  float64 `json:"usd"`
}

type Hosting struct {
	Connected bool       `json:"connected"`
	Reason    string     `json:"reason,omitempty"`
	Items     []LineItem `json:"items"`
}

// HostingSource reads hosting and data-store cost from a cloud billing source.
type HostingSource interface {
	Hosting(ctx context.Context) Hosting
}

// NotConnected is the only source until a billing adapter exists.
type NotConnected struct{}

func (NotConnected) Hosting(context.Context) Hosting {
	return Hosting{Connected: false, Reason: "Cloud billing source is not connected", Items: []LineItem{}}
}

type DayCost struct {
	Date string  `json:"date"`
	USD  float64 `json:"usd"`
}

type AI struct {
	Estimated      bool    `json:"estimated"` // token-based, not an invoice
	TodayUSD       float64 `json:"todayUSD"`
	CeilingUSD     float64 `json:"ceilingUSD"`
	CeilingReached bool    `json:"ceilingReached"`
	MonthToDateUSD float64 `json:"monthToDateUSD"`
	BudgetUSD      float64 `json:"budgetUSD"`
	BudgetUsedPct  float64 `json:"budgetUsedPct"`
	Thresholds     struct {
		P50  bool `json:"50"`
		P90  bool `json:"90"`
		P100 bool `json:"100"`
	} `json:"thresholds"`
	ProjectedMonthUSD *float64  `json:"projectedMonthUSD"` // null before day 4 of the month
	Daily             []DayCost `json:"daily"`             // this month, oldest first
}

type Snapshot struct {
	GeneratedAt time.Time `json:"generatedAt"`
	AI          AI        `json:"ai"`
	Hosting     Hosting   `json:"hosting"`
}

type Provider struct {
	tally     *spend.Tally
	budgetUSD float64
	hosting   HostingSource
	clock     func() time.Time
}

func NewProvider(t *spend.Tally, monthlyBudgetUSD float64, h HostingSource) *Provider {
	if h == nil {
		h = NotConnected{}
	}
	return &Provider{tally: t, budgetUSD: monthlyBudgetUSD, hosting: h, clock: time.Now}
}

// SetClock replaces the time source (tests).
func (p *Provider) SetClock(f func() time.Time) { p.clock = f }

func usd(micro int64) float64 { return float64(micro) / 1e6 }

// Snapshot reads the costs now. Dates are IST.
func (p *Provider) Snapshot(ctx context.Context) (Snapshot, error) {
	now := p.clock()
	today := auth.DayKey(now)
	days, err := p.tally.Month(ctx, today[:7])
	if err != nil {
		return Snapshot{}, err
	}
	s := Snapshot{GeneratedAt: now.UTC(), Hosting: p.hosting.Hosting(ctx)}
	a := &s.AI
	a.Estimated = true
	a.BudgetUSD = p.budgetUSD
	a.CeilingUSD = usd(p.tally.CeilingMicro())
	a.Daily = []DayCost{}
	var month int64
	for d, v := range days {
		month += v
		a.Daily = append(a.Daily, DayCost{Date: d, USD: usd(v)})
	}
	sort.Slice(a.Daily, func(i, j int) bool { return a.Daily[i].Date < a.Daily[j].Date })
	a.TodayUSD = usd(days[today])
	a.MonthToDateUSD = usd(month)
	// Worst-case reservations stop the tally just short of the ceiling, so within 1% counts as reached.
	a.CeilingReached = p.tally.CeilingMicro() > 0 && float64(days[today]) >= 0.99*float64(p.tally.CeilingMicro())
	if p.budgetUSD > 0 {
		pct := a.MonthToDateUSD / p.budgetUSD * 100
		a.BudgetUsedPct = math.Round(pct*10) / 10
		a.Thresholds.P50, a.Thresholds.P90, a.Thresholds.P100 = pct >= 50, pct >= 90, pct >= 100
	}
	if dayOfMonth, _ := strconv.Atoi(today[8:]); dayOfMonth >= 4 {
		proj := a.MonthToDateUSD / float64(dayOfMonth) * float64(auth.DaysInMonthIST(now))
		proj = math.Round(proj*100) / 100
		a.ProjectedMonthUSD = &proj
	}
	return s, nil
}
