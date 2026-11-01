// SPEC: FR-007, FR-008, FR-039
package auth

import (
	"context"
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
type SweepHook func(ctx context.Context, tx state.Tx, now time.Time)

// AddSweepHook registers extra clean-up. Call it before the first Sweep.
func (s *Service) AddSweepHook(h SweepHook) { s.sweepHooks = append(s.sweepHooks, h) }

// SweepResult says what a clean-up pass removed.
type SweepResult struct{ Accounts, Sessions, Invites int }

// Sweep deletes accounts expired for more than 90 days (FR-039), dead sessions and old invites,
// then runs the registered hooks. It is safe to run often.
func (s *Service) Sweep(ctx context.Context) (SweepResult, error) {
	var res SweepResult
	err := s.store.Do(ctx, func(tx state.Tx) error {
		now := s.now()
		for _, a := range tx.ListAccounts() {
			if now.Sub(a.ExpiresAt) > purgeAfter {
				tx.DeleteSessionsFor(a.BetaID)
				tx.DeleteAccount(a.BetaID)
				appendAudit(tx, now, "system", "account.purge", a.BetaID, "expired more than 90 days ago")
				res.Accounts++
			}
		}
		for _, sess := range tx.ListSessions() {
			if !now.Before(sess.ExpiresAt) {
				tx.DeleteSession(sess.TokenHash)
				res.Sessions++
			}
		}
		for _, in := range tx.ListInvites() {
			if now.Sub(in.ExpiresAt) > purgeAfter {
				tx.DeleteInvite(in.ID)
				res.Invites++
			}
		}
		s.pruneAttempts(tx, now)
		for _, h := range s.sweepHooks {
			h(ctx, tx, now)
		}
		return nil
	})
	return res, err
}
