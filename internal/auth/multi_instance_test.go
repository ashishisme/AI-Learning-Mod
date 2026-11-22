// SPEC: FR-006, FR-013, FR-029, SC-005, SC-006
package auth

import (
	"context"
	"fmt"
	"os"
	"sync"
	"testing"
	"time"

	"ai-foundations-coach/internal/state"
	"ai-foundations-coach/internal/state/firestorefake"
)

// twoInstances is two services, each with its own store client, on one database: what two Cloud Run
// instances share. It uses the emulator when FIRESTORE_EMULATOR_HOST is set and otherwise the in-process
// fake. Neither proves production concurrency, which only staging can (T120).
func twoInstances(t *testing.T, mutate func(*Config)) (*Service, *Service) {
	t.Helper()
	cfg := state.FirestoreConfig{ProjectID: "p", Token: func(context.Context) (string, error) { return "owner", nil },
		MaxAttempts: 500, TxTimeout: 2 * time.Minute}
	if host := os.Getenv("FIRESTORE_EMULATOR_HOST"); host != "" {
		cfg.BaseURL = "http://" + host
		cfg.ProjectID = fmt.Sprintf("multi-%d", time.Now().UnixNano())
	} else {
		srv := firestorefake.New()
		t.Cleanup(srv.Close)
		cfg.BaseURL = srv.URL
	}
	open := func() *Service {
		st, err := state.OpenFirestoreStore(context.Background(), cfg)
		if err != nil {
			t.Fatal(err)
		}
		cfg := DefaultConfig("https://coach.example.org")
		cfg.LockoutKey = []byte("shared")
		if mutate != nil {
			mutate(&cfg)
		}
		return NewService(st, cfg)
	}
	return open(), open()
}

// SC-005 across instances: a batch that would pass the cap on its own instance must still be refused.
func TestSeatCapIsExactAcrossInstances(t *testing.T) {
	a, b := twoInstances(t, func(c *Config) { c.SeatCap = 10 })
	var wg sync.WaitGroup
	var mu sync.Mutex
	created := 0
	racers := 30
	if os.Getenv("FIRESTORE_EMULATOR_HOST") != "" {
		racers = 12 // see statetest.Racers: the emulator livelocks with many writers on one document
	}
	for i := 0; i < racers; i++ {
		svc := a
		if i%2 == 1 {
			svc = b
		}
		wg.Add(1)
		go func() {
			defer wg.Done()
			if links, err := svc.CreateInvites(bg, admin, 1, ""); err == nil {
				mu.Lock()
				created += len(links)
				mu.Unlock()
			}
		}()
	}
	wg.Wait()
	if created != 10 {
		t.Errorf("created %d invites, want exactly the 10 seats", created)
	}
	d, err := a.Dashboard(bg, "")
	if err != nil || d.SeatsUsed != 10 {
		t.Errorf("seats used %d, %v", d.SeatsUsed, err)
	}
}

func TestOneInviteActivatesOnceAcrossInstances(t *testing.T) {
	a, b := twoInstances(t, nil)
	links, err := a.CreateInvites(bg, admin, 1, "")
	if err != nil {
		t.Fatal(err)
	}
	token := links[0][len("https://coach.example.org/invite/"):]
	var wg sync.WaitGroup
	var mu sync.Mutex
	wins := 0
	for i := 0; i < 8; i++ {
		svc := a
		if i%2 == 1 {
			svc = b
		}
		wg.Add(1)
		go func() {
			defer wg.Done()
			if _, err := svc.Activate(bg, token); err == nil {
				mu.Lock()
				wins++
				mu.Unlock()
			}
		}()
	}
	wg.Wait()
	if wins != 1 {
		t.Errorf("activations = %d, want 1", wins)
	}
}

// A session survives losing the instance that created it, and a revocation on one is seen by another.
func TestSessionsAndRevocationCrossInstances(t *testing.T) {
	a, b := twoInstances(t, nil)
	links, _ := a.CreateInvites(bg, admin, 1, "")
	act, err := a.Activate(bg, links[0][len("https://coach.example.org/invite/"):])
	if err != nil {
		t.Fatal(err)
	}
	if _, err := b.Validate(bg, act.SessionToken); err != nil {
		t.Fatalf("a session from one instance must work on another: %v", err)
	}
	if err := a.RevokeAccount(bg, admin, act.BetaID); err != nil {
		t.Fatal(err)
	}
	if _, err := b.Validate(bg, act.SessionToken); err == nil {
		t.Error("a revocation on one instance must apply on the other at once")
	}
}

func TestSweepAcrossInstancesRemovesEachRecordOnce(t *testing.T) {
	a, b := twoInstances(t, nil)
	now := time.Now().UTC()
	links, _ := a.CreateInvites(bg, admin, 1, "")
	act, err := a.Activate(bg, links[0][len("https://coach.example.org/invite/"):])
	if err != nil {
		t.Fatal(err)
	}
	future := now.AddDate(2, 0, 0)
	a.SetClock(func() time.Time { return future })
	b.SetClock(func() time.Time { return future })
	var wg sync.WaitGroup
	results := make([]SweepResult, 2)
	for i, svc := range []*Service{a, b} {
		wg.Add(1)
		go func() {
			defer wg.Done()
			r, err := svc.Sweep(bg)
			if err != nil {
				t.Error(err)
			}
			results[i] = r
		}()
	}
	wg.Wait()
	if got := results[0].Accounts + results[1].Accounts; got != 1 {
		t.Errorf("account purged %d times, want once: %+v", got, results)
	}
	entries, _ := a.ListAudit(bg, 100, "")
	purges := 0
	for _, e := range entries {
		if e.Action == "account.purge" && e.Target == act.BetaID {
			purges++
		}
	}
	if purges != 1 {
		t.Errorf("purge audit entries = %d, want 1", purges)
	}
}
