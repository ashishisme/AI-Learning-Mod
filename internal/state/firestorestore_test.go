// SPEC: DC-06, FR-023, FR-029
package state_test

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"os"
	"strings"
	"testing"
	"time"

	"ai-foundations-coach/internal/state"
	"ai-foundations-coach/internal/state/firestorefake"
	"ai-foundations-coach/internal/state/statetest"
)

var bg = context.Background()

func staticToken(context.Context) (string, error) { return "test-token", nil }

// The emulator treats this token as an administrator and tries to parse any other as a JWT.
func emulatorToken(context.Context) (string, error) { return "owner", nil }

func newFake(t *testing.T) (*state.FirestoreStore, *firestorefake.Server) {
	t.Helper()
	srv := firestorefake.New()
	t.Cleanup(srv.Close)
	s, err := state.OpenFirestoreStore(bg, state.FirestoreConfig{ProjectID: "p", BaseURL: srv.URL, Token: staticToken})
	if err != nil {
		t.Fatal(err)
	}
	return s, srv
}

// A heavily contended optimistic fake needs many more tries than production would.
func TestFirestoreStoreContractOnFake(t *testing.T) {
	srv := firestorefake.New()
	t.Cleanup(srv.Close)
	statetest.RunStoreTests(t, func(path string) (state.Store, error) {
		sum := sha256.Sum256([]byte(path))
		return state.OpenFirestoreStore(bg, state.FirestoreConfig{ProjectID: hex.EncodeToString(sum[:8]), BaseURL: srv.URL,
			Token: staticToken, MaxAttempts: 500, TxTimeout: 2 * time.Minute})
	})
}

// Runs only with FIRESTORE_EMULATOR_HOST set. Each test gets its own project, so nothing is shared.
func TestFirestoreStoreContractOnEmulator(t *testing.T) {
	host := os.Getenv("FIRESTORE_EMULATOR_HOST")
	if host == "" {
		t.Skip("FIRESTORE_EMULATOR_HOST is not set")
	}
	run := time.Now().UnixNano()
	defer func(n int) { statetest.Racers = n }(statetest.Racers)
	statetest.Racers = 10
	statetest.RunStoreTests(t, func(path string) (state.Store, error) {
		sum := sha256.Sum256([]byte(path))
		return state.OpenFirestoreStore(bg, state.FirestoreConfig{ProjectID: fmt.Sprintf("t%d-%s", run, hex.EncodeToString(sum[:4])),
			BaseURL: "http://" + host, Token: emulatorToken, MaxAttempts: 50, TxTimeout: 2 * time.Minute})
	})
}

func TestReadFailureInsideATransactionDiscardsItsWrites(t *testing.T) {
	s, srv := newFake(t)
	notFound := errors.New("not found")
	err := s.Do(bg, func(tx state.Tx) error {
		tx.PutAccount(state.Account{BetaID: "BETA-WRITE-KEPT"})
		srv.FailNext(503, "UNAVAILABLE")
		if _, ok := tx.GetAccount("BETA-AAAA-AAAA"); !ok {
			return notFound
		}
		return nil
	})
	if err == nil || errors.Is(err, notFound) {
		t.Fatalf("got %v, want the backend failure", err)
	}
	if n := srv.Calls("commit"); n != 0 {
		t.Errorf("nothing may be committed after a failed read, commits = %d", n)
	}
	_ = s.View(bg, func(tx state.Tx) error {
		if _, ok := tx.GetAccount("BETA-WRITE-KEPT"); ok {
			t.Error("a write survived a failed read")
		}
		return nil
	})
}

func TestViewReportsReadFailure(t *testing.T) {
	s, srv := newFake(t)
	err := s.View(bg, func(tx state.Tx) error {
		srv.FailNext(500, "INTERNAL")
		tx.ListAccounts()
		return nil
	})
	if err == nil {
		t.Fatal("a failed read inside a view must be reported")
	}
}

func TestAbortedCommitReRunsTheTransaction(t *testing.T) {
	s, srv := newFake(t)
	srv.AbortCommits(2)
	runs := 0
	err := s.Do(bg, func(tx state.Tx) error {
		runs++
		tx.AddCounter("c", 1)
		return nil
	})
	if err != nil || runs != 3 {
		t.Fatalf("err %v, runs %d, want nil and 3", err, runs)
	}
	_ = s.View(bg, func(tx state.Tx) error {
		if tx.GetCounter("c") != 1 {
			t.Errorf("counter = %d, want 1: an aborted run must leave nothing behind", tx.GetCounter("c"))
		}
		return nil
	})
}

// Seen on the emulator: citing a closed transaction fails with INTERNAL. A retry must survive that.
func TestRetryStartsAPlainTransactionIfTheOldOneCannotBeCited(t *testing.T) {
	s, srv := newFake(t)
	runs := 0
	err := s.Do(bg, func(tx state.Tx) error {
		runs++
		tx.AddCounter("c", 1)
		if runs == 1 {
			srv.FailNext(409, "ABORTED")  // the commit
			srv.FailNext(500, "INTERNAL") // the begin that cites the closed transaction
		}
		return nil
	})
	if err != nil || runs != 2 {
		t.Fatalf("err %v, runs %d, want nil and 2", err, runs)
	}
	_ = s.View(bg, func(tx state.Tx) error {
		if tx.GetCounter("c") != 1 {
			t.Errorf("counter = %d, want 1", tx.GetCounter("c"))
		}
		return nil
	})
}

func TestRetriesAreBoundedThenFail(t *testing.T) {
	s, srv := newFake(t)
	srv.AbortCommits(100)
	runs := 0
	err := s.Do(bg, func(tx state.Tx) error {
		runs++
		tx.AddCounter("c", 1)
		return nil
	})
	if err == nil || runs != 5 {
		t.Fatalf("err %v, runs %d, want an error after 5", err, runs)
	}
}

// After an unclear failure the commit may have applied, so running again could apply it twice.
func TestOtherCommitFailuresAreNotRetried(t *testing.T) {
	s, srv := newFake(t)
	runs := 0
	err := s.Do(bg, func(tx state.Tx) error {
		runs++
		tx.AddCounter("c", 1)
		srv.FailNext(503, "UNAVAILABLE") // applies to the commit, the next call
		return nil
	})
	if err == nil || runs != 1 {
		t.Fatalf("err %v, runs %d, want an error after 1", err, runs)
	}
}

func TestFunctionErrorRollsBackWithoutCommit(t *testing.T) {
	s, srv := newFake(t)
	boom := errors.New("boom")
	err := s.Do(bg, func(tx state.Tx) error {
		tx.AddCounter("c", 1)
		return boom
	})
	if !errors.Is(err, boom) || srv.Calls("commit") != 0 || srv.Calls("rollback") != 1 {
		t.Errorf("err %v, commits %d, rollbacks %d", err, srv.Calls("commit"), srv.Calls("rollback"))
	}
}

func TestReadOnlyTransactionsAreNotCommitted(t *testing.T) {
	s, srv := newFake(t)
	if err := s.Do(bg, func(tx state.Tx) error { tx.GetCounter("c"); return nil }); err != nil {
		t.Fatal(err)
	}
	if srv.Calls("commit") != 0 {
		t.Error("a transaction with no writes must not commit")
	}
}

func TestErrorsDoNotQuoteTheBackendResponse(t *testing.T) {
	s, srv := newFake(t)
	srv.FailNext(403, "PERMISSION_DENIED")
	err := s.Do(bg, func(tx state.Tx) error { return nil })
	if err == nil || strings.Contains(err.Error(), "secret-name") || !strings.Contains(err.Error(), "PERMISSION_DENIED") {
		t.Errorf("error: %v", err)
	}
}

func TestStartupFailsWhenTheDatabaseCannotBeRead(t *testing.T) {
	srv := firestorefake.New()
	defer srv.Close()
	srv.FailNext(403, "PERMISSION_DENIED")
	if _, err := state.OpenFirestoreStore(bg, state.FirestoreConfig{ProjectID: "p", BaseURL: srv.URL, Token: staticToken}); err == nil {
		t.Error("a database that cannot be read must stop startup")
	}
	if _, err := state.OpenFirestoreStore(bg, state.FirestoreConfig{BaseURL: srv.URL, Token: staticToken}); err == nil {
		t.Error("a missing project ID must stop startup")
	}
}

func TestMissingCredentialsFailClosed(t *testing.T) {
	srv := firestorefake.New()
	defer srv.Close()
	_, err := state.OpenFirestoreStore(bg, state.FirestoreConfig{ProjectID: "p", BaseURL: srv.URL, Token: func(context.Context) (string, error) {
		return "", errors.New("no token")
	}})
	if err == nil {
		t.Error("no credentials must stop startup")
	}
}
