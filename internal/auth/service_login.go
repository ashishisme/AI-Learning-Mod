// SPEC: FR-001, FR-007, FR-009, FR-012
package auth

import (
	"context"
	"time"

	"ai-foundations-coach/internal/state"
)

// SignedIn is the result of a successful sign-in.
type SignedIn struct {
	Token   string
	Expires time.Time
	Info    SessionInfo
}

// Login checks a Beta ID and password and starts a session. Wrong ID and wrong password give the
// same error and take the same time; the account's status is only revealed to someone who knows
// the password. clientAddr is used for the lockout rules.
func (s *Service) Login(ctx context.Context, betaID, password, clientAddr string) (SignedIn, error) {
	id := NormalizeBetaID(betaID)
	var acct state.Account
	var found bool
	if err := s.store.View(ctx, func(tx state.Tx) error {
		acct, found = tx.GetAccount(id)
		return nil
	}); err != nil {
		return SignedIn{}, err
	}
	if err := s.loginAllowed(ctx, id, clientAddr, found); err != nil {
		return SignedIn{}, err
	}
	if !found {
		DummyVerify()
		s.loginFailed(ctx, id, clientAddr, false)
		return SignedIn{}, ErrBadCredentials
	}
	if !VerifyPassword(NormalizePassword(password), acct.PasswordHash) {
		s.loginFailed(ctx, id, clientAddr, true)
		return SignedIn{}, ErrBadCredentials
	}
	now := s.now()
	switch {
	case acct.Status == state.AccountRevoked:
		return SignedIn{}, ErrAccountRevoked
	case accountExpired(acct, now):
		return SignedIn{}, ErrAccountExpired
	}
	s.loginSucceeded(ctx, id)
	var out SignedIn
	err := s.store.Do(ctx, func(tx state.Tx) error {
		// Re-check inside the transaction: the account may have been revoked while we hashed.
		cur, ok := tx.GetAccount(id)
		if !ok || cur.Status == state.AccountRevoked {
			return ErrAccountRevoked
		}
		tok, exp := s.newSession(tx, id, cur.ExpiresAt, now)
		out = SignedIn{Token: tok, Expires: exp, Info: newSessionInfo(cur.BetaID, cur.Label, cur.ExpiresAt, now)}
		return nil
	})
	return out, err
}

// Validate checks a session token on every request. It re-reads the account, so a revoked or
// expired account is refused at once and its session is removed.
func (s *Service) Validate(ctx context.Context, token string) (SessionInfo, error) {
	h := HashToken(token)
	now := s.now()
	var info SessionInfo
	var verdict error
	err := s.store.View(ctx, func(tx state.Tx) error {
		sess, ok := tx.GetSession(h)
		if !ok || !now.Before(sess.ExpiresAt) {
			verdict = ErrNoSession
			return nil
		}
		acct, ok := tx.GetAccount(sess.BetaID)
		switch {
		case !ok:
			verdict = ErrNoSession
		case acct.Status == state.AccountRevoked:
			verdict = ErrAccountRevoked
		case accountExpired(acct, now):
			verdict = ErrAccountExpired
		default:
			info = newSessionInfo(acct.BetaID, acct.Label, acct.ExpiresAt, now)
		}
		return nil
	})
	if err != nil {
		return SessionInfo{}, err
	}
	if verdict != nil {
		// Best effort: drop the dead session so it is not looked up again.
		_ = s.store.Do(ctx, func(tx state.Tx) error { tx.DeleteSession(h); return nil })
		return SessionInfo{}, verdict
	}
	return info, nil
}

// Logout removes the session. It is not an error if the session is already gone.
func (s *Service) Logout(ctx context.Context, token string) error {
	h := HashToken(token)
	return s.store.Do(ctx, func(tx state.Tx) error { tx.DeleteSession(h); return nil })
}
