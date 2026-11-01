// SPEC: FR-003, FR-004, FR-005, FR-007
package auth

import (
	"context"
	"errors"
	"time"

	"ai-foundations-coach/internal/state"
)

// Activation is the one-time result of opening an invite. Password is shown to the learner once
// and is never stored in readable form.
type Activation struct {
	BetaID         string
	Password       string
	ExpiresAt      time.Time // account expiry
	SessionToken   string
	SessionExpires time.Time
}

func inviteProblem(in state.Invite, found bool, now time.Time) error {
	switch {
	case !found:
		return ErrInviteInvalid
	case in.Status == state.InviteUsed:
		return ErrInviteUsed
	case in.Status == state.InviteRevoked:
		return ErrInviteRevoked
	case now.After(in.ExpiresAt):
		return ErrInviteExpired
	}
	return nil
}

// Activate turns a pending invite into exactly one account and starts a session. The invite is
// re-checked inside the transaction, so of any number of simultaneous attempts one wins.
func (s *Service) Activate(ctx context.Context, token string) (Activation, error) {
	hash := HashToken(token)

	// Cheap check first: a bad or used link must not cost a password hash.
	var pre error
	if err := s.store.View(ctx, func(tx state.Tx) error {
		in, ok := tx.GetInviteByHash(hash)
		pre = inviteProblem(in, ok, s.now())
		return nil
	}); err != nil {
		return Activation{}, err
	}
	if pre != nil {
		return Activation{}, pre
	}

	// The slow hash runs outside the store lock.
	password := NewPassphrase()
	passwordHash := HashPassword(NormalizePassword(password))

	var out Activation
	err := s.store.Do(ctx, func(tx state.Tx) error {
		now := s.now()
		in, ok := tx.GetInviteByHash(hash)
		if err := inviteProblem(in, ok, now); err != nil {
			return err
		}
		betaID := NewBetaID()
		for tries := 0; ; tries++ {
			if _, taken := tx.GetAccount(betaID); !taken {
				break
			}
			if tries > 20 {
				return errors.New("auth: could not allocate a unique Beta ID")
			}
			betaID = NewBetaID()
		}
		expires := AddMonthsIST(now, s.cfg.AccountMonths)
		tx.PutAccount(state.Account{
			BetaID: betaID, PasswordHash: passwordHash, Label: in.Label,
			ActivatedAt: now, ExpiresAt: expires, Status: state.AccountActive,
		})
		in.Status, in.UsedAt, in.AccountID = state.InviteUsed, &now, betaID
		tx.PutInvite(in)
		sessionToken, sessionExpires := s.newSession(tx, betaID, expires, now)
		out = Activation{BetaID: betaID, Password: password, ExpiresAt: expires, SessionToken: sessionToken, SessionExpires: sessionExpires}
		return nil
	})
	if err != nil {
		return Activation{}, err
	}
	return out, nil
}

// newSession stores a session that lasts SessionTTL or until the account expires, whichever is
// sooner, and returns its token. Only the token's hash is stored.
func (s *Service) newSession(tx state.Tx, betaID string, accountExpires, now time.Time) (string, time.Time) {
	exp := now.Add(s.cfg.SessionTTL)
	if accountExpires.Before(exp) {
		exp = accountExpires
	}
	token := NewToken()
	tx.PutSession(state.Session{TokenHash: HashToken(token), BetaID: betaID, CreatedAt: now, ExpiresAt: exp})
	return token, exp
}
