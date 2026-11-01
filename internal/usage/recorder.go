// SPEC: FR-040, FR-042, FR-043, FR-044, SC-016
// Package usage counts activity per IST day. It keeps counts and a last-seen time only: no
// per-person event log, no network address, no browser or device details (FR-040).
package usage

import (
	"context"
	"sort"
	"strings"
	"sync"
	"time"

	"ai-foundations-coach/internal/auth"
	"ai-foundations-coach/internal/state"
)

const (
	keyPrefix = "usage:"
	// ActiveNowWindow is what "active now" means in the console (FR-043).
	ActiveNowWindow = 5 * time.Minute
	// counterRetention is how long daily counters and spend tallies are kept.
	counterRetention = 400 * 24 * time.Hour

	Requests    = "req"
	Errors5xx   = "err5xx"
	SigninOK    = "signin_ok"
	SigninFail  = "signin_fail"
	Activations = "activation"
	Quiz        = "quiz"
	TutorQ      = "tutor_q"
	dau         = "dau"
	lessonPref  = "lesson:"
)

// Recorder holds counts in memory and writes them to the store when Flush is called (every 30
// seconds, and at shutdown), so a request never causes a file write. All methods are safe on a nil
// Recorder, which is what a self-hosted run without a store uses.
type Recorder struct {
	store state.Store
	clock func() time.Time

	mu       sync.Mutex
	delta    map[string]int64
	lastSeen map[string]time.Time
	dirty    map[string]bool
	dauDay   map[string]string // the IST day each account was last counted as active
}

func New(st state.Store) *Recorder {
	return &Recorder{store: st, clock: time.Now, delta: map[string]int64{}, lastSeen: map[string]time.Time{},
		dirty: map[string]bool{}, dauDay: map[string]string{}}
}

// SetClock replaces the time source (tests).
func (r *Recorder) SetClock(f func() time.Time) { r.clock = f }

func dayKey(date, measure string) string { return keyPrefix + date + ":" + measure }

// Inc adds one to a measure for today.
func (r *Recorder) Inc(measure string) {
	if r == nil {
		return
	}
	k := dayKey(auth.DayKey(r.clock()), measure)
	r.mu.Lock()
	r.delta[k]++
	r.mu.Unlock()
}

// IncLesson counts one view of a lesson. id must already be validated by the caller.
func (r *Recorder) IncLesson(id string) { r.Inc(lessonPref + id) }

// Seen notes activity by an account, at 1-minute precision, and counts it as active for the IST day
// the first time. After a restart the stored last-seen date prevents counting it twice.
func (r *Recorder) Seen(ctx context.Context, betaID string) {
	if r == nil {
		return
	}
	now := r.clock()
	day := auth.DayKey(now)

	r.mu.Lock()
	_, known := r.dauDay[betaID]
	r.mu.Unlock()
	storedDay := ""
	if !known {
		_ = r.store.View(ctx, func(tx state.Tx) error {
			if a, ok := tx.GetAccount(betaID); ok && a.LastSeenAt != nil {
				storedDay = auth.DayKey(*a.LastSeenAt)
			}
			return nil
		})
	}

	seen := now.UTC().Truncate(time.Minute)
	r.mu.Lock()
	defer r.mu.Unlock()
	prev, known := r.dauDay[betaID]
	if !known {
		prev = storedDay
	}
	if prev != day {
		r.delta[dayKey(day, dau)]++
	}
	r.dauDay[betaID] = day
	if !r.lastSeen[betaID].Equal(seen) {
		r.lastSeen[betaID] = seen
		r.dirty[betaID] = true
	}
}

// Flush writes pending counts and last-seen times. On failure they are kept for the next try.
func (r *Recorder) Flush(ctx context.Context) error {
	if r == nil {
		return nil
	}
	r.mu.Lock()
	delta, dirty := r.delta, r.dirty
	r.delta, r.dirty = map[string]int64{}, map[string]bool{}
	seen := make(map[string]time.Time, len(dirty))
	for id := range dirty {
		seen[id] = r.lastSeen[id]
	}
	r.mu.Unlock()

	putBackDelta := func() {
		r.mu.Lock()
		defer r.mu.Unlock()
		for k, v := range delta {
			r.delta[k] += v
		}
	}
	putBackSeen := func() {
		r.mu.Lock()
		defer r.mu.Unlock()
		for id := range dirty {
			r.dirty[id] = true
		}
	}
	if len(delta) > 0 {
		err := r.store.DoCounters(ctx, func(tx state.Tx) error {
			for k, v := range delta {
				tx.AddCounter(k, v)
			}
			return nil
		})
		if err != nil {
			putBackDelta()
			putBackSeen()
			return err
		}
	}
	if len(seen) > 0 {
		err := r.store.Do(ctx, func(tx state.Tx) error {
			for id, t := range seen {
				if a, ok := tx.GetAccount(id); ok && (a.LastSeenAt == nil || a.LastSeenAt.Before(t)) {
					t := t
					a.LastSeenAt = &t
					tx.PutAccount(a)
				}
			}
			return nil
		})
		if err != nil {
			putBackSeen()
			return err
		}
	}
	return nil
}

// Measures are the counts for a period. For more than one day DAU is a sum of daily counts
// (account-days), not a count of different people.
type Measures struct {
	DAU            int64 `json:"dau"`
	SigninOK       int64 `json:"signinOk"`
	SigninFail     int64 `json:"signinFail"`
	Activations    int64 `json:"activations"`
	Quiz           int64 `json:"quiz"`
	TutorQuestions int64 `json:"tutorQuestions"`
	Requests       int64 `json:"requests"`
	Errors5xx      int64 `json:"errors5xx"`
}

func (m *Measures) add(o Measures) {
	m.DAU += o.DAU
	m.SigninOK += o.SigninOK
	m.SigninFail += o.SigninFail
	m.Activations += o.Activations
	m.Quiz += o.Quiz
	m.TutorQuestions += o.TutorQuestions
	m.Requests += o.Requests
	m.Errors5xx += o.Errors5xx
}

type DayUsage struct {
	Date string `json:"date"`
	Measures
}

type LessonViews struct {
	LessonID string `json:"lessonId"`
	Views    int64  `json:"views"`
}

type Totals struct {
	Today   Measures `json:"today"`
	Last7d  Measures `json:"last7d"`
	Last30d Measures `json:"last30d"`
}

type Report struct {
	Days    int           `json:"days"`
	Series  []DayUsage    `json:"series"` // oldest first
	Totals  Totals        `json:"totals"`
	Lessons []LessonViews `json:"lessons"` // most viewed first, over Days
}

// Report returns the last `days` days (7 or 30), including counts not yet flushed.
func (r *Recorder) Report(ctx context.Context, days int) (Report, error) {
	counters := map[string]int64{}
	if err := r.store.View(ctx, func(tx state.Tx) error {
		counters = tx.ListCounters(keyPrefix)
		return nil
	}); err != nil {
		return Report{}, err
	}
	r.mu.Lock()
	for k, v := range r.delta {
		counters[k] += v
	}
	r.mu.Unlock()

	now := r.clock()
	byDate := map[string]*Measures{}
	lessonsByDate := map[string]map[string]int64{}
	for k, v := range counters {
		parts := strings.SplitN(k, ":", 3)
		if len(parts) != 3 {
			continue
		}
		date, measure := parts[1], parts[2]
		m := byDate[date]
		if m == nil {
			m = &Measures{}
			byDate[date] = m
		}
		switch measure {
		case dau:
			m.DAU = v
		case SigninOK:
			m.SigninOK = v
		case SigninFail:
			m.SigninFail = v
		case Activations:
			m.Activations = v
		case Quiz:
			m.Quiz = v
		case TutorQ:
			m.TutorQuestions = v
		case Requests:
			m.Requests = v
		case Errors5xx:
			m.Errors5xx = v
		default:
			if id, ok := strings.CutPrefix(measure, lessonPref); ok {
				if lessonsByDate[date] == nil {
					lessonsByDate[date] = map[string]int64{}
				}
				lessonsByDate[date][id] = v
			}
		}
	}

	dateAt := func(daysAgo int) string { return auth.DayKey(now.Add(-time.Duration(daysAgo) * 24 * time.Hour)) }
	rep := Report{Days: days, Series: make([]DayUsage, 0, days), Lessons: []LessonViews{}}
	for i := days - 1; i >= 0; i-- {
		d := DayUsage{Date: dateAt(i)}
		if m := byDate[d.Date]; m != nil {
			d.Measures = *m
		}
		rep.Series = append(rep.Series, d)
	}
	for i := 0; i < 30; i++ {
		m := byDate[dateAt(i)]
		if m == nil {
			continue
		}
		if i == 0 {
			rep.Totals.Today.add(*m)
		}
		if i < 7 {
			rep.Totals.Last7d.add(*m)
		}
		rep.Totals.Last30d.add(*m)
	}
	views := map[string]int64{}
	for i := 0; i < days; i++ {
		for id, v := range lessonsByDate[dateAt(i)] {
			views[id] += v
		}
	}
	for id, v := range views {
		rep.Lessons = append(rep.Lessons, LessonViews{LessonID: id, Views: v})
	}
	sort.Slice(rep.Lessons, func(i, j int) bool {
		if rep.Lessons[i].Views != rep.Lessons[j].Views {
			return rep.Lessons[i].Views > rep.Lessons[j].Views
		}
		return rep.Lessons[i].LessonID < rep.Lessons[j].LessonID
	})
	return rep, nil
}

// Decorate updates account rows with last-seen times not yet flushed and the active-now flag.
func (r *Recorder) Decorate(rows []auth.AccountRow) {
	if r == nil {
		return
	}
	now := r.clock()
	r.mu.Lock()
	defer r.mu.Unlock()
	for i := range rows {
		if t, ok := r.lastSeen[rows[i].BetaID]; ok && (rows[i].LastSeenAt == nil || rows[i].LastSeenAt.Before(t)) {
			t := t
			rows[i].LastSeenAt = &t
		}
		rows[i].ActiveNow = rows[i].LastSeenAt != nil && now.Sub(*rows[i].LastSeenAt) <= ActiveNowWindow
	}
}

// Sweep deletes daily counters and spend tallies older than the retention period.
func (r *Recorder) Sweep(_ context.Context, tx state.Tx, now time.Time) {
	cutoff := auth.DayKey(now.Add(-counterRetention))
	tx.DeleteCountersWhere(func(key string) bool {
		parts := strings.SplitN(key, ":", 3)
		return len(parts) >= 2 && (parts[0] == "usage" || parts[0] == "spend") && parts[1] < cutoff
	})
}
