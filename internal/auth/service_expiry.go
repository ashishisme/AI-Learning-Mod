// SPEC: FR-007, FR-008, FR-039
package auth

import (
	"context"
	"errors"
	"time"

	"ai-foundations-coach/internal/state"
)

const purgeAfter = 90 * 24 * time.Hour

func (s *Service) checkMonths(months int) (int, error) {
	if months == 0 {
		months = s.cfg.AccountMonths
	}
	if months < 1 || months > 24 {
		return 0, ErrInvalidInput
	}
	return months, nil
}

func extendOne(a state.Account, actor string, months int, now time.Time, byLabel bool) state.Account {
	base := a.ExpiresAt
	if now.After(base) {
		base = now // an expired account is extended from today, so the new date is never still in the past
	}
	a.ExpiresAt = AddMonthsIST(base, months)
	a.Extensions = append(a.Extensions, state.Extension{At: now, By: actor, Months: months, NewExpiresAt: a.ExpiresAt, ByLabelAction: byLabel})
	return a
}

// Extend adds months (1 to 24, default 2) to one account, active or expired. A revoked account must
// be re-invited instead.
func (s *Service) Extend(ctx context.Context, actor, betaID string, months int) (time.Time, error) {
	months, err := s.checkMonths(months)
	if err != nil {
		return time.Time{}, err
	}
	id := NormalizeBetaID(betaID)
	var out time.Time
	err = s.store.Do(ctx, func(tx state.Tx) error {
		a, ok := tx.GetAccount(id)
		if !ok {
			return ErrNotFound
		}
		if a.Status == state.AccountRevoked {
			return ErrAccountRevoked
		}
		now := s.now()
		a = extendOne(a, actor, months, now, false)
		tx.PutAccount(a)
		appendAudit(tx, now, actor, "account.extend", id, "months="+itoa(months))
		out = a.ExpiresAt
		return nil
	})
	return out, err
}

// ExtendLabel extends every non-revoked account with the group label and returns how many.
func (s *Service) ExtendLabel(ctx context.Context, actor, label string, months int) (int, error) {
	months, err := s.checkMonths(months)
	label = trimSpace(label)
	if err != nil || label == "" || !ValidLabel(label) {
		return 0, ErrInvalidInput
	}
	n := 0
	err = s.store.Do(ctx, func(tx state.Tx) error {
		n = 0 // a transaction may run more than once
		now := s.now()
		for _, a := range tx.ListAccounts() {
			if a.Label == label && a.Status != state.AccountRevoked {
				tx.PutAccount(extendOne(a, actor, months, now, true))
				n++
			}
		}
		if n > 0 {
			appendAudit(tx, now, actor, "account.extend_label", label, "months="+itoa(months)+" count="+itoa(n))
		}
		return nil
	})
	return n, err
}

// SweepHook lets other packages clean their own records in the same pass.
type SweepHook func(ctx context.Context, now time.Time) error

// AddSweepHook registers extra clean-up. Call it before the first Sweep.
func (s *Service) AddSweepHook(h SweepHook) { s.sweepHooks = append(s.sweepHooks, h) }

// SweepResult says what a clean-up pass removed.
type SweepResult struct{ Accounts, Sessions, Invites int }

// Sweep deletes accounts expired for more than 90 days (FR-039), dead sessions and old invites,
// then runs the registered hooks. It is safe to run often. Candidates are found in a read-only view
// and removed in short transactions, so a sweep never holds locks across every record.
func (s *Service) Sweep(ctx context.Context) (SweepResult, error) {
	now := s.now()
	var accounts, sessions, invites []string
	if err := s.store.View(ctx, func(tx state.Tx) error {
		accounts, sessions, invites = nil, nil, nil
		for _, a := range tx.ListAccounts() {
			if now.Sub(a.ExpiresAt) > purgeAfter {
				accounts = append(accounts, a.BetaID)
			}
		}
		for _, sess := range tx.ListSessions() {
			if !now.Before(sess.ExpiresAt) {
				sessions = append(sessions, sess.TokenHash)
			}
		}
		for _, in := range tx.ListInvites() {
			if now.Sub(in.ExpiresAt) > purgeAfter {
				invites = append(invites, in.ID)
			}
		}
		return nil
	}); err != nil {
		return SweepResult{}, err
	}

	var res SweepResult
	var errs [3]error
	res.Accounts, errs[0] = state.DoBatches(ctx, s.store, accounts, func(tx state.Tx, id string) bool {
		a, ok := tx.GetAccount(id)
		if !ok || now.Sub(a.ExpiresAt) <= purgeAfter {
			return false // gone, or extended since the view
		}
		tx.DeleteSessionsFor(id)
		tx.DeleteAccount(id)
		appendAudit(tx, now, "system", "account.purge", id, "expired more than 90 days ago")
		return true
	})
	res.Sessions, errs[1] = state.DoBatches(ctx, s.store, sessions, func(tx state.Tx, h string) bool {
		sess, ok := tx.GetSession(h)
		if !ok || now.Before(sess.ExpiresAt) {
			return false
		}
		tx.DeleteSession(h)
		return true
	})
	res.Invites, errs[2] = state.DoBatches(ctx, s.store, invites, func(tx state.Tx, id string) bool {
		in, ok := tx.GetInviteByID(id)
		if !ok || now.Sub(in.ExpiresAt) <= purgeAfter {
			return false
		}
		tx.DeleteInvite(id)
		return true
	})
	all := []error{errs[0], errs[1], errs[2], s.pruneAttempts(ctx, now)}
	for _, h := range s.sweepHooks {
		all = append(all, h(ctx, now))
	}
	return res, errors.Join(all...)
}
