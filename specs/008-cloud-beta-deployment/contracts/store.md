# Contract: `state.Store` and `state.Tx`

**Feature**: SPEC-008 | **Date**: 2026-11-01

Every implementation (the file store now, a managed serverless adapter later) must satisfy this contract and pass the same shared test suite (`state.RunStoreTests(t, factory)`).

## Interface

```go
type Store interface {
    // Do runs fn as one atomic, serialised transaction. If fn returns an error nothing it did is kept.
    // Reads inside fn see all earlier committed transactions and fn's own writes.
    Do(ctx context.Context, fn func(Tx) error) error

    // View runs fn against a consistent read-only snapshot. Any write inside it returns ErrReadOnly.
    // Used for the per-request session check so it never copies or locks out writers longer than needed.
    View(ctx context.Context, fn func(Tx) error) error

    // DoCounters runs a transaction that only changes counters. An implementation may batch these
    // for durability (they are operational statistics); they must still be visible to later reads.
    DoCounters(ctx context.Context, fn func(Tx) error) error

    // Flush makes everything committed so far durable. Called on graceful shutdown.
    Flush(ctx context.Context) error

    // Close flushes and releases the store (and, for the file store, its lock).
    Close() error
}

type Tx interface {
    // Invites
    GetInviteByHash(tokenHash string) (Invite, bool)
    GetInviteByID(id string) (Invite, bool)
    PutInvite(Invite)
    ListInvites() []Invite
    DeleteInvite(id string)

    // Accounts
    GetAccount(betaID string) (Account, bool)
    PutAccount(Account)
    ListAccounts() []Account
    DeleteAccount(betaID string)

    // Sessions (learner)
    GetSession(tokenHash string) (Session, bool)
    PutSession(Session)
    DeleteSession(tokenHash string)
    DeleteSessionsFor(betaID string)
    CountSessionsFor(betaID string) int
    ListSessions() []Session

    // Audit (append-only)
    AppendAudit(AuditEntry)
    ListAudit(limit int, beforeID string) []AuditEntry

    // Counters and lockout attempts
    GetCounter(key string) int64
    AddCounter(key string, delta int64) int64
    ListCounters(prefix string) map[string]int64
    DeleteCounter(key string)
    GetAttempts(key string) []time.Time
    PutAttempts(key string, ts []time.Time)
    ListAttemptKeys() []string

    // Feedback (DC-09 amendment 2, ratified)
    PutFeedback(Feedback)
    GetFeedback(id string) (Feedback, bool)
    ListFeedback() []Feedback
    DeleteFeedback(id string)
}
```

Returned values are copies; mutating them does not change stored state until `Put*` is called.

## Required behaviour (tested for every implementation)

1. **Atomicity**: an error from `fn` rolls back every write made in it.
2. **Isolation**: two concurrent `Do` calls never interleave. 50 goroutines each reading a counter and writing it plus one end at 50.
3. **Uniqueness under race**: 50 goroutines activating one invite in parallel produce exactly one account; 50 goroutines each creating one invite with 10 seats free produce exactly 10.
4. **Durability**: after `Do` returns nil for an access-control change, re-opening the store from the same location shows it. Counter-only changes become durable within 5 seconds or on `Flush`.
5. **Crash safety**: a partially written file is never loaded (temp file, fsync, rename). A corrupt or unknown-version file makes the constructor return an error.
6. **No hidden state**: the store holds exactly the records of the data model and nothing else.
7. **Re-runnable functions**: `fn` may run more than once for one `Do` or `DoCounters`. It must reset anything it captures and have no side effects outside `Tx`. The shared suite runs closures twice to prove this on every backend.
8. **Failure is explicit**: when the backend fails during `fn`, `Do` and `View` return that error in preference to `fn`'s own result and keep none of its writes.

## File store specifics

- Constructor: `state.OpenFileStore(path string) (*FileStore, error)`; creates parent directory with mode 0700 and the file with 0600.
- One `sync.Mutex`; each `Do` works on a copy-on-write view and swaps it in on success.
- Writer goroutine batches counter-only commits every 5 seconds; `Do` that touches anything else writes immediately.
- Intended for development, tests and a single-instance deployment on a persistent volume. It does **not** provide cross-process locking; the constructor takes an exclusive lock file `<path>.lock` and fails if another process holds it.

## Managed adapter notes

The managed adapter is Firestore Native over REST, using the standard library only. [cloud-beta-design.md](../cloud-beta-design.md) sections 2 and 3 hold its data model and transaction rules. `Do` remains the only write path, so handlers do not change. Service closures do change: they must follow rule 7, `Sweep` is split into short transactions, and the seat cap keeps its scan behind a guard counter, because pending invites expire by time and a stored count would drift.
