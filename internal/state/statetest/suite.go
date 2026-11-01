// SPEC: DC-09, FR-006, FR-029, SC-005
// Package statetest is the contract test suite every state.Store implementation must pass.
package statetest

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"sync"
	"testing"
	"time"

	"ai-foundations-coach/internal/state"
)

// Opener opens (or reopens) a store at path.
type Opener func(path string) (state.Store, error)

var ctx = context.Background()

func mustOpen(t *testing.T, open Opener, path string) state.Store {
	t.Helper()
	s, err := open(path)
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	return s
}

// RunStoreTests runs the contract in contracts/store.md against open.
func RunStoreTests(t *testing.T, open Opener) {
	newPath := func(t *testing.T) string { return filepath.Join(t.TempDir(), "state.json") }

	t.Run("rollback on error", func(t *testing.T) {
		s := mustOpen(t, open, newPath(t))
		defer s.Close()
		err := s.Do(ctx, func(tx state.Tx) error {
			tx.PutAccount(state.Account{BetaID: "BETA-AAAA-AAAA"})
			tx.AddCounter("c", 5)
			tx.AppendAudit(state.AuditEntry{At: time.Now(), Actor: "a", Action: "x"})
			return fmt.Errorf("boom")
		})
		if err == nil {
			t.Fatal("expected the error to be returned")
		}
		_ = s.View(ctx, func(tx state.Tx) error {
			if _, ok := tx.GetAccount("BETA-AAAA-AAAA"); ok || tx.GetCounter("c") != 0 || len(tx.ListAudit(10, "")) != 0 {
				t.Error("a failed transaction left changes behind")
			}
			return nil
		})
	})

	t.Run("serialised transactions", func(t *testing.T) {
		s := mustOpen(t, open, newPath(t))
		defer s.Close()
		var mu sync.Mutex
		seen := map[int64]bool{}
		var wg sync.WaitGroup
		for i := 0; i < 50; i++ {
			wg.Add(1)
			go func() {
				defer wg.Done()
				_ = s.Do(ctx, func(tx state.Tx) error {
					n := tx.GetCounter("c")
					tx.AddCounter("c", 1)
					mu.Lock()
					seen[n] = true
					mu.Unlock()
					return nil
				})
			}()
		}
		wg.Wait()
		_ = s.View(ctx, func(tx state.Tx) error {
			if tx.GetCounter("c") != 50 || len(seen) != 50 {
				t.Errorf("counter %d, distinct reads %d, want 50 and 50", tx.GetCounter("c"), len(seen))
			}
			return nil
		})
	})

	t.Run("one winner for one invite under race", func(t *testing.T) {
		s := mustOpen(t, open, newPath(t))
		defer s.Close()
		_ = s.Do(ctx, func(tx state.Tx) error {
			tx.PutInvite(state.Invite{ID: "i1", TokenHash: "h1", Status: state.InvitePending})
			return nil
		})
		var wins int
		var mu sync.Mutex
		var wg sync.WaitGroup
		for i := 0; i < 50; i++ {
			wg.Add(1)
			go func(i int) {
				defer wg.Done()
				_ = s.Do(ctx, func(tx state.Tx) error {
					inv, ok := tx.GetInviteByHash("h1")
					if !ok || inv.Status != state.InvitePending {
						return nil
					}
					inv.Status = state.InviteUsed
					tx.PutInvite(inv)
					tx.PutAccount(state.Account{BetaID: fmt.Sprintf("BETA-%04d-AAAA", i)})
					mu.Lock()
					wins++
					mu.Unlock()
					return nil
				})
			}(i)
		}
		wg.Wait()
		_ = s.View(ctx, func(tx state.Tx) error {
			if wins != 1 || len(tx.ListAccounts()) != 1 {
				t.Errorf("wins %d, accounts %d, want 1 and 1", wins, len(tx.ListAccounts()))
			}
			return nil
		})
	})

	t.Run("hard cap holds under race", func(t *testing.T) {
		s := mustOpen(t, open, newPath(t))
		defer s.Close()
		const cap = 10
		var wg sync.WaitGroup
		for i := 0; i < 50; i++ {
			wg.Add(1)
			go func(i int) {
				defer wg.Done()
				_ = s.Do(ctx, func(tx state.Tx) error {
					if len(tx.ListInvites()) >= cap {
						return nil
					}
					tx.PutInvite(state.Invite{ID: fmt.Sprintf("i%02d", i), TokenHash: fmt.Sprintf("h%02d", i), Status: state.InvitePending})
					return nil
				})
			}(i)
		}
		wg.Wait()
		_ = s.View(ctx, func(tx state.Tx) error {
			if n := len(tx.ListInvites()); n != cap {
				t.Errorf("invites = %d, want exactly %d", n, cap)
			}
			return nil
		})
	})

	t.Run("durable across reopen", func(t *testing.T) {
		path := newPath(t)
		s := mustOpen(t, open, path)
		now := time.Now().UTC().Truncate(time.Second)
		_ = s.Do(ctx, func(tx state.Tx) error {
			tx.PutAccount(state.Account{BetaID: "BETA-AAAA-BBBB", PasswordHash: "h", Label: "L", Status: state.AccountActive, ActivatedAt: now, ExpiresAt: now.Add(time.Hour)})
			tx.PutSession(state.Session{TokenHash: "t", BetaID: "BETA-AAAA-BBBB", ExpiresAt: now.Add(time.Hour)})
			tx.PutAttempts("id:X", []time.Time{now})
			tx.PutFeedback(state.Feedback{ID: "f1", At: now, Review: state.ReviewWaiting})
			tx.AppendAudit(state.AuditEntry{At: now, Actor: "a@x.org", Action: "invite.create", Target: "L"})
			return nil
		})
		_ = s.DoCounters(ctx, func(tx state.Tx) error { tx.AddCounter("usage:2026-11-02:req", 7); return nil })
		if err := s.Close(); err != nil {
			t.Fatal(err)
		}
		s2 := mustOpen(t, open, path)
		defer s2.Close()
		_ = s2.View(ctx, func(tx state.Tx) error {
			a, ok := tx.GetAccount("BETA-AAAA-BBBB")
			if !ok || a.Label != "L" || !a.ExpiresAt.Equal(now.Add(time.Hour)) {
				t.Errorf("account not durable: %+v", a)
			}
			if _, ok := tx.GetSession("t"); !ok {
				t.Error("session not durable")
			}
			if len(tx.GetAttempts("id:X")) != 1 {
				t.Error("attempts not durable")
			}
			if f, ok := tx.GetFeedback("f1"); !ok || f.Review != state.ReviewWaiting {
				t.Error("feedback not durable")
			}
			if len(tx.ListAudit(10, "")) != 1 {
				t.Error("audit not durable")
			}
			if tx.GetCounter("usage:2026-11-02:req") != 7 {
				t.Errorf("counter not durable after Close: %d", tx.GetCounter("usage:2026-11-02:req"))
			}
			return nil
		})
	})

	t.Run("counters durable after Flush", func(t *testing.T) {
		path := newPath(t)
		s := mustOpen(t, open, path)
		_ = s.DoCounters(ctx, func(tx state.Tx) error { tx.AddCounter("k", 3); return nil })
		if err := s.Flush(ctx); err != nil {
			t.Fatal(err)
		}
		raw, err := os.ReadFile(path)
		if err != nil || len(raw) == 0 {
			t.Fatalf("state file unreadable: %v", err)
		}
		s.Close()
		s2 := mustOpen(t, open, path)
		defer s2.Close()
		_ = s2.View(ctx, func(tx state.Tx) error {
			if tx.GetCounter("k") != 3 {
				t.Errorf("counter = %d, want 3", tx.GetCounter("k"))
			}
			return nil
		})
	})

	t.Run("corrupt file is rejected", func(t *testing.T) {
		path := newPath(t)
		if err := os.WriteFile(path, []byte("{not json"), 0o600); err != nil {
			t.Fatal(err)
		}
		if s, err := open(path); err == nil {
			s.Close()
			t.Fatal("a corrupt state file was accepted")
		}
	})

	t.Run("view is read only", func(t *testing.T) {
		s := mustOpen(t, open, newPath(t))
		defer s.Close()
		err := s.View(ctx, func(tx state.Tx) error {
			tx.PutAccount(state.Account{BetaID: "BETA-AAAA-CCCC"})
			return nil
		})
		if err != state.ErrReadOnly {
			t.Fatalf("err = %v, want ErrReadOnly", err)
		}
		_ = s.View(ctx, func(tx state.Tx) error {
			if _, ok := tx.GetAccount("BETA-AAAA-CCCC"); ok {
				t.Error("a write inside View took effect")
			}
			return nil
		})
	})

	t.Run("DoCounters refuses other changes", func(t *testing.T) {
		s := mustOpen(t, open, newPath(t))
		defer s.Close()
		err := s.DoCounters(ctx, func(tx state.Tx) error {
			tx.AddCounter("c", 1)
			tx.PutAccount(state.Account{BetaID: "BETA-AAAA-DDDD"})
			return nil
		})
		if err != state.ErrCountersOnly {
			t.Fatalf("err = %v, want ErrCountersOnly", err)
		}
		_ = s.View(ctx, func(tx state.Tx) error {
			if _, ok := tx.GetAccount("BETA-AAAA-DDDD"); ok || tx.GetCounter("c") != 0 {
				t.Error("a rejected DoCounters left changes behind")
			}
			return nil
		})
	})

	t.Run("returned values are copies", func(t *testing.T) {
		s := mustOpen(t, open, newPath(t))
		defer s.Close()
		_ = s.Do(ctx, func(tx state.Tx) error {
			tx.PutAccount(state.Account{BetaID: "BETA-AAAA-EEEE", Extensions: []state.Extension{{Months: 2}}})
			return nil
		})
		_ = s.Do(ctx, func(tx state.Tx) error {
			a, _ := tx.GetAccount("BETA-AAAA-EEEE")
			a.Extensions[0].Months = 99
			a.Extensions = append(a.Extensions, state.Extension{Months: 1})
			return fmt.Errorf("discard") // never Put
		})
		_ = s.View(ctx, func(tx state.Tx) error {
			a, _ := tx.GetAccount("BETA-AAAA-EEEE")
			if len(a.Extensions) != 1 || a.Extensions[0].Months != 2 {
				t.Errorf("stored account was changed through a returned copy: %+v", a.Extensions)
			}
			return nil
		})
	})

	t.Run("audit is newest first and pages", func(t *testing.T) {
		s := mustOpen(t, open, newPath(t))
		defer s.Close()
		base := time.Date(2026, 11, 2, 10, 0, 0, 0, time.UTC)
		_ = s.Do(ctx, func(tx state.Tx) error {
			for i := 0; i < 5; i++ {
				tx.AppendAudit(state.AuditEntry{At: base.Add(time.Duration(i) * time.Second), Actor: "a", Action: fmt.Sprint(i)})
			}
			return nil
		})
		_ = s.View(ctx, func(tx state.Tx) error {
			first := tx.ListAudit(2, "")
			if len(first) != 2 || first[0].Action != "4" || first[1].Action != "3" {
				t.Fatalf("first page: %+v", first)
			}
			next := tx.ListAudit(10, first[1].ID)
			actions := []string{}
			for _, e := range next {
				actions = append(actions, e.Action)
			}
			if !sort.StringsAreSorted(reverse(actions)) || len(next) != 3 {
				t.Errorf("next page: %v", actions)
			}
			return nil
		})
	})
}

func reverse(in []string) []string {
	out := make([]string, len(in))
	for i, v := range in {
		out[len(in)-1-i] = v
	}
	return out
}
