// SPEC: FR-009, FR-010, FR-015, FR-016, FR-017
package auth

import (
	"strings"
	"testing"
	"time"

	"ai-foundations-coach/internal/state"
)

const admin = "owner@example.org"

func auditActions(t *testing.T, st state.Store) []string {
	t.Helper()
	var out []string
	_ = st.View(bg, func(tx state.Tx) error {
		for _, e := range tx.ListAudit(100, "") {
			out = append(out, e.Action)
		}
		return nil
	})
	return out
}

func TestRevokingAnInviteFreesItsSeat(t *testing.T) {
	svc, st, _ := newTestService(t, func(c *Config) { c.SeatCap = 2 })
	links, _ := svc.CreateInvites(bg, admin, 2, "A")
	if _, err := svc.CreateInvites(bg, admin, 1, ""); err != ErrSeatCap {
		t.Fatalf("setup: %v", err)
	}
	invs, _ := svc.ListInvites(bg, "pending")
	if len(invs) != 2 {
		t.Fatalf("pending invites: %d", len(invs))
	}
	if err := svc.RevokeInvite(bg, admin, invs[0].ID); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.CreateInvites(bg, admin, 1, ""); err != nil {
		t.Errorf("the freed seat should be usable: %v", err)
	}
	// A revoked link stops working at once.
	revokedLink := ""
	_ = st.View(bg, func(tx state.Tx) error {
		for _, l := range links {
			in, _ := tx.GetInviteByHash(HashToken(tokenOf(t, l)))
			if in.Status == state.InviteRevoked {
				revokedLink = l
			}
		}
		return nil
	})
	if _, err := svc.Activate(bg, tokenOf(t, revokedLink)); err != ErrInviteRevoked {
		t.Errorf("revoked link: %v", err)
	}
	if err := svc.RevokeInvite(bg, admin, "nosuchid"); err != ErrNotFound {
		t.Errorf("unknown id: %v", err)
	}
	if err := svc.RevokeInvite(bg, admin, invs[0].ID); err != ErrInvalidInput {
		t.Errorf("revoking twice: %v", err)
	}
}

func TestRevokingAnAccountEndsSessionsAndFreesTheSeat(t *testing.T) {
	svc, st, _ := newTestService(t, func(c *Config) { c.SeatCap = 1 })
	act := newLearner(t, svc)
	si, err := svc.Login(bg, act.BetaID, act.Password, "203.0.113.9")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := svc.CreateInvites(bg, admin, 1, ""); err != ErrSeatCap {
		t.Fatalf("the account holds the only seat: %v", err)
	}
	if err := svc.RevokeAccount(bg, admin, act.BetaID); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Validate(bg, si.Token); err == nil {
		t.Error("the learner's session must end at once")
	}
	if _, err := svc.Validate(bg, act.SessionToken); err == nil {
		t.Error("the activation session must end too")
	}
	if _, err := svc.Login(bg, act.BetaID, act.Password, "203.0.113.9"); err != ErrAccountRevoked {
		t.Errorf("sign-in after revoke: %v", err)
	}
	if _, err := svc.CreateInvites(bg, admin, 1, ""); err != nil {
		t.Errorf("revoking frees the seat: %v", err)
	}
	if err := svc.RevokeAccount(bg, admin, "BETA-ZZZZ-ZZZZ"); err != ErrNotFound {
		t.Errorf("unknown account: %v", err)
	}
	_ = st
}

func TestReissueInvalidatesOldPasswordButNotExpiry(t *testing.T) {
	svc, _, clk := newTestService(t)
	act := newLearner(t, svc)
	si, _ := svc.Login(bg, act.BetaID, act.Password, "203.0.113.9")
	clk.Advance(time.Hour)

	newPw, err := svc.ReissuePassword(bg, admin, act.BetaID)
	if err != nil || !passwordShape.MatchString(newPw) || newPw == act.Password {
		t.Fatalf("reissue: %q %v", newPw, err)
	}
	if _, err := svc.Login(bg, act.BetaID, act.Password, "203.0.113.9"); err != ErrBadCredentials {
		t.Errorf("old password must stop working at once: %v", err)
	}
	if _, err := svc.Validate(bg, si.Token); err == nil {
		t.Error("existing sessions must end")
	}
	in, err := svc.Login(bg, act.BetaID, newPw, "203.0.113.9")
	if err != nil {
		t.Fatalf("new password: %v", err)
	}
	if !in.Info.ExpiresAt.Equal(act.ExpiresAt) {
		t.Errorf("expiry changed from %s to %s", act.ExpiresAt, in.Info.ExpiresAt)
	}

	_ = svc.RevokeAccount(bg, admin, act.BetaID)
	if _, err := svc.ReissuePassword(bg, admin, act.BetaID); err != ErrAccountRevoked {
		t.Errorf("reissue for a revoked account: %v", err)
	}
	if _, err := svc.ReissuePassword(bg, admin, "BETA-ZZZZ-ZZZZ"); err != ErrNotFound {
		t.Errorf("unknown: %v", err)
	}
}

func TestDashboardCountsAndLabelFilter(t *testing.T) {
	svc, _, clk := newTestService(t)
	mk := func(label string) Activation {
		links, _ := svc.CreateInvites(bg, admin, 1, label)
		a, err := svc.Activate(bg, tokenOf(t, links[0]))
		if err != nil {
			t.Fatal(err)
		}
		return a
	}
	a1, _ := mk("Alpha"), mk("Alpha")
	b1 := mk("Beta")
	_ = svc.RevokeAccount(bg, admin, b1.BetaID)
	_, _ = svc.CreateInvites(bg, admin, 3, "Alpha") // pending

	d, err := svc.Dashboard(bg, "")
	if err != nil {
		t.Fatal(err)
	}
	if d.Active != 2 || d.Revoked != 1 || d.Expired != 0 || d.PendingInvites != 3 || d.SeatsUsed != 5 || d.SeatCap != 1000 {
		t.Errorf("all labels: %+v", d)
	}
	if strings.Join(d.Labels, ",") != "Alpha,Beta" {
		t.Errorf("labels: %v", d.Labels)
	}
	d, _ = svc.Dashboard(bg, "Beta")
	if d.Active != 0 || d.Revoked != 1 || d.PendingInvites != 0 || d.SeatsUsed != 5 {
		t.Errorf("Beta only (seats stay global): %+v", d)
	}

	clk.Advance(54 * 24 * time.Hour) // a1 is about 7 days from expiry
	_ = a1
	d, _ = svc.Dashboard(bg, "Alpha")
	if d.ExpiringIn7Days != 2 {
		t.Errorf("expiring in 7 days: %+v", d)
	}
	clk.Advance(30 * 24 * time.Hour)
	d, _ = svc.Dashboard(bg, "Alpha")
	if d.Expired != 2 || d.Active != 0 {
		t.Errorf("after expiry: %+v", d)
	}
}

func TestListAccountsFilterSortAndPaging(t *testing.T) {
	svc, st, clk := newTestService(t)
	var ids []string
	for i, l := range []string{"A", "A", "B"} {
		links, _ := svc.CreateInvites(bg, admin, 1, l)
		a, _ := svc.Activate(bg, tokenOf(t, links[0]))
		ids = append(ids, a.BetaID)
		clk.Advance(time.Duration(i+1) * time.Hour)
	}
	seen := clk.Now()
	_ = st.Do(bg, func(tx state.Tx) error {
		a, _ := tx.GetAccount(ids[1])
		a.LastSeenAt = &seen
		tx.PutAccount(a)
		return nil
	})
	rows, total, err := svc.ListAccounts(bg, AccountFilter{Label: "A"})
	if err != nil || total != 2 || len(rows) != 2 || rows[0].BetaID != ids[0] {
		t.Fatalf("label filter: %v %d %+v", err, total, rows)
	}
	rows, _, _ = svc.ListAccounts(bg, AccountFilter{Sort: "lastSeen", Desc: true})
	if rows[0].BetaID != ids[1] || rows[0].LastSeenAt == nil {
		t.Errorf("sort by last seen desc: %+v", rows[0])
	}
	rows, total, _ = svc.ListAccounts(bg, AccountFilter{Limit: 2, Offset: 2})
	if total != 3 || len(rows) != 1 {
		t.Errorf("paging: total %d rows %d", total, len(rows))
	}
	if rows, total, _ := svc.ListAccounts(bg, AccountFilter{Status: "revoked"}); total != 0 || rows == nil || len(rows) != 0 {
		t.Errorf("empty result must be an empty list, not nil: %v %d", rows, total)
	}
}

func TestAccountsCSVHasNoSecretsAndIsFormulaSafe(t *testing.T) {
	svc, _, _ := newTestService(t)
	links, _ := svc.CreateInvites(bg, admin, 1, "-cmd")
	act, _ := svc.Activate(bg, tokenOf(t, links[0]))
	raw, err := svc.AccountsCSV(bg, AccountFilter{})
	if err != nil {
		t.Fatal(err)
	}
	out := string(raw)
	if !strings.HasPrefix(out, "betaId,label,status,activatedAt,expiresAt,lastSeenAt\n") || !strings.Contains(out, act.BetaID) {
		t.Errorf("csv: %s", out)
	}
	for _, bad := range []string{act.Password, "pbkdf2", "passwordHash"} {
		if strings.Contains(out, bad) {
			t.Errorf("csv contains %q", bad)
		}
	}
	if !strings.Contains(out, "'-cmd") {
		t.Errorf("a label starting with '-' must be prefixed so a spreadsheet does not read it as a formula: %s", out)
	}
}

func TestEveryAdminActionIsAuditedWithoutSecrets(t *testing.T) {
	svc, st, _ := newTestService(t)
	links, _ := svc.CreateInvites(bg, admin, 2, "X")
	act, _ := svc.Activate(bg, tokenOf(t, links[0]))
	invs, _ := svc.ListInvites(bg, "pending")
	_ = svc.RevokeInvite(bg, admin, invs[0].ID)
	_, _ = svc.Extend(bg, admin, act.BetaID, 2)
	_, _ = svc.ExtendLabel(bg, admin, "X", 1)
	pw, _ := svc.ReissuePassword(bg, admin, act.BetaID)
	_ = svc.RevokeAccount(bg, admin, act.BetaID)

	got := strings.Join(auditActions(t, st), ",")
	for _, want := range []string{"invite.create", "invite.revoke", "account.extend", "account.extend_label", "account.reissue", "account.revoke"} {
		if !strings.Contains(got, want) {
			t.Errorf("audit trail lacks %s: %s", want, got)
		}
	}
	entries, err := svc.ListAudit(bg, 100, "")
	if err != nil || len(entries) != 6 {
		t.Fatalf("entries: %d %v", len(entries), err)
	}
	for _, e := range entries {
		if e.Actor != admin || e.ID == "" || e.At.IsZero() {
			t.Errorf("entry: %+v", e)
		}
		for _, secret := range []string{pw, act.Password, tokenOf(t, links[0])} {
			if strings.Contains(e.Detail+e.Target, secret) {
				t.Errorf("audit entry leaks a secret: %+v", e)
			}
		}
	}
	if entries[0].Action != "account.revoke" {
		t.Errorf("newest first: %s", entries[0].Action)
	}
	if page, _ := svc.ListAudit(bg, 2, entries[1].ID); len(page) != 2 || page[0].ID == entries[0].ID {
		t.Errorf("paging with before: %+v", page)
	}
}

func TestSeatCapMessageFormatsThousands(t *testing.T) {
	for cap, want := range map[int]string{1000: "Seat cap reached (1,000)", 5: "Seat cap reached (5)", 1234567: "Seat cap reached (1,234,567)", 12000: "Seat cap reached (12,000)"} {
		svc, _, _ := newTestService(t, func(c *Config) { c.SeatCap = cap })
		if got := svc.SeatCapMessage(); got != want {
			t.Errorf("cap %d: %q, want %q", cap, got, want)
		}
	}
}
