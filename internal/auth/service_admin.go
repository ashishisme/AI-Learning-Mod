// SPEC: FR-002, FR-009, FR-010, FR-015, FR-016, FR-017
package auth

import (
	"bytes"
	"context"
	"encoding/csv"
	"fmt"
	"sort"
	"strings"
	"time"

	"ai-foundations-coach/internal/state"
)

type AccountRow struct {
	BetaID      string     `json:"betaId"`
	Label       string     `json:"label"`
	Status      string     `json:"status"` // active | expired | revoked (derived)
	ActivatedAt time.Time  `json:"activatedAt"`
	ExpiresAt   time.Time  `json:"expiresAt"`
	LastSeenAt  *time.Time `json:"lastSeenAt"`
	Devices     int        `json:"devices"`
	ActiveNow   bool       `json:"activeNow"`
}

type InviteRow struct {
	ID        string     `json:"id"`
	Label     string     `json:"label"`
	Status    string     `json:"status"` // pending | used | revoked | expired (derived)
	CreatedAt time.Time  `json:"createdAt"`
	ExpiresAt time.Time  `json:"expiresAt"`
	CreatedBy string     `json:"createdBy"`
	UsedAt    *time.Time `json:"usedAt"`
}

type Dashboard struct {
	SeatsUsed       int      `json:"seatsUsed"`
	SeatCap         int      `json:"seatCap"`
	Active          int      `json:"active"`
	Expired         int      `json:"expired"`
	Revoked         int      `json:"revoked"`
	PendingInvites  int      `json:"pendingInvites"`
	ExpiringIn7Days int      `json:"expiringIn7Days"`
	Labels          []string `json:"labels"`
}

// AccountFilter selects and orders accounts. Sort is "lastSeen", "expiry" or "activated" (default).
type AccountFilter struct {
	Label  string
	Status string // active | expired | revoked, empty for all
	Sort   string
	Desc   bool
	Limit  int
	Offset int
}

func derivedStatus(a state.Account, now time.Time) string {
	switch {
	case a.Status == state.AccountRevoked:
		return "revoked"
	case accountExpired(a, now):
		return "expired"
	}
	return "active"
}

func inviteStatus(in state.Invite, now time.Time) string {
	if in.Status == state.InvitePending && now.After(in.ExpiresAt) {
		return "expired"
	}
	return in.Status
}

func rowOf(a state.Account, devices int, now time.Time) AccountRow {
	return AccountRow{BetaID: a.BetaID, Label: a.Label, Status: derivedStatus(a, now), ActivatedAt: a.ActivatedAt,
		ExpiresAt: a.ExpiresAt, LastSeenAt: a.LastSeenAt, Devices: devices}
}

func (s *Service) accountRows(tx state.Tx, f AccountFilter) []AccountRow {
	now := s.now()
	var rows []AccountRow
	// One read of all sessions, not one query per account.
	devices := map[string]int{}
	for _, sess := range tx.ListSessions() {
		devices[sess.BetaID]++
	}
	for _, a := range tx.ListAccounts() {
		if f.Label != "" && a.Label != f.Label {
			continue
		}
		r := rowOf(a, devices[a.BetaID], now)
		if f.Status != "" && r.Status != f.Status {
			continue
		}
		rows = append(rows, r)
	}
	less := func(i, j int) bool { return rows[i].ActivatedAt.Before(rows[j].ActivatedAt) }
	switch f.Sort {
	case "expiry":
		less = func(i, j int) bool { return rows[i].ExpiresAt.Before(rows[j].ExpiresAt) }
	case "lastSeen":
		less = func(i, j int) bool {
			a, b := rows[i].LastSeenAt, rows[j].LastSeenAt
			switch {
			case a == nil:
				return b != nil // never seen sorts first when ascending
			case b == nil:
				return false
			}
			return a.Before(*b)
		}
	}
	sort.SliceStable(rows, func(i, j int) bool {
		if f.Desc {
			return less(j, i)
		}
		return less(i, j)
	})
	return rows
}

// ListAccounts returns one page of accounts and the total matching the filter.
func (s *Service) ListAccounts(ctx context.Context, f AccountFilter) ([]AccountRow, int, error) {
	var rows []AccountRow
	err := s.store.View(ctx, func(tx state.Tx) error { rows = s.accountRows(tx, f); return nil })
	if err != nil {
		return nil, 0, err
	}
	total := len(rows)
	if f.Offset > 0 {
		if f.Offset >= len(rows) {
			rows = nil
		} else {
			rows = rows[f.Offset:]
		}
	}
	if f.Limit > 0 && len(rows) > f.Limit {
		rows = rows[:f.Limit]
	}
	if rows == nil {
		rows = []AccountRow{}
	}
	return rows, total, nil
}

// ListInvites returns invites, newest first, optionally only those with the given derived status.
func (s *Service) ListInvites(ctx context.Context, status string) ([]InviteRow, error) {
	rows := []InviteRow{}
	err := s.store.View(ctx, func(tx state.Tx) error {
		now := s.now()
		for _, in := range tx.ListInvites() {
			st := inviteStatus(in, now)
			if status != "" && st != status {
				continue
			}
			rows = append(rows, InviteRow{ID: in.ID, Label: in.Label, Status: st, CreatedAt: in.CreatedAt, ExpiresAt: in.ExpiresAt, CreatedBy: in.CreatedBy, UsedAt: in.UsedAt})
		}
		return nil
	})
	sort.SliceStable(rows, func(i, j int) bool { return rows[i].CreatedAt.After(rows[j].CreatedAt) })
	return rows, err
}

// Dashboard summarises seats and accounts. Seat numbers are global; the other counts follow label.
func (s *Service) Dashboard(ctx context.Context, label string) (Dashboard, error) {
	d := Dashboard{SeatCap: s.cfg.SeatCap, Labels: []string{}}
	err := s.store.View(ctx, func(tx state.Tx) error {
		now := s.now()
		d.SeatsUsed = seatsUsed(tx, now)
		labels := map[string]bool{}
		for _, a := range tx.ListAccounts() {
			if a.Label != "" {
				labels[a.Label] = true
			}
			if label != "" && a.Label != label {
				continue
			}
			switch derivedStatus(a, now) {
			case "active":
				d.Active++
				if a.ExpiresAt.Sub(now) <= 7*24*time.Hour {
					d.ExpiringIn7Days++
				}
			case "expired":
				d.Expired++
			case "revoked":
				d.Revoked++
			}
		}
		for _, in := range tx.ListInvites() {
			if in.Label != "" {
				labels[in.Label] = true
			}
			if (label == "" || in.Label == label) && inviteStatus(in, now) == "pending" {
				d.PendingInvites++
			}
		}
		for l := range labels {
			d.Labels = append(d.Labels, l)
		}
		sort.Strings(d.Labels)
		return nil
	})
	return d, err
}

// RevokeInvite stops an unused invite at once and frees its seat.
func (s *Service) RevokeInvite(ctx context.Context, actor, id string) error {
	return s.store.Do(ctx, func(tx state.Tx) error {
		in, ok := tx.GetInviteByID(id)
		if !ok {
			return ErrNotFound
		}
		if in.Status != state.InvitePending {
			return ErrInvalidInput // only a pending invite can be revoked
		}
		in.Status = state.InviteRevoked
		tx.PutInvite(in)
		appendAudit(tx, s.now(), actor, "invite.revoke", id, "")
		return nil
	})
}

// RevokeAccount ends the account and every session of it at once and frees its seat.
func (s *Service) RevokeAccount(ctx context.Context, actor, betaID string) error {
	id := NormalizeBetaID(betaID)
	return s.store.Do(ctx, func(tx state.Tx) error {
		a, ok := tx.GetAccount(id)
		if !ok {
			return ErrNotFound
		}
		a.Status = state.AccountRevoked
		tx.PutAccount(a)
		tx.DeleteSessionsFor(id)
		appendAudit(tx, s.now(), actor, "account.revoke", id, "")
		return nil
	})
}

// ReissuePassword replaces the password and ends all sessions. The expiry date does not change.
// The new password is returned once and is not stored in readable form.
func (s *Service) ReissuePassword(ctx context.Context, actor, betaID string) (string, error) {
	id := NormalizeBetaID(betaID)
	if err := s.store.View(ctx, func(tx state.Tx) error {
		a, ok := tx.GetAccount(id)
		if !ok {
			return ErrNotFound
		}
		if a.Status == state.AccountRevoked {
			return ErrAccountRevoked
		}
		return nil
	}); err != nil {
		return "", err
	}
	password := NewPassphrase()
	hash := HashPassword(NormalizePassword(password)) // slow work stays outside the store lock
	err := s.store.Do(ctx, func(tx state.Tx) error {
		a, ok := tx.GetAccount(id)
		if !ok {
			return ErrNotFound
		}
		if a.Status == state.AccountRevoked {
			return ErrAccountRevoked
		}
		now := s.now()
		a.PasswordHash, a.PasswordReissuedAt = hash, &now
		tx.PutAccount(a)
		tx.DeleteSessionsFor(id)
		appendAudit(tx, now, actor, "account.reissue", id, "")
		return nil
	})
	if err != nil {
		return "", err
	}
	return password, nil
}

// ListAudit returns up to limit audit entries, newest first, older than beforeID when given.
func (s *Service) ListAudit(ctx context.Context, limit int, beforeID string) ([]state.AuditEntry, error) {
	if limit <= 0 || limit > 500 {
		limit = 100
	}
	out := []state.AuditEntry{}
	err := s.store.View(ctx, func(tx state.Tx) error { out = append(out, tx.ListAudit(limit, beforeID)...); return nil })
	return out, err
}

// csvSafe stops a spreadsheet treating a cell as a formula.
func csvSafe(v string) string {
	if v != "" && strings.ContainsRune("=+-@\t\r", rune(v[0])) {
		return "'" + v
	}
	return v
}

// AccountsCSV exports accounts without any password or hash (FR-016).
func (s *Service) AccountsCSV(ctx context.Context, f AccountFilter) ([]byte, error) {
	f.Limit, f.Offset = 0, 0
	var rows []AccountRow
	if err := s.store.View(ctx, func(tx state.Tx) error { rows = s.accountRows(tx, f); return nil }); err != nil {
		return nil, err
	}
	var buf bytes.Buffer
	w := csv.NewWriter(&buf)
	_ = w.Write([]string{"betaId", "label", "status", "activatedAt", "expiresAt", "lastSeenAt"})
	ts := func(t time.Time) string { return t.In(IST).Format(time.RFC3339) }
	for _, r := range rows {
		last := ""
		if r.LastSeenAt != nil {
			last = ts(*r.LastSeenAt)
		}
		_ = w.Write([]string{r.BetaID, csvSafe(r.Label), r.Status, ts(r.ActivatedAt), ts(r.ExpiresAt), last})
	}
	w.Flush()
	return buf.Bytes(), w.Error()
}

// SeatCapMessage is the text shown to an admin when the cap blocks new invites.
func (s *Service) SeatCapMessage() string {
	n := fmt.Sprint(s.cfg.SeatCap)
	for i := len(n) - 3; i > 0; i -= 3 { // thousands separators: 1,000
		n = n[:i] + "," + n[i:]
	}
	return "Seat cap reached (" + n + ")"
}
