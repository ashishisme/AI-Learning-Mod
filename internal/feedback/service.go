// SPEC: FR-047..FR-059, SC-016, SC-019
// Package feedback holds learner feedback. A message is refused outright if the rule check finds
// personal details; otherwise it waits, hidden, until the AI auditor passes it. Records hold no Beta
// ID, network address, session or device details.
package feedback

import (
	"bytes"
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/csv"
	"encoding/hex"
	"errors"
	"log/slog"
	"regexp"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"ai-foundations-coach/internal/auth"
	"ai-foundations-coach/internal/state"
)

const (
	MaxMessageRunes = 500
	hourlyLimit     = 5
	retention       = 180 * 24 * time.Hour
	waitingLimit    = 7 * 24 * time.Hour
	ratePrefix      = "fbrate:"
	claimTTL        = 2 * time.Minute // well over the auditor's timeout; lets another instance retry after a crash
)

var (
	ErrInvalid  = errors.New("feedback: invalid input")
	ErrLimit    = errors.New("feedback: too many submissions")
	ErrNotFound = errors.New("feedback: not found")
)

// PIIError means the rule check found personal details. Nothing was stored. Kind is a fixed label;
// the matched text is never carried.
type PIIError struct{ Kind string }

func (e *PIIError) Error() string { return "feedback: personal details found (" + e.Kind + ")" }

// Input is what a learner sends. Identity is never part of it.
type Input struct {
	Rating     int
	Category   string
	Message    string
	LessonID   string
	Mode       string
	AppVersion string
}

var (
	lessonRe  = regexp.MustCompile(`^[a-z0-9][a-z0-9_-]{0,63}$`)
	versionRe = regexp.MustCompile(`^[0-9A-Za-z.+-]{0,20}$`)
)

func validate(in *Input) error {
	in.Message = strings.TrimSpace(in.Message)
	if in.Mode == "" {
		in.Mode = "standard"
	}
	switch {
	case in.Rating < 1 || in.Rating > 5,
		in.Category != "bug" && in.Category != "content" && in.Category != "idea" && in.Category != "other",
		in.Mode != "standard" && in.Mode != "junior" && in.Mode != "plain-english",
		utf8.RuneCountInString(in.Message) > MaxMessageRunes,
		in.LessonID != "" && !lessonRe.MatchString(in.LessonID),
		!versionRe.MatchString(in.AppVersion):
		return ErrInvalid
	}
	return nil
}

// Service stores feedback and drives the auditor.
type Service struct {
	store      state.Store
	auditor    Auditor
	clock      func() time.Time
	wake       chan struct{}
	retryAfter time.Duration
}

func NewService(st state.Store, a Auditor) *Service {
	return &Service{store: st, auditor: a, clock: time.Now, wake: make(chan struct{}, 1), retryAfter: 5 * time.Minute}
}

// SetClock replaces the time source (tests).
func (s *Service) SetClock(f func() time.Time) { s.clock = f }

func (s *Service) now() time.Time { return s.clock().UTC() }

// rateKey holds a hash, not the Beta ID, and is deleted by the sweep once its hour is over.
func rateKey(betaID string, now time.Time) string {
	sum := sha256.Sum256([]byte(betaID))
	return ratePrefix + hex.EncodeToString(sum[:])[:16] + ":" + auth.HourKey(now)
}

func newID() string {
	b := make([]byte, 9)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)[:12]
}

// Submit runs the rule check and stores a clean message as waiting. A refused message stores
// nothing but still counts toward the hourly limit, so the check cannot be probed endlessly.
func (s *Service) Submit(ctx context.Context, betaID, label string, in Input) error {
	if err := validate(&in); err != nil {
		return err
	}
	// The lesson id is free text from the client too, so it is checked as well.
	kind, found := Check(in.Message)
	if !found {
		kind, found = Check(in.LessonID)
	}
	err := s.store.Do(ctx, func(tx state.Tx) error {
		now := s.now()
		key := rateKey(betaID, now)
		if tx.GetCounter(key) >= hourlyLimit {
			return ErrLimit
		}
		tx.AddCounter(key, 1)
		if found {
			return nil
		}
		tx.PutFeedback(state.Feedback{
			ID: newID(), At: now, Rating: in.Rating, Category: in.Category, Message: in.Message, Label: label,
			LessonID: in.LessonID, Mode: in.Mode, AppVersion: in.AppVersion, Status: state.FeedbackNew, Review: state.ReviewWaiting,
		})
		return nil
	})
	if err != nil {
		return err
	}
	if found {
		return &PIIError{Kind: kind}
	}
	s.Wake()
	return nil
}

// Wake asks the worker to look for waiting items. It never blocks.
func (s *Service) Wake() {
	select {
	case s.wake <- struct{}{}:
	default:
	}
}

// Run is the auditor worker: it makes no AI call unless something is waiting (FR-059), and after a
// failure it tries again later while the items stay hidden (FR-058).
func (s *Service) Run(ctx context.Context) {
	for {
		var retry <-chan time.Time
		if !s.ProcessWaiting(ctx) {
			retry = time.After(s.retryAfter)
		}
		select {
		case <-ctx.Done():
			return
		case <-s.wake:
		case <-retry:
		}
	}
}

// ProcessWaiting reviews waiting items, oldest first. It stops at the first failure and returns
// false, because a failing auditor will fail for the rest too. An item whose text is empty needs no
// AI review: there is nothing for an admin to read that could hold personal details.
func (s *Service) ProcessWaiting(ctx context.Context) bool {
	var waiting []state.Feedback
	if err := s.store.View(ctx, func(tx state.Tx) error {
		waiting = nil
		for _, f := range tx.ListFeedback() {
			if f.Review == state.ReviewWaiting {
				waiting = append(waiting, f)
			}
		}
		return nil
	}); err != nil {
		return false
	}
	for i := len(waiting) - 1; i >= 0; i-- { // ListFeedback is newest first
		f := waiting[i]
		if f.Message == "" {
			if !s.settle(ctx, f.ID, Verdict{Pass: true}) {
				return false
			}
			continue
		}
		claimed, err := s.claim(ctx, f.ID)
		if err != nil {
			return false
		}
		if !claimed {
			continue // another instance is reviewing it, so it must not be paid for twice
		}
		v, err := s.auditor.Review(ctx, f.Message)
		if err != nil {
			s.noteTry(ctx, f.ID)
			return false
		}
		if !s.settle(ctx, f.ID, v) {
			return false
		}
	}
	return true
}

// claim reserves a waiting item for this worker.
func (s *Service) claim(ctx context.Context, id string) (bool, error) {
	claimed := false
	err := s.store.Do(ctx, func(tx state.Tx) error {
		claimed = false
		f, ok := tx.GetFeedback(id)
		if !ok || f.Review != state.ReviewWaiting {
			return nil
		}
		now := s.now()
		if f.ClaimedUntil != nil && now.Before(*f.ClaimedUntil) {
			return nil
		}
		until := now.Add(claimTTL)
		f.ClaimedUntil = &until
		tx.PutFeedback(f)
		claimed = true
		return nil
	})
	return claimed, err
}

func (s *Service) noteTry(ctx context.Context, id string) {
	err := s.store.Do(ctx, func(tx state.Tx) error {
		if f, ok := tx.GetFeedback(id); ok {
			f.ReviewTries++
			f.ClaimedUntil = nil
			tx.PutFeedback(f)
		}
		return nil
	})
	if err != nil {
		slog.Warn("Could not record a feedback review attempt", "error", err.Error())
	}
}

// settle applies a verdict. A withheld message's text is deleted in the same transaction (FR-059).
// It returns false if the verdict could not be stored; the item then stays waiting and hidden.
func (s *Service) settle(ctx context.Context, id string, v Verdict) bool {
	err := s.store.Do(ctx, func(tx state.Tx) error {
		f, ok := tx.GetFeedback(id)
		if !ok || f.Review != state.ReviewWaiting {
			return nil
		}
		now := s.now()
		f.ReviewedAt = &now
		f.ReviewTries++
		f.ClaimedUntil = nil
		if v.Pass {
			f.Review = state.ReviewPassed
		} else {
			f.Review, f.WithheldReason, f.Message = state.ReviewWithheld, v.Reason, ""
		}
		tx.PutFeedback(f)
		return nil
	})
	if err != nil {
		slog.Warn("Could not store a feedback verdict", "error", err.Error())
		return false
	}
	return true
}

// Filter selects passed feedback for admins.
type Filter struct {
	Status, Category, LessonID, Label string
	Rating                            int
	Limit, Offset                     int
}

// Item is what an admin may see.
type Item struct {
	ID         string    `json:"id"`
	At         time.Time `json:"at"`
	Rating     int       `json:"rating"`
	Category   string    `json:"category"`
	Message    string    `json:"message"`
	Label      string    `json:"label"`
	LessonID   string    `json:"lessonId"`
	Mode       string    `json:"mode"`
	AppVersion string    `json:"appVersion"`
	Status     string    `json:"status"`
}

// Held counts items an admin cannot read. It never carries text.
type Held struct {
	Waiting  int            `json:"waiting"`
	Withheld int            `json:"withheld"`
	ByReason map[string]int `json:"byReason"`
}

func (f Filter) matches(x state.Feedback) bool {
	return x.Review == state.ReviewPassed && (f.Status == "" || x.Status == f.Status) && (f.Category == "" || x.Category == f.Category) &&
		(f.LessonID == "" || x.LessonID == f.LessonID) && (f.Label == "" || x.Label == f.Label) && (f.Rating == 0 || x.Rating == f.Rating)
}

func itemOf(x state.Feedback) Item {
	return Item{ID: x.ID, At: x.At, Rating: x.Rating, Category: x.Category, Message: x.Message, Label: x.Label,
		LessonID: x.LessonID, Mode: x.Mode, AppVersion: x.AppVersion, Status: x.Status}
}

// List returns one page of passed items, newest first, the total, the unread count and held counts.
func (s *Service) List(ctx context.Context, f Filter) (items []Item, total, unread int, held Held, err error) {
	items = []Item{}
	held.ByReason = map[string]int{}
	err = s.store.View(ctx, func(tx state.Tx) error {
		for _, x := range tx.ListFeedback() {
			switch x.Review {
			case state.ReviewWaiting:
				held.Waiting++
			case state.ReviewWithheld:
				held.Withheld++
				held.ByReason[x.WithheldReason]++
			case state.ReviewPassed:
				if x.Status == state.FeedbackNew {
					unread++
				}
			}
			if f.matches(x) {
				if total >= f.Offset && (f.Limit <= 0 || len(items) < f.Limit) {
					items = append(items, itemOf(x))
				}
				total++
			}
		}
		return nil
	})
	return
}

// Unread counts passed items not yet read.
func (s *Service) Unread(ctx context.Context) (int, error) {
	_, _, n, _, err := s.List(ctx, Filter{Limit: 1})
	return n, err
}

func audit(tx state.Tx, at time.Time, actor, action, target, detail string) {
	tx.AppendAudit(state.AuditEntry{At: at, Actor: actor, Action: action, Target: target, Detail: detail})
}

// SetStatus changes a passed item's status and records it in the audit trail (FR-052).
func (s *Service) SetStatus(ctx context.Context, actor, id, status string) error {
	if status != state.FeedbackNew && status != state.FeedbackRead && status != state.FeedbackResolved {
		return ErrInvalid
	}
	return s.store.Do(ctx, func(tx state.Tx) error {
		f, ok := tx.GetFeedback(id)
		if !ok || f.Review != state.ReviewPassed {
			return ErrNotFound
		}
		f.Status = status
		tx.PutFeedback(f)
		audit(tx, s.now(), actor, "feedback.status", id, "status="+status)
		return nil
	})
}

// Delete removes a passed item and records it in the audit trail (FR-052).
func (s *Service) Delete(ctx context.Context, actor, id string) error {
	return s.store.Do(ctx, func(tx state.Tx) error {
		f, ok := tx.GetFeedback(id)
		if !ok || f.Review != state.ReviewPassed {
			return ErrNotFound
		}
		tx.DeleteFeedback(id)
		audit(tx, s.now(), actor, "feedback.delete", id, "")
		return nil
	})
}

// csvCell stops a spreadsheet treating a cell as a formula.
func csvCell(v string) string {
	if v != "" && strings.ContainsRune("=+-@\t\r", rune(v[0])) {
		return "'" + v
	}
	return v
}

// CSV exports passed items matching the filter and records the export (FR-051, FR-052).
func (s *Service) CSV(ctx context.Context, actor string, f Filter) ([]byte, error) {
	var buf bytes.Buffer
	var w *csv.Writer
	err := s.store.Do(ctx, func(tx state.Tx) error {
		buf.Reset() // a transaction may run more than once
		w = csv.NewWriter(&buf)
		_ = w.Write([]string{"at", "rating", "category", "message", "label", "lessonId", "mode", "appVersion", "status"})
		n := 0
		for _, x := range tx.ListFeedback() {
			if f.matches(x) {
				_ = w.Write([]string{x.At.In(auth.IST).Format(time.RFC3339), strconv.Itoa(x.Rating), x.Category, csvCell(x.Message),
					csvCell(x.Label), x.LessonID, x.Mode, x.AppVersion, x.Status})
				n++
			}
		}
		audit(tx, s.now(), actor, "feedback.export", "-", "count="+strconv.Itoa(n))
		return nil
	})
	if err != nil {
		return nil, err
	}
	w.Flush()
	return buf.Bytes(), w.Error()
}

// Sweep deletes old items and finished rate counters. It has the shape of auth.SweepHook.
func (s *Service) Sweep(ctx context.Context, now time.Time) error {
	old := func(f state.Feedback) bool {
		age := now.Sub(f.At)
		return age > retention || (f.Review == state.ReviewWaiting && age > waitingLimit)
	}
	current := auth.HourKey(now)
	var items, counters []string
	if err := s.store.View(ctx, func(tx state.Tx) error {
		items, counters = nil, nil
		for _, f := range tx.ListFeedback() {
			if old(f) {
				items = append(items, f.ID)
			}
		}
		for key := range tx.ListCounters(ratePrefix) {
			if i := strings.LastIndexByte(key, ':'); i > 0 && key[i+1:] < current {
				counters = append(counters, key)
			}
		}
		return nil
	}); err != nil {
		return err
	}
	_, err := state.DoBatches(ctx, s.store, items, func(tx state.Tx, id string) bool {
		f, ok := tx.GetFeedback(id)
		if !ok || !old(f) {
			return false
		}
		tx.DeleteFeedback(id)
		return true
	})
	_, err2 := state.DoBatches(ctx, s.store, counters, func(tx state.Tx, key string) bool {
		tx.DeleteCounter(key)
		return true
	})
	return errors.Join(err, err2)
}
