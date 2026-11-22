// SPEC: DC-09, FR-006, FR-029, SC-005
// Package statetest is the contract test suite every state.Store implementation must pass.
package statetest

import (
	"context"
	"errors"
	"fmt"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"testing"
	"time"

	"ai-foundations-coach/internal/state"
)

// Racers is how many goroutines the race tests use. The contract is 50. The emulator sets fewer: Google
// states it does not mimic production transactions, and at 50 writers on one document its locking
// livelocks (measured 2026-11-02: 20 succeed, 50 do not). Production proof is SPEC-008 T120.
var Racers = 50

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
		for i := 0; i < Racers; i++ {
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
			if tx.GetCounter("c") != int64(Racers) || len(seen) != Racers {
				t.Errorf("counter %d, distinct reads %d, want %d and %d", tx.GetCounter("c"), len(seen), Racers, Racers)
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
		for i := 0; i < Racers; i++ {
			wg.Add(1)
			go func(i int) {
				defer wg.Done()
				won := false
				err := s.Do(ctx, func(tx state.Tx) error {
					won = false // a transaction may run more than once
					inv, ok := tx.GetInviteByHash("h1")
					if !ok || inv.Status != state.InvitePending {
						return nil
					}
					inv.Status = state.InviteUsed
					tx.PutInvite(inv)
					tx.PutAccount(state.Account{BetaID: fmt.Sprintf("BETA-%04d-AAAA", i)})
					won = true
					return nil
				})
				if err == nil && won {
					mu.Lock()
					wins++
					mu.Unlock()
				}
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
		for i := 0; i < Racers; i++ {
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

	t.Run("transaction reads its own writes", func(t *testing.T) {
		s := mustOpen(t, open, newPath(t))
		defer s.Close()
		err := s.Do(ctx, func(tx state.Tx) error {
			tx.PutAccount(state.Account{BetaID: "BETA-AAAA-FFFF", Label: "new"})
			if a, ok := tx.GetAccount("BETA-AAAA-FFFF"); !ok || a.Label != "new" {
				t.Errorf("own write not visible: %+v", a)
			}
			if n := len(tx.ListAccounts()); n != 1 {
				t.Errorf("own write missing from a list: %d", n)
			}
			tx.AddCounter("own", 2)
			if got := tx.AddCounter("own", 3); got != 5 || tx.GetCounter("own") != 5 {
				t.Errorf("counter = %d", got)
			}
			tx.DeleteAccount("BETA-AAAA-FFFF")
			if _, ok := tx.GetAccount("BETA-AAAA-FFFF"); ok || len(tx.ListAccounts()) != 0 {
				t.Error("own delete not visible")
			}
			return nil
		})
		if err != nil {
			t.Fatal(err)
		}
	})

	t.Run("lookups, queries and deletes by field", func(t *testing.T) {
		s := mustOpen(t, open, newPath(t))
		defer s.Close()
		now := time.Now().UTC()
		if err := s.Do(ctx, func(tx state.Tx) error {
			tx.PutInvite(state.Invite{ID: "i1", TokenHash: "hash1", Status: state.InvitePending, CreatedAt: now})
			tx.PutSession(state.Session{TokenHash: "s1", BetaID: "A"})
			tx.PutSession(state.Session{TokenHash: "s2", BetaID: "A"})
			tx.PutSession(state.Session{TokenHash: "s3", BetaID: "B"})
			tx.PutAttempts("ip:x/y", []time.Time{now})
			tx.AddCounter("usage:a/b:1", 1)
			tx.AddCounter("usage:a/b:2", 1)
			tx.AddCounter("other", 1)
			return nil
		}); err != nil {
			t.Fatal(err)
		}
		_ = s.View(ctx, func(tx state.Tx) error {
			if in, ok := tx.GetInviteByHash("hash1"); !ok || in.ID != "i1" {
				t.Errorf("by hash: %+v", in)
			}
			if in, ok := tx.GetInviteByID("i1"); !ok || in.TokenHash != "hash1" {
				t.Errorf("by id: %+v", in)
			}
			if tx.CountSessionsFor("A") != 2 || len(tx.ListSessions()) != 3 {
				t.Errorf("sessions: %d of %d", tx.CountSessionsFor("A"), len(tx.ListSessions()))
			}
			if got := tx.ListCounters("usage:"); len(got) != 2 || got["usage:a/b:1"] != 1 {
				t.Errorf("counters by prefix: %v", got)
			}
			if keys := tx.ListAttemptKeys(); len(keys) != 1 || keys[0] != "ip:x/y" {
				t.Errorf("attempt keys: %v", keys)
			}
			return nil
		})
		if err := s.Do(ctx, func(tx state.Tx) error {
			tx.DeleteInvite("i1")
			tx.DeleteSessionsFor("A")
			tx.DeleteCounter("usage:a/b:1")
			tx.PutAttempts("ip:x/y", nil)
			return nil
		}); err != nil {
			t.Fatal(err)
		}
		_ = s.View(ctx, func(tx state.Tx) error {
			if _, ok := tx.GetInviteByHash("hash1"); ok {
				t.Error("invite not deleted")
			}
			if tx.CountSessionsFor("A") != 0 || tx.CountSessionsFor("B") != 1 {
				t.Error("DeleteSessionsFor removed the wrong sessions")
			}
			if len(tx.ListCounters("usage:")) != 1 || len(tx.ListAttemptKeys()) != 0 {
				t.Error("counter or attempts not deleted")
			}
			return nil
		})
	})

	t.Run("hostile ids find nothing and break nothing", func(t *testing.T) {
		s := mustOpen(t, open, newPath(t))
		defer s.Close()
		hostile := []string{"", ".", "..", "../sessions/x", "a/b", "__name__", "BETA AAAA", strings.Repeat("x", 3000)}
		err := s.View(ctx, func(tx state.Tx) error {
			for _, id := range hostile {
				if _, ok := tx.GetAccount(id); ok {
					t.Errorf("account found for %q", id)
				}
				if _, ok := tx.GetInviteByHash(id); ok {
					t.Errorf("invite found for %q", id)
				}
				if _, ok := tx.GetFeedback(id); ok {
					t.Errorf("feedback found for %q", id)
				}
			}
			return nil
		})
		if err != nil {
			t.Fatalf("a hostile id must read as missing, not fail: %v", err)
		}
	})

	t.Run("audit order survives separate transactions", func(t *testing.T) {
		s := mustOpen(t, open, newPath(t))
		defer s.Close()
		at := time.Date(2026, 11, 2, 10, 0, 0, 0, time.UTC)
		for i := 0; i < 3; i++ {
			if err := s.Do(ctx, func(tx state.Tx) error {
				tx.AppendAudit(state.AuditEntry{At: at, Actor: "a", Action: fmt.Sprint(i)})
				return nil
			}); err != nil {
				t.Fatal(err)
			}
		}
		_ = s.View(ctx, func(tx state.Tx) error {
			got := tx.ListAudit(0, "")
			if len(got) != 3 || got[0].Action != "2" || got[2].Action != "0" {
				t.Errorf("audit order: %+v", got)
			}
			return nil
		})
	})

	t.Run("a closure that runs twice keeps nothing from the first run", func(t *testing.T) {
		s := Rerunning(mustOpen(t, open, newPath(t)))
		defer s.Close()
		runs := 0
		if err := s.Do(ctx, func(tx state.Tx) error {
			runs++
			tx.AddCounter("c", 1)
			return nil
		}); err != nil {
			t.Fatal(err)
		}
		_ = s.View(ctx, func(tx state.Tx) error {
			if runs != 2 || tx.GetCounter("c") != 1 {
				t.Errorf("runs %d, counter %d, want 2 and 1", runs, tx.GetCounter("c"))
			}
			return nil
		})
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

// Rerunning makes every Do and DoCounters run fn twice, rolling the first run back, so a closure that
// is not safe to re-run shows up in the tests of the code that wrote it (contracts/store.md rule 7).
func Rerunning(s state.Store) state.Store { return rerunning{s} }

type rerunning struct{ state.Store }

var errFirstRun = errors.New("statetest: first run is always rolled back")

func discard(fn func(state.Tx) error) func(state.Tx) error {
	return func(tx state.Tx) error {
		_ = fn(tx)
		return errFirstRun
	}
}

func (r rerunning) Do(ctx context.Context, fn func(state.Tx) error) error {
	_ = r.Store.Do(ctx, discard(fn))
	return r.Store.Do(ctx, fn)
}

func (r rerunning) DoCounters(ctx context.Context, fn func(state.Tx) error) error {
	_ = r.Store.DoCounters(ctx, discard(fn))
	return r.Store.DoCounters(ctx, fn)
}

func reverse(in []string) []string {
	out := make([]string, len(in))
	for i, v := range in {
		out[len(in)-1-i] = v
	}
	return out
}
