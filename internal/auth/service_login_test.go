// SPEC: FR-001, FR-007, FR-009, FR-012
package auth

import (
	"regexp"
	"testing"
	"time"

	"ai-foundations-coach/internal/state"
)

var (
	betaIDShape   = regexp.MustCompile(`^BETA-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$`)
	passwordShape = regexp.MustCompile(`^([a-z]{3,6}-){4}[0-9]{3}$`)
)

func newLearner(t *testing.T, svc *Service) Activation {
	t.Helper()
	act, err := svc.Activate(bg, oneInvite(t, svc, "Class 7B"))
	if err != nil {
		t.Fatal(err)
	}
	return act
}

func TestLoginSuccessAndNormalisedInput(t *testing.T) {
	svc, _, _ := newTestService(t)
	act := newLearner(t, svc)

	for _, c := range []struct{ id, pw string }{
		{act.BetaID, act.Password},
		{"  " + lowerString(act.BetaID) + " ", "  " + upperString(act.Password) + " "},
		{removeDashes(act.BetaID), spaceDashes(act.Password)},
	} {
		si, err := svc.Login(bg, c.id, c.pw, "203.0.113.5")
		if err != nil {
			t.Fatalf("login with %q / %q: %v", c.id, c.pw, err)
		}
		if si.Token == "" || si.Info.BetaID != act.BetaID || si.Info.Label != "Class 7B" {
			t.Fatalf("sign-in: %+v", si)
		}
		if _, err := svc.Validate(bg, si.Token); err != nil {
			t.Fatalf("a fresh session must validate: %v", err)
		}
	}
}

func TestLoginFailuresAreIndistinguishable(t *testing.T) {
	svc, _, _ := newTestService(t)
	act := newLearner(t, svc)
	if _, err := svc.Login(bg, act.BetaID, "wrong-wrong-wrong-wrong-000", "203.0.113.5"); err != ErrBadCredentials {
		t.Errorf("wrong password: %v", err)
	}
	if _, err := svc.Login(bg, "BETA-ZZZZ-ZZZZ", act.Password, "203.0.113.5"); err != ErrBadCredentials {
		t.Errorf("unknown id: %v", err)
	}
	if _, err := svc.Login(bg, "", "", "203.0.113.5"); err != ErrBadCredentials {
		t.Errorf("empty: %v", err)
	}
}

func TestLoginRefusesExpiredAndRevokedOnlyWithCorrectPassword(t *testing.T) {
	svc, st, clk := newTestService(t)
	act := newLearner(t, svc)
	clk.Advance(61 * 24 * time.Hour) // past two calendar months
	if _, err := svc.Login(bg, act.BetaID, act.Password, "203.0.113.5"); err != ErrAccountExpired {
		t.Errorf("expired with the right password: %v", err)
	}
	if _, err := svc.Login(bg, act.BetaID, "wrong-wrong-wrong-wrong-000", "203.0.113.5"); err != ErrBadCredentials {
		t.Errorf("expired with a wrong password must not reveal the status: %v", err)
	}

	svc2, st2, _ := newTestService(t)
	act2 := newLearner(t, svc2)
	_ = st2.Do(bg, func(tx state.Tx) error {
		a, _ := tx.GetAccount(act2.BetaID)
		a.Status = state.AccountRevoked
		tx.PutAccount(a)
		return nil
	})
	if _, err := svc2.Login(bg, act2.BetaID, act2.Password, "203.0.113.5"); err != ErrAccountRevoked {
		t.Errorf("revoked: %v", err)
	}
	_ = st
}

func TestSessionLifetimeAndRevalidation(t *testing.T) {
	svc, st, clk := newTestService(t)
	act := newLearner(t, svc)

	si, err := svc.Login(bg, act.BetaID, act.Password, "203.0.113.5")
	if err != nil {
		t.Fatal(err)
	}
	if want := clk.Now().Add(14 * 24 * time.Hour); !si.Expires.Equal(want) {
		t.Errorf("session lifetime: %s, want 14 days (%s)", si.Expires, want)
	}

	// The account is revoked: the very next Validate must fail and remove the session.
	_ = st.Do(bg, func(tx state.Tx) error {
		a, _ := tx.GetAccount(act.BetaID)
		a.Status = state.AccountRevoked
		tx.PutAccount(a)
		return nil
	})
	if _, err := svc.Validate(bg, si.Token); err != ErrAccountRevoked {
		t.Errorf("revoked account: %v", err)
	}
	_ = st.View(bg, func(tx state.Tx) error {
		if _, ok := tx.GetSession(HashToken(si.Token)); ok {
			t.Error("a failed validation must delete the session")
		}
		return nil
	})
	if _, err := svc.Validate(bg, si.Token); err != ErrNoSession {
		t.Errorf("after deletion: %v", err)
	}
	if _, err := svc.Validate(bg, "garbage"); err != ErrNoSession {
		t.Errorf("garbage token: %v", err)
	}
}

func TestSessionNeverOutlivesTheAccount(t *testing.T) {
	svc, _, clk := newTestService(t)
	act := newLearner(t, svc)
	clk.Advance(50 * 24 * time.Hour) // 11 days of account life left
	si, err := svc.Login(bg, act.BetaID, act.Password, "203.0.113.5")
	if err != nil {
		t.Fatal(err)
	}
	if !si.Expires.Equal(act.ExpiresAt) {
		t.Errorf("session expires %s, want the account expiry %s", si.Expires, act.ExpiresAt)
	}
	clk.Advance(11*24*time.Hour + time.Second)
	if _, err := svc.Validate(bg, si.Token); err != ErrNoSession && err != ErrAccountExpired {
		t.Errorf("after account expiry: %v", err)
	}
}

func TestReminderWithinSevenDays(t *testing.T) {
	svc, _, clk := newTestService(t)
	act := newLearner(t, svc)
	si, _ := svc.Login(bg, act.BetaID, act.Password, "203.0.113.5")
	if si.Info.ExpiringSoon {
		t.Errorf("fresh account must not be 'expiring soon': %+v", si.Info)
	}
	clk.Advance(56 * 24 * time.Hour) // about 5 days of account life left; the first session is long over
	si, err := svc.Login(bg, act.BetaID, act.Password, "203.0.113.5")
	if err != nil || !si.Info.ExpiringSoon || si.Info.DaysLeft > 7 || si.Info.DaysLeft < 1 {
		t.Fatalf("near expiry: %+v %v", si.Info, err)
	}
	info, err := svc.Validate(bg, si.Token)
	if err != nil || !info.ExpiringSoon {
		t.Errorf("validate near expiry: %+v %v", info, err)
	}
}

func TestLogoutRemovesSession(t *testing.T) {
	svc, _, _ := newTestService(t)
	act := newLearner(t, svc)
	si, _ := svc.Login(bg, act.BetaID, act.Password, "203.0.113.5")
	if err := svc.Logout(bg, si.Token); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Validate(bg, si.Token); err != ErrNoSession {
		t.Errorf("after logout: %v", err)
	}
	if err := svc.Logout(bg, si.Token); err != nil {
		t.Errorf("logging out twice is not an error: %v", err)
	}
}

func lowerString(s string) string {
	return regexp.MustCompile(`[A-Z]`).ReplaceAllStringFunc(s, func(c string) string { return string(c[0] + 32) })
}
func upperString(s string) string {
	return regexp.MustCompile(`[a-z]`).ReplaceAllStringFunc(s, func(c string) string { return string(c[0] - 32) })
}
func removeDashes(s string) string { return regexp.MustCompile(`-`).ReplaceAllString(s, "") }
func spaceDashes(s string) string  { return regexp.MustCompile(`-`).ReplaceAllString(s, " ") }
