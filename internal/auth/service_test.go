// SPEC: FR-002, FR-003, FR-006, FR-017, SC-005
package auth

import (
	"context"
	"path/filepath"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"ai-foundations-coach/internal/state"
)

var bg = context.Background()

type testClock struct{ t atomic.Int64 }

func newClock(t time.Time) *testClock { c := &testClock{}; c.t.Store(t.UnixNano()); return c }
func (c *testClock) Now() time.Time   { return time.Unix(0, c.t.Load()).UTC() }
func (c *testClock) Advance(d time.Duration) {
	c.t.Add(int64(d))
}

// newTestService returns a service on a temp file store with a controllable clock.
func newTestService(t *testing.T, mutate ...func(*Config)) (*Service, state.Store, *testClock) {
	t.Helper()
	st, err := state.OpenFileStore(filepath.Join(t.TempDir(), "state.json"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { st.Close() })
	cfg := DefaultConfig("https://coach.example.org")
	for _, m := range mutate {
		m(&cfg)
	}
	clk := newClock(time.Date(2026, 11, 2, 10, 0, 0, 0, time.UTC))
	svc := NewService(st, cfg)
	svc.SetClock(clk.Now)
	return svc, st, clk
}

func tokenOf(t *testing.T, link string) string {
	t.Helper()
	i := strings.LastIndex(link, "/invite/")
	if i < 0 {
		t.Fatalf("not an invite link: %q", link)
	}
	return link[i+len("/invite/"):]
}

func TestCreateInvitesStoresOnlyHashes(t *testing.T) {
	svc, st, _ := newTestService(t)
	links, err := svc.CreateInvites(bg, "admin@example.org", 3, "School A - Grade 7")
	if err != nil || len(links) != 3 {
		t.Fatalf("links=%v err=%v", links, err)
	}
	_ = st.View(bg, func(tx state.Tx) error {
		invs := tx.ListInvites()
		if len(invs) != 3 {
			t.Fatalf("stored invites: %d", len(invs))
		}
		for i, l := range links {
			tok := tokenOf(t, l)
			if !strings.HasPrefix(l, "https://coach.example.org/invite/") {
				t.Errorf("link %q lacks the base URL", l)
			}
			in, ok := tx.GetInviteByHash(HashToken(tok))
			if !ok || in.Label != "School A - Grade 7" || in.Status != state.InvitePending || in.CreatedBy != "admin@example.org" {
				t.Errorf("link %d: %+v", i, in)
			}
			if in.TokenHash == tok || strings.Contains(in.TokenHash, tok) {
				t.Error("the token itself must not be stored")
			}
			if !in.ExpiresAt.Equal(in.CreatedAt.Add(14 * 24 * time.Hour)) {
				t.Errorf("invite lifetime is %s, want 14 days", in.ExpiresAt.Sub(in.CreatedAt))
			}
		}
		audit := tx.ListAudit(5, "")
		if len(audit) != 1 || audit[0].Action != "invite.create" || strings.Contains(audit[0].Detail, tokenOf(t, links[0])) {
			t.Errorf("audit: %+v", audit)
		}
		return nil
	})
}

func TestCreateInvitesValidation(t *testing.T) {
	svc, _, _ := newTestService(t)
	for name, c := range map[string]struct {
		n     int
		label string
	}{"zero": {0, ""}, "too many": {101, ""}, "label too long": {1, strings.Repeat("a", 41)}, "bad characters": {1, "<script>"}, "at sign": {1, "a@b.c"}} {
		if _, err := svc.CreateInvites(bg, "a@x.org", c.n, c.label); err != ErrInvalidInput {
			t.Errorf("%s: err = %v", name, err)
		}
	}
	if _, err := svc.CreateInvites(bg, "a@x.org", 100, strings.Repeat("a", 40)); err != nil {
		t.Errorf("100 invites with a 40-character label must be accepted: %v", err)
	}
}

func TestSeatCapWholeBatchRefusedAndExpiryFreesSeats(t *testing.T) {
	svc, st, clk := newTestService(t, func(c *Config) { c.SeatCap = 6 })
	if _, err := svc.CreateInvites(bg, "a@x.org", 5, ""); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.CreateInvites(bg, "a@x.org", 2, ""); err != ErrSeatCap {
		t.Fatalf("err = %v, want ErrSeatCap", err)
	}
	_ = st.View(bg, func(tx state.Tx) error {
		if n := len(tx.ListInvites()); n != 5 {
			t.Errorf("a refused batch created invites: %d", n)
		}
		return nil
	})
	clk.Advance(15 * 24 * time.Hour) // all five expire and stop counting
	if _, err := svc.CreateInvites(bg, "a@x.org", 6, ""); err != nil {
		t.Fatalf("seats should be free after invite expiry: %v", err)
	}
}

// SC-005: with 10 seats free, 50 simultaneous single-invite requests produce exactly 10 invites.
func TestSeatCapUnderConcurrency(t *testing.T) {
	svc, st, _ := newTestService(t, func(c *Config) { c.SeatCap = 10 })
	var wg sync.WaitGroup
	var ok, capped atomic.Int32
	for i := 0; i < 50; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			switch _, err := svc.CreateInvites(bg, "a@x.org", 1, ""); err {
			case nil:
				ok.Add(1)
			case ErrSeatCap:
				capped.Add(1)
			default:
				t.Errorf("unexpected error: %v", err)
			}
		}()
	}
	wg.Wait()
	if ok.Load() != 10 || capped.Load() != 40 {
		t.Fatalf("created %d, refused %d; want 10 and 40", ok.Load(), capped.Load())
	}
	_ = st.View(bg, func(tx state.Tx) error {
		if n := len(tx.ListInvites()); n != 10 {
			t.Errorf("stored %d invites, want 10", n)
		}
		return nil
	})
}
