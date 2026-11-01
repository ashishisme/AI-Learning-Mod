// SPEC: FR-003, FR-004, FR-005, FR-007, SC-005
package auth

import (
	"encoding/json"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"ai-foundations-coach/internal/state"
)

func oneInvite(t *testing.T, svc *Service, label string) string {
	t.Helper()
	links, err := svc.CreateInvites(bg, "admin@example.org", 1, label)
	if err != nil {
		t.Fatal(err)
	}
	return tokenOf(t, links[0])
}

func TestActivateCreatesOneAccount(t *testing.T) {
	svc, st, clk := newTestService(t)
	token := oneInvite(t, svc, "School A")
	now := clk.Now()

	act, err := svc.Activate(bg, token)
	if err != nil {
		t.Fatal(err)
	}
	if !betaIDShape.MatchString(act.BetaID) || !passwordShape.MatchString(act.Password) {
		t.Fatalf("credentials: %+v", act)
	}
	if want := AddMonthsIST(now, 2); !act.ExpiresAt.Equal(want) {
		t.Errorf("expiry = %s, want %s (two calendar months in IST)", act.ExpiresAt, want)
	}
	if act.SessionToken == "" || act.SessionToken == token {
		t.Error("activation must start a session with its own token")
	}

	_ = st.View(bg, func(tx state.Tx) error {
		a, ok := tx.GetAccount(act.BetaID)
		if !ok || a.Label != "School A" || a.Status != state.AccountActive || !a.ActivatedAt.Equal(now) {
			t.Fatalf("account: %+v", a)
		}
		if a.PasswordHash == act.Password || strings.Contains(a.PasswordHash, act.Password) || !VerifyPassword(act.Password, a.PasswordHash) {
			t.Error("the account must hold a hash of the password, not the password")
		}
		if _, ok := tx.GetSession(act.SessionToken); ok {
			t.Error("the session token itself must not be a store key")
		}
		if _, ok := tx.GetSession(HashToken(act.SessionToken)); !ok {
			t.Error("the session must be stored under the token hash")
		}
		in, _ := tx.GetInviteByHash(HashToken(token))
		if in.Status != state.InviteUsed || in.UsedAt == nil || in.AccountID != act.BetaID {
			t.Errorf("invite after activation: %+v", in)
		}
		// Nothing in the stored state may contain the plaintext password or either token.
		raw, _ := json.Marshal(struct {
			A []state.Account
			I []state.Invite
			S []state.Session
			L []state.AuditEntry
		}{tx.ListAccounts(), tx.ListInvites(), tx.ListSessions(), tx.ListAudit(100, "")})
		for _, secret := range []string{act.Password, token, act.SessionToken} {
			if strings.Contains(string(raw), secret) {
				t.Errorf("stored state contains a secret: %q", secret[:6])
			}
		}
		return nil
	})
}

func TestActivateInviteProblems(t *testing.T) {
	svc, st, clk := newTestService(t)

	used := oneInvite(t, svc, "")
	if _, err := svc.Activate(bg, used); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Activate(bg, used); err != ErrInviteUsed {
		t.Errorf("second activation: %v, want ErrInviteUsed", err)
	}

	revoked := oneInvite(t, svc, "")
	_ = st.Do(bg, func(tx state.Tx) error {
		in, _ := tx.GetInviteByHash(HashToken(revoked))
		in.Status = state.InviteRevoked
		tx.PutInvite(in)
		return nil
	})
	if _, err := svc.Activate(bg, revoked); err != ErrInviteRevoked {
		t.Errorf("revoked: %v", err)
	}

	if _, err := svc.Activate(bg, "no-such-token"); err != ErrInviteInvalid {
		t.Errorf("unknown: %v", err)
	}
	if _, err := svc.Activate(bg, ""); err != ErrInviteInvalid {
		t.Errorf("empty: %v", err)
	}

	late := oneInvite(t, svc, "")
	clk.Advance(14*24*time.Hour + time.Minute)
	if _, err := svc.Activate(bg, late); err != ErrInviteExpired {
		t.Errorf("after 14 days: %v", err)
	}
	_ = st.View(bg, func(tx state.Tx) error {
		if n := len(tx.ListAccounts()); n != 1 {
			t.Errorf("only the first activation may create an account, got %d", n)
		}
		return nil
	})
}

// SC-005: one invite, 50 simultaneous activations: exactly one account.
func TestActivateRaceCreatesExactlyOneAccount(t *testing.T) {
	svc, st, _ := newTestService(t)
	token := oneInvite(t, svc, "")
	var wg sync.WaitGroup
	var ok, used atomic.Int32
	for i := 0; i < 50; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			switch _, err := svc.Activate(bg, token); err {
			case nil:
				ok.Add(1)
			case ErrInviteUsed:
				used.Add(1)
			default:
				t.Errorf("unexpected error: %v", err)
			}
		}()
	}
	wg.Wait()
	if ok.Load() != 1 || used.Load() != 49 {
		t.Fatalf("successes %d, used %d; want 1 and 49", ok.Load(), used.Load())
	}
	_ = st.View(bg, func(tx state.Tx) error {
		if len(tx.ListAccounts()) != 1 || len(tx.ListSessions()) != 1 {
			t.Errorf("accounts %d, sessions %d, want 1 and 1", len(tx.ListAccounts()), len(tx.ListSessions()))
		}
		return nil
	})
}

func TestActivationDoesNotChangeSeatCount(t *testing.T) {
	svc, _, _ := newTestService(t, func(c *Config) { c.SeatCap = 2 })
	links, err := svc.CreateInvites(bg, "a@x.org", 2, "")
	if err != nil {
		t.Fatal(err)
	}
	for _, l := range links {
		if _, err := svc.Activate(bg, tokenOf(t, l)); err != nil {
			t.Fatalf("a pending invite already holds its seat, activation must succeed: %v", err)
		}
	}
	if _, err := svc.CreateInvites(bg, "a@x.org", 1, ""); err != ErrSeatCap {
		t.Errorf("two accounts fill two seats: %v", err)
	}
}
