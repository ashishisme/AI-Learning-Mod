// SPEC: FR-007, FR-008, FR-039, SC-006
package auth

import (
	"context"
	"testing"
	"time"

	"ai-foundations-coach/internal/state"
)

func TestExpiryRefusedAtTheMomentAndSessionsEnd(t *testing.T) {
	svc, _, clk := newTestService(t)
	act := newLearner(t, svc)
	si, _ := svc.Login(bg, act.BetaID, act.Password, "203.0.113.1")

	clk.Advance(act.ExpiresAt.Sub(clk.Now()) - time.Second)
	if _, err := svc.Login(bg, act.BetaID, act.Password, "203.0.113.1"); err != nil {
		t.Errorf("one second before expiry: %v", err)
	}
	clk.Advance(time.Second)
	if _, err := svc.Login(bg, act.BetaID, act.Password, "203.0.113.1"); err != ErrAccountExpired {
		t.Errorf("exactly at expiry: %v", err)
	}
	if _, err := svc.Validate(bg, si.Token); err == nil {
		t.Error("a session must not outlive its account")
	}
}

func TestExtendActiveAddsToCurrentExpiry(t *testing.T) {
	svc, _, clk := newTestService(t)
	act := newLearner(t, svc)
	clk.Advance(24 * time.Hour)
	got, err := svc.Extend(bg, admin, act.BetaID, 2)
	if err != nil {
		t.Fatal(err)
	}
	if want := AddMonthsIST(act.ExpiresAt, 2); !got.Equal(want) {
		t.Errorf("active extension: %s, want %s", got, want)
	}
}

func TestExtendExpiredCountsFromToday(t *testing.T) {
	svc, _, clk := newTestService(t)
	act := newLearner(t, svc)
	clk.Advance(120 * 24 * time.Hour) // expired about two months ago
	if _, err := svc.Login(bg, act.BetaID, act.Password, "203.0.113.1"); err != ErrAccountExpired {
		t.Fatalf("setup: %v", err)
	}
	got, err := svc.Extend(bg, admin, act.BetaID, 0) // 0 means the default, 2 months
	if err != nil {
		t.Fatal(err)
	}
	if want := AddMonthsIST(clk.Now(), 2); !got.Equal(want) {
		t.Errorf("expired extension: %s, want %s (from today)", got, want)
	}
	// SC-006: an extended account signs in immediately, with its old credentials.
	if _, err := svc.Login(bg, act.BetaID, act.Password, "203.0.113.1"); err != nil {
		t.Errorf("sign-in after extension: %v", err)
	}
}

func TestExtendRules(t *testing.T) {
	svc, st, _ := newTestService(t)
	act := newLearner(t, svc)
	for _, m := range []int{-1, 25, 100} {
		if _, err := svc.Extend(bg, admin, act.BetaID, m); err != ErrInvalidInput {
			t.Errorf("months %d: %v", m, err)
		}
	}
	if _, err := svc.Extend(bg, admin, act.BetaID, 24); err != nil {
		t.Errorf("24 months is allowed: %v", err)
	}
	if _, err := svc.Extend(bg, admin, "BETA-ZZZZ-ZZZZ", 2); err != ErrNotFound {
		t.Errorf("unknown: %v", err)
	}
	_ = svc.RevokeAccount(bg, admin, act.BetaID)
	if _, err := svc.Extend(bg, admin, act.BetaID, 2); err != ErrAccountRevoked {
		t.Errorf("revoked accounts must be re-invited, not extended: %v", err)
	}
	_ = st.View(bg, func(tx state.Tx) error {
		a, _ := tx.GetAccount(act.BetaID)
		if len(a.Extensions) != 1 || a.Extensions[0].Months != 24 || a.Extensions[0].By != admin {
			t.Errorf("extension history: %+v", a.Extensions)
		}
		return nil
	})
}

func TestExtendLabelExtendsEveryNonRevokedAccountInTheGroup(t *testing.T) {
	svc, st, _ := newTestService(t)
	var group []Activation
	for i := 0; i < 3; i++ {
		links, _ := svc.CreateInvites(bg, admin, 1, "Class 9")
		a, _ := svc.Activate(bg, tokenOf(t, links[0]))
		group = append(group, a)
	}
	other := newLearner(t, svc) // "Class 7B"
	_ = svc.RevokeAccount(bg, admin, group[2].BetaID)

	n, err := svc.ExtendLabel(bg, admin, "Class 9", 2)
	if err != nil || n != 2 {
		t.Fatalf("extended %d, err %v; want 2", n, err)
	}
	_ = st.View(bg, func(tx state.Tx) error {
		for i, a := range group {
			got, _ := tx.GetAccount(a.BetaID)
			extended := len(got.Extensions) == 1 && got.Extensions[0].ByLabelAction
			if extended != (i < 2) {
				t.Errorf("account %d extended = %v", i, extended)
			}
		}
		o, _ := tx.GetAccount(other.BetaID)
		if len(o.Extensions) != 0 {
			t.Error("another group must be untouched")
		}
		return nil
	})
	for _, bad := range []string{"", "  ", "<x>"} {
		if _, err := svc.ExtendLabel(bg, admin, bad, 2); err != ErrInvalidInput {
			t.Errorf("label %q: %v", bad, err)
		}
	}
	if n, _ := svc.ExtendLabel(bg, admin, "No such group", 2); n != 0 {
		t.Errorf("no match must extend nothing, got %d", n)
	}
}

func TestSweepPurgesAfterNinetyDaysAndKeepsSeatsMeanwhile(t *testing.T) {
	svc, st, clk := newTestService(t, func(c *Config) { c.SeatCap = 1 })
	act := newLearner(t, svc)
	clk.Advance(act.ExpiresAt.Sub(clk.Now()) + 89*24*time.Hour)

	if _, err := svc.Sweep(bg); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.CreateInvites(bg, admin, 1, ""); err != ErrSeatCap {
		t.Errorf("an expired but unpurged account still holds its seat: %v", err)
	}
	clk.Advance(2 * 24 * time.Hour) // now more than 90 days past expiry
	res, err := svc.Sweep(bg)
	if err != nil || res.Accounts != 1 {
		t.Fatalf("sweep: %+v %v", res, err)
	}
	_ = st.View(bg, func(tx state.Tx) error {
		if len(tx.ListAccounts()) != 0 {
			t.Error("account not purged")
		}
		var purge *state.AuditEntry
		for _, e := range tx.ListAudit(10, "") {
			if e.Action == "account.purge" {
				e := e
				purge = &e
			}
		}
		if purge == nil || purge.Actor != "system" || purge.Target != act.BetaID {
			t.Errorf("purge audit entry: %+v", purge)
		}
		return nil
	})
	if _, err := svc.CreateInvites(bg, admin, 1, ""); err != nil {
		t.Errorf("the seat is free after the purge: %v", err)
	}
}

func TestSweepRemovesDeadSessionsOldInvitesAndRunsHooks(t *testing.T) {
	svc, st, clk := newTestService(t)
	act := newLearner(t, svc)
	_ = act
	links, _ := svc.CreateInvites(bg, admin, 1, "")
	called := false
	svc.AddSweepHook(func(context.Context, time.Time) error { called = true; return nil })

	clk.Advance(15 * 24 * time.Hour) // activation session (14 days) is dead; the invite is expired but recent
	res, _ := svc.Sweep(bg)
	if res.Sessions != 1 || res.Invites != 0 || !called {
		t.Errorf("first sweep: %+v hook=%v", res, called)
	}
	clk.Advance(100 * 24 * time.Hour)
	res, _ = svc.Sweep(bg)
	if res.Invites < 1 {
		t.Errorf("old invites must go: %+v", res)
	}
	_ = st
	_ = links
}
