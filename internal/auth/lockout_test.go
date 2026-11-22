// SPEC: FR-013, SC-004, SC-009
package auth

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"testing"
	"time"

	"ai-foundations-coach/internal/state"
)

const addr1 = "203.0.113.10"

func failN(t *testing.T, svc *Service, id, addr string, n int) {
	t.Helper()
	for i := 0; i < n; i++ {
		if _, err := svc.Login(bg, id, "wrong-wrong-wrong-wrong-000", addr); err != ErrBadCredentials {
			t.Fatalf("failure %d: %v", i+1, err)
		}
	}
}

func isLocked(err error) (*LockedError, bool) {
	var le *LockedError
	ok := errors.As(err, &le) && errors.Is(err, ErrLocked)
	return le, ok
}

func TestTenFailuresLockTheAccountEvenForTheRightPassword(t *testing.T) {
	svc, _, clk := newTestService(t)
	act := newLearner(t, svc)
	for i := 0; i < 10; i++ { // spread over many addresses: only the account key can lock
		if _, err := svc.Login(bg, act.BetaID, "wrong-wrong-wrong-wrong-000", fmt.Sprintf("198.51.100.%d", i+1)); err != ErrBadCredentials {
			t.Fatalf("failure %d: %v", i+1, err)
		}
	}
	_, err := svc.Login(bg, act.BetaID, act.Password, "192.0.2.77")
	le, locked := isLocked(err)
	if !locked || le.RetryAfter <= 14*time.Minute || le.RetryAfter > 15*time.Minute {
		t.Fatalf("11th attempt with the right password: %v (%+v)", err, le)
	}

	clk.Advance(14 * time.Minute)
	if _, err := svc.Login(bg, act.BetaID, act.Password, "192.0.2.77"); err == nil {
		t.Error("still blocked one minute before the 15 minutes are over")
	}
	clk.Advance(61 * time.Second)
	if _, err := svc.Login(bg, act.BetaID, act.Password, "192.0.2.77"); err != nil {
		t.Errorf("after 15 minutes the block must be over: %v", err)
	}
}

func TestTenFailuresFromOneAddressBlockThatAddress(t *testing.T) {
	svc, _, _ := newTestService(t)
	act := newLearner(t, svc)
	for i := 0; i < 10; i++ { // ten different, unknown IDs
		if _, err := svc.Login(bg, fmt.Sprintf("BETA-AAAA-AAA%d", i), "x", addr1); err != ErrBadCredentials {
			t.Fatalf("failure %d: %v", i+1, err)
		}
	}
	if _, err := svc.Login(bg, act.BetaID, act.Password, addr1); err == nil {
		t.Fatal("a blocked address must be refused even with valid credentials")
	} else if _, locked := isLocked(err); !locked {
		t.Fatalf("want a lockout, got %v", err)
	}
	if _, err := svc.Login(bg, act.BetaID, act.Password, "203.0.113.99"); err != nil {
		t.Errorf("another address is unaffected: %v", err)
	}
}

func TestUnknownIDsOnlyCountAgainstTheAddress(t *testing.T) {
	svc, st, _ := newTestService(t)
	for i := 0; i < 5; i++ {
		_, _ = svc.Login(bg, fmt.Sprintf("BETA-QQQQ-QQQ%d", i), "x", addr1)
	}
	_ = st.View(bg, func(tx state.Tx) error {
		keys := tx.ListAttemptKeys()
		if len(keys) != 1 || keys[0] != svc.ipKey(addr1) {
			t.Errorf("only the address may be tracked for unknown IDs (no unbounded growth): %v", keys)
		}
		return nil
	})
}

func TestSuccessClearsTheAccountCounter(t *testing.T) {
	svc, _, _ := newTestService(t)
	act := newLearner(t, svc)
	failN(t, svc, act.BetaID, "198.51.100.1", 9)
	if _, err := svc.Login(bg, act.BetaID, act.Password, "198.51.100.2"); err != nil {
		t.Fatal(err)
	}
	failN(t, svc, act.BetaID, "198.51.100.3", 9) // would be 18 without the reset
	if _, err := svc.Login(bg, act.BetaID, act.Password, "198.51.100.4"); err != nil {
		t.Errorf("9 failures after a success are still allowed: %v", err)
	}
}

func TestFailuresOutsideTheWindowDoNotCount(t *testing.T) {
	svc, _, clk := newTestService(t)
	act := newLearner(t, svc)
	failN(t, svc, act.BetaID, "198.51.100.1", 9)
	clk.Advance(16 * time.Minute)
	failN(t, svc, act.BetaID, "198.51.100.2", 9)
	if _, err := svc.Login(bg, act.BetaID, act.Password, "198.51.100.3"); err != nil {
		t.Errorf("only 9 failures are inside the window: %v", err)
	}
}

// SC-004 / class of 40: correct sign-ins never count, so a school network can sign in together.
func TestFortyLearnersBehindOneAddressAllSignIn(t *testing.T) {
	svc, _, _ := newTestService(t)
	var acts []Activation
	for i := 0; i < 40; i++ {
		acts = append(acts, newLearner(t, svc))
	}
	for i, a := range acts {
		if _, err := svc.Login(bg, a.BetaID, a.Password, addr1); err != nil {
			t.Fatalf("learner %d of 40: %v", i+1, err)
		}
	}
}

func TestAttemptTablePrunesStaleKeys(t *testing.T) {
	svc, st, clk := newTestService(t)
	// One transaction: each commit rewrites and fsyncs the state file, so 5,200 of them take minutes.
	_ = st.Do(bg, func(tx state.Tx) error {
		for i := 0; i < 5200; i++ {
			tx.PutAttempts(fmt.Sprintf("ip:10.%d.%d.%d", i/65536, (i/256)%256, i%256), []time.Time{clk.Now()})
		}
		return nil
	})
	clk.Advance(20 * time.Minute)
	svc.failedLogins.Store(pruneEvery - 1)
	_, _ = svc.Login(bg, "BETA-NONE-NONE", "x", addr1) // every pruneEvery-th failure prunes
	_ = st.View(bg, func(tx state.Tx) error {
		if n := len(tx.ListAttemptKeys()); n > 10 {
			t.Errorf("stale attempt keys were not pruned: %d left", n)
		}
		return nil
	})
}

// A daily backup outlives the lockout window, so no stored key may hold the address itself.
func TestAddressIsNotStoredInLockoutRecords(t *testing.T) {
	svc, st, _ := newTestService(t)
	_, _ = svc.Login(bg, "BETA-NONE-NONE", "x", "203.0.113.77")
	_ = st.View(bg, func(tx state.Tx) error {
		keys := tx.ListAttemptKeys()
		if len(keys) != 1 || strings.Contains(keys[0], "203.0.113.77") {
			t.Errorf("attempt keys: %v", keys)
		}
		return nil
	})
}

// Instances sharing a store and key must share an address lockout.
func TestAddressLockoutIsSharedAcrossInstances(t *testing.T) {
	key := []byte("shared")
	one, st, _ := newTestService(t, func(c *Config) { c.LockoutKey = key })
	two := NewService(st, Config{LockoutKey: key, SeatCap: 1})
	two.SetClock(one.clock)
	for i := 0; i < lockMax; i++ {
		_, _ = one.Login(bg, "BETA-NONE-NONE", "x", addr1)
	}
	if _, err := two.Login(bg, "BETA-NONE-NONE", "x", addr1); !errors.Is(err, ErrLocked) {
		t.Errorf("the second instance must see the lockout: %v", err)
	}
}

type failingDo struct{ state.Store }

func (failingDo) Do(context.Context, func(state.Tx) error) error { return errors.New("store down") }

// An outage must not allow unlimited guessing.
func TestFailedSignInIsRefusedWhenItCannotBeRecorded(t *testing.T) {
	_, st, _ := newTestService(t)
	svc := NewService(failingDo{st}, DefaultConfig("https://coach.example.org"))
	_, err := svc.Login(bg, "BETA-NONE-NONE", "x", addr1)
	if err == nil || errors.Is(err, ErrBadCredentials) {
		t.Errorf("a failure that was not recorded must not look like a normal refusal: %v", err)
	}
}
