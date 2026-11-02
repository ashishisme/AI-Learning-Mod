// SPEC: DC-09, FR-029
package state

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"
)

const fileVersion = 1

// CounterFlushInterval is how long counter-only changes may wait before being written.
// A variable so tests can shorten it.
var CounterFlushInterval = 5 * time.Second

// data is the whole persisted state.
type data struct {
	Version  int                    `json:"version"`
	Invites  map[string]Invite      `json:"invites"`  // by id
	Accounts map[string]Account     `json:"accounts"` // by Beta ID
	Sessions map[string]Session     `json:"sessions"` // by token hash
	Audit    []AuditEntry           `json:"audit"`
	Counters map[string]int64       `json:"counters"`
	Attempts map[string][]time.Time `json:"attempts"`
	Feedback map[string]Feedback    `json:"feedback"`
	AuditSeq int64                  `json:"auditSeq"`
}

func newData() *data {
	return &data{
		Version:  fileVersion,
		Invites:  map[string]Invite{},
		Accounts: map[string]Account{},
		Sessions: map[string]Session{},
		Counters: map[string]int64{},
		Attempts: map[string][]time.Time{},
		Feedback: map[string]Feedback{},
	}
}

// clone copies the maps. Values are copied on the way in and out of Tx (see the copy helpers), so a
// shallow value copy per entry is enough.
func (d *data) clone() *data {
	c := &data{Version: d.Version, AuditSeq: d.AuditSeq}
	c.Invites = make(map[string]Invite, len(d.Invites))
	for k, v := range d.Invites {
		c.Invites[k] = v
	}
	c.Accounts = make(map[string]Account, len(d.Accounts))
	for k, v := range d.Accounts {
		c.Accounts[k] = v
	}
	c.Sessions = make(map[string]Session, len(d.Sessions))
	for k, v := range d.Sessions {
		c.Sessions[k] = v
	}
	c.Audit = append([]AuditEntry(nil), d.Audit...)
	c.Counters = make(map[string]int64, len(d.Counters))
	for k, v := range d.Counters {
		c.Counters[k] = v
	}
	c.Attempts = make(map[string][]time.Time, len(d.Attempts))
	for k, v := range d.Attempts {
		c.Attempts[k] = v
	}
	c.Feedback = make(map[string]Feedback, len(d.Feedback))
	for k, v := range d.Feedback {
		c.Feedback[k] = v
	}
	return c
}

// FileStore keeps all state in memory and persists it to one JSON file. It is meant for
// development, tests and a single instance with a persistent volume.
type FileStore struct {
	path string
	lock *fileLock

	mu       sync.RWMutex
	d        *data
	dirty    bool // counter-only changes not yet on disk
	timer    *time.Timer
	closed   bool
	writeErr error
}

// OpenFileStore opens (or creates) the state file. It fails if the file is corrupt or has an
// unknown version, and never starts empty over an existing file.
func OpenFileStore(path string) (*FileStore, error) {
	if err := os.MkdirAll(filepath.Dir(path), 0o700); err != nil {
		return nil, fmt.Errorf("state: create directory: %w", err)
	}
	lock, err := acquireLock(path + ".lock")
	if err != nil {
		return nil, err
	}
	fs := &FileStore{path: path, lock: lock, d: newData()}
	raw, err := os.ReadFile(path)
	switch {
	case errors.Is(err, os.ErrNotExist):
		if err := fs.writeLocked(fs.d); err != nil {
			lock.release()
			return nil, err
		}
	case err != nil:
		lock.release()
		return nil, fmt.Errorf("state: read %s: %w", path, err)
	default:
		loaded := newData()
		if err := json.Unmarshal(raw, loaded); err != nil {
			lock.release()
			return nil, fmt.Errorf("state: %s is corrupt: %w", path, err)
		}
		if loaded.Version != fileVersion {
			lock.release()
			return nil, fmt.Errorf("state: %s has unsupported version %d", path, loaded.Version)
		}
		fs.d = loaded.ensureMaps()
	}
	return fs, nil
}

func (d *data) ensureMaps() *data {
	if d.Invites == nil {
		d.Invites = map[string]Invite{}
	}
	if d.Accounts == nil {
		d.Accounts = map[string]Account{}
	}
	if d.Sessions == nil {
		d.Sessions = map[string]Session{}
	}
	if d.Counters == nil {
		d.Counters = map[string]int64{}
	}
	if d.Attempts == nil {
		d.Attempts = map[string][]time.Time{}
	}
	if d.Feedback == nil {
		d.Feedback = map[string]Feedback{}
	}
	return d
}

// writeLocked writes d atomically: temp file, fsync, rename, fsync of the directory.
func (s *FileStore) writeLocked(d *data) error {
	raw, err := json.Marshal(d)
	if err != nil {
		return err
	}
	dir := filepath.Dir(s.path)
	tmp, err := os.CreateTemp(dir, ".state-*.tmp")
	if err != nil {
		return err
	}
	defer os.Remove(tmp.Name())
	if err := tmp.Chmod(0o600); err != nil {
		tmp.Close()
		return err
	}
	if _, err := tmp.Write(raw); err != nil {
		tmp.Close()
		return err
	}
	if err := tmp.Sync(); err != nil {
		tmp.Close()
		return err
	}
	if err := tmp.Close(); err != nil {
		return err
	}
	if err := os.Rename(tmp.Name(), s.path); err != nil {
		return err
	}
	if df, err := os.Open(dir); err == nil {
		_ = df.Sync()
		df.Close()
	}
	return nil
}

func (s *FileStore) Do(ctx context.Context, fn func(Tx) error) error {
	return s.run(ctx, fn, false)
}

func (s *FileStore) DoCounters(ctx context.Context, fn func(Tx) error) error {
	return s.run(ctx, fn, true)
}

func (s *FileStore) run(ctx context.Context, fn func(Tx) error, countersOnly bool) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.closed {
		return errors.New("state: store is closed")
	}
	work := s.d.clone()
	tx := &fileTx{d: work}
	if err := fn(tx); err != nil {
		return err
	}
	if countersOnly && tx.access {
		return ErrCountersOnly
	}
	if tx.access {
		if err := s.writeLocked(work); err != nil {
			return fmt.Errorf("state: write: %w", err)
		}
		s.d = work
		s.dirty = false // the write included any pending counters
		return nil
	}
	if tx.counters {
		s.d = work
		s.dirty = true
		s.scheduleFlushLocked()
	}
	return nil
}

func (s *FileStore) scheduleFlushLocked() {
	if s.timer != nil {
		return
	}
	s.timer = time.AfterFunc(CounterFlushInterval, func() {
		s.mu.Lock()
		defer s.mu.Unlock()
		s.timer = nil
		if s.dirty && !s.closed {
			if err := s.writeLocked(s.d); err == nil {
				s.dirty = false
			} else {
				s.writeErr = err
			}
		}
	})
}

func (s *FileStore) View(ctx context.Context, fn func(Tx) error) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	tx := &fileTx{d: s.d, readOnly: true}
	if err := fn(tx); err != nil {
		return err
	}
	if tx.violation {
		return ErrReadOnly
	}
	return nil
}

func (s *FileStore) Flush(ctx context.Context) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.timer != nil {
		s.timer.Stop()
		s.timer = nil
	}
	if s.dirty {
		if err := s.writeLocked(s.d); err != nil {
			return err
		}
		s.dirty = false
	}
	return nil
}

func (s *FileStore) Close() error {
	err := s.Flush(context.Background())
	s.mu.Lock()
	s.closed = true
	s.mu.Unlock()
	s.lock.release()
	return err
}

// ---- Tx implementation

type fileTx struct {
	d         *data
	readOnly  bool
	violation bool
	access    bool // changed something other than counters
	counters  bool
}

func (t *fileTx) write(counter bool) bool {
	if t.readOnly {
		t.violation = true
		return false
	}
	if counter {
		t.counters = true
	} else {
		t.access = true
	}
	return true
}

func (t *fileTx) GetInviteByHash(h string) (Invite, bool) {
	for _, v := range t.d.Invites {
		if v.TokenHash == h {
			return v, true
		}
	}
	return Invite{}, false
}
func (t *fileTx) GetInviteByID(id string) (Invite, bool) { v, ok := t.d.Invites[id]; return v, ok }
func (t *fileTx) PutInvite(v Invite) {
	if t.write(false) {
		t.d.Invites[v.ID] = v
	}
}
func (t *fileTx) ListInvites() []Invite {
	out := make([]Invite, 0, len(t.d.Invites))
	for _, v := range t.d.Invites {
		out = append(out, v)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].CreatedAt.Before(out[j].CreatedAt) })
	return out
}
func (t *fileTx) DeleteInvite(id string) {
	if t.write(false) {
		delete(t.d.Invites, id)
	}
}

func copyAccount(a Account) Account {
	a.Extensions = append([]Extension(nil), a.Extensions...)
	return a
}
func (t *fileTx) GetAccount(id string) (Account, bool) {
	a, ok := t.d.Accounts[id]
	return copyAccount(a), ok
}
func (t *fileTx) PutAccount(a Account) {
	if t.write(false) {
		t.d.Accounts[a.BetaID] = copyAccount(a)
	}
}
func (t *fileTx) ListAccounts() []Account {
	out := make([]Account, 0, len(t.d.Accounts))
	for _, a := range t.d.Accounts {
		out = append(out, copyAccount(a))
	}
	sort.Slice(out, func(i, j int) bool { return out[i].ActivatedAt.Before(out[j].ActivatedAt) })
	return out
}
func (t *fileTx) DeleteAccount(id string) {
	if t.write(false) {
		delete(t.d.Accounts, id)
	}
}

func (t *fileTx) GetSession(h string) (Session, bool) { v, ok := t.d.Sessions[h]; return v, ok }
func (t *fileTx) PutSession(v Session) {
	if t.write(false) {
		t.d.Sessions[v.TokenHash] = v
	}
}
func (t *fileTx) DeleteSession(h string) {
	if t.write(false) {
		delete(t.d.Sessions, h)
	}
}
func (t *fileTx) DeleteSessionsFor(betaID string) {
	if !t.write(false) {
		return
	}
	for k, v := range t.d.Sessions {
		if v.BetaID == betaID {
			delete(t.d.Sessions, k)
		}
	}
}
func (t *fileTx) CountSessionsFor(betaID string) int {
	n := 0
	for _, v := range t.d.Sessions {
		if v.BetaID == betaID {
			n++
		}
	}
	return n
}
func (t *fileTx) ListSessions() []Session {
	out := make([]Session, 0, len(t.d.Sessions))
	for _, v := range t.d.Sessions {
		out = append(out, v)
	}
	return out
}

func (t *fileTx) AppendAudit(e AuditEntry) {
	if !t.write(false) {
		return
	}
	t.d.AuditSeq++
	e.ID = fmt.Sprintf("%s-%06d", e.At.UTC().Format("20060102T150405"), t.d.AuditSeq)
	t.d.Audit = append(t.d.Audit, e)
}
func (t *fileTx) ListAudit(limit int, beforeID string) []AuditEntry {
	var out []AuditEntry
	for i := len(t.d.Audit) - 1; i >= 0 && (limit <= 0 || len(out) < limit); i-- {
		if beforeID != "" && t.d.Audit[i].ID >= beforeID {
			continue
		}
		out = append(out, t.d.Audit[i])
	}
	return out
}

func (t *fileTx) GetCounter(k string) int64 { return t.d.Counters[k] }
func (t *fileTx) AddCounter(k string, delta int64) int64 {
	if !t.write(true) {
		return 0
	}
	t.d.Counters[k] += delta
	return t.d.Counters[k]
}
func (t *fileTx) ListCounters(prefix string) map[string]int64 {
	out := map[string]int64{}
	for k, v := range t.d.Counters {
		if strings.HasPrefix(k, prefix) {
			out[k] = v
		}
	}
	return out
}
func (t *fileTx) DeleteCounter(k string) {
	if t.write(true) {
		delete(t.d.Counters, k)
	}
}

func (t *fileTx) GetAttempts(k string) []time.Time {
	return append([]time.Time(nil), t.d.Attempts[k]...)
}
func (t *fileTx) PutAttempts(k string, ts []time.Time) {
	if !t.write(false) {
		return
	}
	if len(ts) == 0 {
		delete(t.d.Attempts, k)
		return
	}
	t.d.Attempts[k] = append([]time.Time(nil), ts...)
}
func (t *fileTx) ListAttemptKeys() []string {
	out := make([]string, 0, len(t.d.Attempts))
	for k := range t.d.Attempts {
		out = append(out, k)
	}
	return out
}

func (t *fileTx) PutFeedback(f Feedback) {
	if t.write(false) {
		t.d.Feedback[f.ID] = f
	}
}
func (t *fileTx) GetFeedback(id string) (Feedback, bool) { v, ok := t.d.Feedback[id]; return v, ok }
func (t *fileTx) ListFeedback() []Feedback {
	out := make([]Feedback, 0, len(t.d.Feedback))
	for _, v := range t.d.Feedback {
		out = append(out, v)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].At.After(out[j].At) })
	return out
}
func (t *fileTx) DeleteFeedback(id string) {
	if t.write(false) {
		delete(t.d.Feedback, id)
	}
}
