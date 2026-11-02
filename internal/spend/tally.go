// SPEC: FR-025, SC-010
// Package spend keeps the shared daily AI spend tally. Worst-case cost is reserved before every AI
// call, so the tally can never pass the ceiling however many calls run at once.
package spend

import (
	"context"
	"errors"
	"log/slog"
	"math"
	"strings"
	"sync"
	"time"

	"ai-foundations-coach/internal/auth"
	"ai-foundations-coach/internal/state"
)

// ErrCeilingReached means the reservation would take today's tally above the ceiling.
var ErrCeilingReached = errors.New("daily AI spend ceiling reached")

const keyPrefix = "spend:"

type Config struct {
	CeilingUSD       float64
	InputPerMtokUSD  float64
	OutputPerMtokUSD float64
}

type Tally struct {
	store   state.Store
	ceiling int64 // micro-US-dollars per IST day
	in, out int64 // micro-US-dollars per million tokens
	clock   func() time.Time
}

func toMicro(usd float64) int64 { return int64(math.Round(usd * 1e6)) }

func New(st state.Store, cfg Config) *Tally {
	return &Tally{store: st, ceiling: toMicro(cfg.CeilingUSD), in: toMicro(cfg.InputPerMtokUSD), out: toMicro(cfg.OutputPerMtokUSD), clock: time.Now}
}

// SetClock replaces the time source (tests).
func (t *Tally) SetClock(f func() time.Time) { t.clock = f }

// CeilingMicro is the daily ceiling in micro-US-dollars.
func (t *Tally) CeilingMicro() int64 { return t.ceiling }

// cost rounds up to whole micro-dollars, so the tally errs on the high side.
func (t *Tally) cost(inTokens, outTokens int) int64 {
	return ceilMicro(inTokens, t.in) + ceilMicro(outTokens, t.out)
}

func ceilMicro(tokens int, perMtok int64) int64 {
	if tokens <= 0 {
		return 0
	}
	return (int64(tokens)*perMtok + 999_999) / 1_000_000
}

// Reservation holds worst-case cost until the real cost is known.
type Reservation struct {
	t        *Tally
	key      string
	reserved int64
	once     sync.Once
}

// Reserve counts the worst-case cost of a call against today, or refuses it. A store failure
// returns an error, and callers treat that as "no call" (fail closed).
func (t *Tally) Reserve(ctx context.Context, estInputTokens, maxOutputTokens int) (*Reservation, error) {
	cost := t.cost(estInputTokens, maxOutputTokens)
	key := keyPrefix + auth.DayKey(t.clock())
	err := t.store.DoCounters(ctx, func(tx state.Tx) error {
		if tx.GetCounter(key)+cost > t.ceiling {
			return ErrCeilingReached
		}
		tx.AddCounter(key, cost)
		return nil
	})
	if err != nil {
		return nil, err
	}
	return &Reservation{t: t, key: key, reserved: cost}, nil
}

// Settle replaces the reservation with the actual cost, on the day it was reserved. Only the first
// call counts. It uses its own context so a cancelled request still settles.
func (r *Reservation) Settle(_ context.Context, actualInputTokens, actualOutputTokens int) {
	r.once.Do(func() {
		delta := r.t.cost(actualInputTokens, actualOutputTokens) - r.reserved
		if delta != 0 {
			err := r.t.store.DoCounters(context.Background(), func(tx state.Tx) error {
				tx.AddCounter(r.key, delta)
				return nil
			})
			if err != nil {
				// The worst case stays reserved, so a failed settle errs on the safe side.
				slog.Warn("Could not settle an AI spend reservation", "error", err.Error())
			}
		}
	})
}

// Day is the tally for an IST date (YYYY-MM-DD) in micro-US-dollars.
func (t *Tally) Day(ctx context.Context, date string) (int64, error) {
	var v int64
	err := t.store.View(ctx, func(tx state.Tx) error { v = tx.GetCounter(keyPrefix + date); return nil })
	return v, err
}

// Month returns the tally per date for an IST month (YYYY-MM).
func (t *Tally) Month(ctx context.Context, month string) (map[string]int64, error) {
	out := map[string]int64{}
	err := t.store.View(ctx, func(tx state.Tx) error {
		for k, v := range tx.ListCounters(keyPrefix + month + "-") {
			out[strings.TrimPrefix(k, keyPrefix)] = v
		}
		return nil
	})
	return out, err
}
