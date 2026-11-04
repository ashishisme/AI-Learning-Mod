// SPEC: DC-06, DC-09, FR-023, FR-029, FR-054
package state

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math/rand/v2"
	"net"
	"net/http"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"
)

// Collections. Each record is stored as JSON in the unindexed field "data", plus only the fields
// that queries need. See specs/008-cloud-beta-deployment/cloud-beta-design.md section 2.
const (
	collInvites  = "invites"
	collAccounts = "accounts"
	collSessions = "sessions"
	collAudit    = "audit"
	collCounters = "counters"
	collAttempts = "attempts"
	collFeedback = "feedback"
	collMeta     = "meta"

	fieldData  = "data"
	fieldID    = "id"
	fieldBeta  = "betaId"
	fieldKey   = "key"
	fieldValue = "value"
	fieldSeq   = "seq"

	auditSeqDoc = "auditSeq"
)

// FirestoreConfig configures the store. The zero values of everything but ProjectID suit Cloud Run.
type FirestoreConfig struct {
	ProjectID   string
	Database    string                                    // default (default); tests use throwaway databases
	BaseURL     string                                    // default https://firestore.googleapis.com
	Token       func(ctx context.Context) (string, error) // default: the runtime identity's metadata-server token
	HTTP        *http.Client
	MaxAttempts int           // tries for a transaction that keeps conflicting, default 5
	TxTimeout   time.Duration // limit for one Do or View including its retries, default 15 s
}

// FirestoreStore keeps state in Firestore Native mode over its REST API, using only the standard
// library because DC-06 allows no new module. It is safe to share a database between instances.
type FirestoreStore struct {
	cfg  FirestoreConfig
	root string // projects/{p}/databases/{database}
}

// OpenFirestoreStore checks the database can be read, so a misconfigured revision fails at startup
// instead of on a learner's first request.
func OpenFirestoreStore(ctx context.Context, cfg FirestoreConfig) (*FirestoreStore, error) {
	if cfg.ProjectID == "" {
		return nil, errors.New("state: a Firestore project ID is required")
	}
	if cfg.BaseURL == "" {
		cfg.BaseURL = "https://firestore.googleapis.com"
	}
	cfg.BaseURL = strings.TrimRight(cfg.BaseURL, "/")
	if cfg.HTTP == nil {
		cfg.HTTP = &http.Client{Timeout: 10 * time.Second}
	}
	if cfg.Token == nil {
		cfg.Token = (&metadataToken{client: &http.Client{Timeout: 5 * time.Second}}).get
	}
	if cfg.MaxAttempts <= 0 {
		cfg.MaxAttempts = 5
	}
	if cfg.TxTimeout <= 0 {
		cfg.TxTimeout = 15 * time.Second
	}
	if cfg.Database == "" {
		cfg.Database = "(default)"
	}
	s := &FirestoreStore{cfg: cfg, root: "projects/" + cfg.ProjectID + "/databases/" + cfg.Database}
	if err := s.View(ctx, func(tx Tx) error {
		tx.GetCounter("startup-check")
		return nil
	}); err != nil {
		return nil, fmt.Errorf("state: cannot read Firestore: %w", err)
	}
	return s, nil
}

func (s *FirestoreStore) Do(ctx context.Context, fn func(Tx) error) error {
	return s.run(ctx, fn, false)
}

// DoCounters is the same transaction as Do: batching in memory would hide a spend reservation from
// other instances (FR-025).
func (s *FirestoreStore) DoCounters(ctx context.Context, fn func(Tx) error) error {
	return s.run(ctx, fn, true)
}

func (s *FirestoreStore) run(ctx context.Context, fn func(Tx) error, countersOnly bool) error {
	ctx, cancel := context.WithTimeout(ctx, s.cfg.TxTimeout)
	defer cancel()
	prev := ""
	for attempt := 1; ; attempt++ {
		id, err := s.begin(ctx, prev)
		if err != nil {
			// Nothing is written before a transaction starts, so a transient failure can be retried.
			if attempt >= s.cfg.MaxAttempts || !s.transient(ctx, err) {
				return err
			}
			if err := s.backoff(ctx, attempt); err != nil {
				return err
			}
			continue
		}
		tx := newFsTx(ctx, s, id, false)
		fnErr := fn(tx)
		committing := false
		switch {
		case tx.err != nil:
			err = tx.err // a failed read can never look like "not found" (contract rule 8)
		case fnErr != nil:
			s.rollback(id)
			return fnErr
		case countersOnly && tx.access:
			s.rollback(id)
			return ErrCountersOnly
		case len(tx.writes) == 0:
			s.rollback(id)
			return nil
		default:
			committing = true
			if err = s.commit(ctx, id, tx.writes); err == nil {
				return nil
			}
		}
		// Of commit failures, only ABORTED is known not to have applied: retrying after any other could
		// apply the same change twice, so it fails closed. A failed read has written nothing, so a
		// transient one is retried too (heavy contention makes Firestore hold reads behind locks).
		retry := isAborted(err) || (!committing && s.transient(ctx, err))
		if !retry || attempt >= s.cfg.MaxAttempts {
			s.rollback(id)
			return err
		}
		if !isAborted(err) {
			s.rollback(id) // release its locks; an aborted transaction holds none
		}
		prev = id
		if err := s.backoff(ctx, attempt); err != nil {
			return err
		}
	}
}

// backoff waits a random, growing time before the next attempt, or returns when ctx ends.
func (s *FirestoreStore) backoff(ctx context.Context, attempt int) error {
	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-time.After(time.Duration(rand.Int64N(int64(50*time.Millisecond) << min(attempt, 6)))):
		return nil
	}
}

// transient is true for a failure that wrote nothing and may succeed on a later try: aborted, busy,
// overloaded, or one request timing out while the whole transaction still has time left.
func (s *FirestoreStore) transient(ctx context.Context, err error) bool {
	if ctx.Err() != nil {
		return false
	}
	var e *apiError
	if errors.As(err, &e) {
		switch e.Status {
		case "ABORTED", "UNAVAILABLE", "DEADLINE_EXCEEDED", "RESOURCE_EXHAUSTED":
			return true
		}
		return false
	}
	var ne net.Error
	return errors.As(err, &ne) && ne.Timeout()
}

// View needs no commit or rollback: a read-only transaction holds no locks.
func (s *FirestoreStore) View(ctx context.Context, fn func(Tx) error) error {
	ctx, cancel := context.WithTimeout(ctx, s.cfg.TxTimeout)
	defer cancel()
	var res struct {
		Transaction string `json:"transaction"`
	}
	body := map[string]any{"options": map[string]any{"readOnly": map[string]any{}}}
	if err := s.call(ctx, ":beginTransaction", body, &res); err != nil {
		return err
	}
	tx := newFsTx(ctx, s, res.Transaction, true)
	fnErr := fn(tx)
	switch {
	case tx.err != nil:
		return tx.err
	case fnErr != nil:
		return fnErr
	case tx.violation:
		return ErrReadOnly
	}
	return nil
}

// Flush has nothing to do: every commit is already durable.
func (s *FirestoreStore) Flush(context.Context) error { return nil }

func (s *FirestoreStore) Close() error { return nil }

// ---- REST calls

func (s *FirestoreStore) begin(ctx context.Context, retryOf string) (string, error) {
	rw := map[string]any{}
	if retryOf != "" {
		rw["retryTransaction"] = retryOf
	}
	var res struct {
		Transaction string `json:"transaction"`
	}
	err := s.call(ctx, ":beginTransaction", map[string]any{"options": map[string]any{"readWrite": rw}}, &res)
	if err != nil && retryOf != "" {
		// The earlier transaction may already be closed. Citing it only gains priority, so it is not
		// worth failing the request over. Nothing has been written by this point.
		err = s.call(ctx, ":beginTransaction", map[string]any{"options": map[string]any{"readWrite": map[string]any{}}}, &res)
	}
	return res.Transaction, err
}

func (s *FirestoreStore) commit(ctx context.Context, id string, writes map[string]*fsDoc) error {
	list := make([]map[string]any, 0, len(writes))
	for name, d := range writes {
		if d == nil {
			list = append(list, map[string]any{"delete": name})
		} else {
			list = append(list, map[string]any{"update": map[string]any{"name": name, "fields": d.fields}})
		}
	}
	return s.call(ctx, ":commit", map[string]any{"writes": list, "transaction": id}, nil)
}

// rollback is best effort and has its own deadline: the caller's context may be why it is needed,
// and an abandoned transaction expires on its own.
func (s *FirestoreStore) rollback(id string) {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	_ = s.call(ctx, ":rollback", map[string]any{"transaction": id}, nil)
}

// apiError carries only the status: a response body can quote document names, which hold hashes and
// Beta IDs, and these errors reach the logs.
type apiError struct {
	Code   int
	Status string
}

func (e *apiError) Error() string { return fmt.Sprintf("state: firestore %s (%d)", e.Status, e.Code) }

func isAborted(err error) bool {
	var e *apiError
	return errors.As(err, &e) && e.Status == "ABORTED"
}

func (s *FirestoreStore) call(ctx context.Context, verb string, body, out any) error {
	raw, err := json.Marshal(body)
	if err != nil {
		return err
	}
	token, err := s.cfg.Token(ctx)
	if err != nil {
		return fmt.Errorf("state: firestore credentials: %w", err)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, s.cfg.BaseURL+"/v1/"+s.root+"/documents"+verb, bytes.NewReader(raw))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := s.cfg.HTTP.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}
	if resp.StatusCode != http.StatusOK {
		e := &apiError{Code: resp.StatusCode, Status: "UNKNOWN"}
		var parsed struct {
			Error struct {
				Status string `json:"status"`
			} `json:"error"`
		}
		// A streaming method reports its error inside a one-item array.
		trimmed := bytes.TrimPrefix(bytes.TrimSpace(data), []byte("["))
		trimmed = bytes.TrimSuffix(bytes.TrimSpace(trimmed), []byte("]"))
		if json.Unmarshal(trimmed, &parsed) == nil && parsed.Error.Status != "" {
			e.Status = parsed.Error.Status
		}
		return e
	}
	if out == nil {
		return nil
	}
	return json.Unmarshal(data, out)
}

// metadataToken fetches and caches the runtime identity's access token (FR-023).
type metadataToken struct {
	client  *http.Client
	mu      sync.Mutex
	token   string
	expires time.Time
}

const metadataTokenURL = "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token"

func (m *metadataToken) get(ctx context.Context) (string, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.token != "" && time.Now().Before(m.expires) {
		return m.token, nil
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, metadataTokenURL, nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("Metadata-Flavor", "Google")
	resp, err := m.client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("metadata server returned %d", resp.StatusCode)
	}
	var res struct {
		AccessToken string `json:"access_token"`
		ExpiresIn   int64  `json:"expires_in"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return "", err
	}
	m.token = res.AccessToken
	m.expires = time.Now().Add(time.Duration(res.ExpiresIn)*time.Second - time.Minute)
	return m.token, nil
}

// ---- documents

type fsValue struct {
	StringValue  *string `json:"stringValue,omitempty"`
	IntegerValue *string `json:"integerValue,omitempty"`
}

func strVal(v string) fsValue { return fsValue{StringValue: &v} }
func intVal(v int64) fsValue {
	s := strconv.FormatInt(v, 10)
	return fsValue{IntegerValue: &s}
}
func (v fsValue) str() string {
	if v.StringValue == nil {
		return ""
	}
	return *v.StringValue
}
func (v fsValue) num() int64 {
	if v.IntegerValue == nil {
		return 0
	}
	n, _ := strconv.ParseInt(*v.IntegerValue, 10, 64)
	return n
}

type fsDoc struct {
	Name   string             `json:"name,omitempty"`
	fields map[string]fsValue // filled from Fields; kept apart so commit controls the wire shape
	Fields map[string]fsValue `json:"fields,omitempty"`
}

func (d *fsDoc) norm() *fsDoc {
	d.fields = d.Fields
	return d
}

func jsonDoc[T any](v T, extra map[string]fsValue) (*fsDoc, error) {
	raw, err := json.Marshal(v)
	if err != nil {
		return nil, err
	}
	if extra == nil {
		extra = map[string]fsValue{}
	}
	extra[fieldData] = strVal(string(raw))
	return &fsDoc{fields: extra}, nil
}

func decode[T any](d *fsDoc) (T, error) {
	var out T
	err := json.Unmarshal([]byte(d.fields[fieldData].str()), &out)
	return out, err
}

// keyID makes a counter or attempt key safe as a document ID, which cannot contain "/".
func keyID(key string) string { return "k_" + base64.RawURLEncoding.EncodeToString([]byte(key)) }

var safeDocID = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9_-]{0,199}$`)

// docID keeps IDs that come from user input, such as a typed Beta ID, from forming an invalid or
// different document path. Stored IDs pass through unchanged, and an encoded ID is itself safe.
func docID(id string) string {
	if safeDocID.MatchString(id) {
		return id
	}
	sum := sha256.Sum256([]byte(id))
	return "x_" + hex.EncodeToString(sum[:])
}

// ---- Tx

type fsTx struct {
	ctx       context.Context
	s         *FirestoreStore
	id        string
	readOnly  bool
	err       error // first backend or encoding failure; it decides the transaction's result
	violation bool
	access    bool // changed something other than counters
	writes    map[string]*fsDoc
	reads     map[string]*fsDoc // documents already read in this transaction; nil means missing
	auditSeq  int64             // -1 until read
}

func newFsTx(ctx context.Context, s *FirestoreStore, id string, readOnly bool) *fsTx {
	return &fsTx{ctx: ctx, s: s, id: id, readOnly: readOnly, writes: map[string]*fsDoc{}, reads: map[string]*fsDoc{}, auditSeq: -1}
}

func (t *fsTx) fail(err error) {
	if t.err == nil {
		t.err = err
	}
}

func (t *fsTx) name(coll, id string) string {
	return t.s.root + "/documents/" + coll + "/" + docID(id)
}

func (t *fsTx) get(coll, id string) *fsDoc {
	name := t.name(coll, id)
	if d, ok := t.writes[name]; ok {
		return d
	}
	if d, ok := t.reads[name]; ok {
		return d
	}
	if t.err != nil {
		return nil
	}
	var rows []struct {
		Found   *fsDoc `json:"found"`
		Missing string `json:"missing"`
	}
	// batchGet, not get: it says "missing" explicitly, and these reads decide seat and invite races.
	body := map[string]any{"documents": []string{name}, "transaction": t.id}
	if err := t.s.call(t.ctx, ":batchGet", body, &rows); err != nil {
		t.fail(err)
		return nil
	}
	var d *fsDoc
	for _, r := range rows {
		if r.Found != nil {
			d = r.Found.norm()
		}
	}
	t.reads[name] = d
	return d
}

// filter is one field condition for a query.
type filter struct {
	field, op string
	value     fsValue
}

func (f filter) wire() map[string]any {
	return map[string]any{"fieldFilter": map[string]any{
		"field": map[string]string{"fieldPath": f.field}, "op": f.op, "value": f.value}}
}

// query returns documents of coll, merged with this transaction's writes. keep decides whether a
// written document belongs in the result; it must agree with filters.
func (t *fsTx) query(coll string, filters []filter, keep func(*fsDoc) bool, order map[string]any, limit int) []*fsDoc {
	if t.err != nil {
		return nil
	}
	q := map[string]any{"from": []map[string]string{{"collectionId": coll}}}
	switch len(filters) {
	case 0:
	case 1:
		q["where"] = filters[0].wire()
	default:
		parts := make([]map[string]any, len(filters))
		for i, f := range filters {
			parts[i] = f.wire()
		}
		q["where"] = map[string]any{"compositeFilter": map[string]any{"op": "AND", "filters": parts}}
	}
	if order != nil {
		q["orderBy"] = []map[string]any{order}
	}
	if limit > 0 {
		q["limit"] = limit + len(t.writes) // writes can remove rows from the page
	}
	var rows []struct {
		Document *fsDoc `json:"document"`
	}
	if err := t.s.call(t.ctx, ":runQuery", map[string]any{"structuredQuery": q, "transaction": t.id}, &rows); err != nil {
		t.fail(err)
		return nil
	}
	prefix := t.s.root + "/documents/" + coll + "/"
	seen := map[string]bool{}
	var out []*fsDoc
	for _, r := range rows {
		if r.Document == nil {
			continue
		}
		d := r.Document.norm()
		seen[d.Name] = true
		if _, written := t.writes[d.Name]; written {
			continue // the written version is added below, if it still belongs
		}
		t.reads[d.Name] = d
		out = append(out, d)
	}
	for name, d := range t.writes {
		if d != nil && strings.HasPrefix(name, prefix) && (keep == nil || keep(d)) {
			d.Name = name
			out = append(out, d)
		}
	}
	return out
}

// put buffers a write. Firestore requires reads before writes, so writes wait for the commit and
// later reads see them through t.writes.
func (t *fsTx) put(coll, id string, d *fsDoc, err error, counter bool) {
	if !t.writable(counter) {
		return
	}
	if err != nil {
		t.fail(err)
		return
	}
	t.writes[t.name(coll, id)] = d
}

func (t *fsTx) del(coll, id string, counter bool) {
	if t.writable(counter) {
		t.writes[t.name(coll, id)] = nil
	}
}

func (t *fsTx) writable(counter bool) bool {
	if t.readOnly {
		t.violation = true
		return false
	}
	if !counter {
		t.access = true
	}
	return true
}

func getRecord[T any](t *fsTx, coll, id string) (T, bool) {
	var zero T
	d := t.get(coll, id)
	if d == nil {
		return zero, false
	}
	v, err := decode[T](d)
	if err != nil {
		t.fail(err)
		return zero, false
	}
	return v, true
}

func listRecords[T any](t *fsTx, coll string) []T {
	docs := t.query(coll, nil, nil, nil, 0)
	out := make([]T, 0, len(docs))
	for _, d := range docs {
		v, err := decode[T](d)
		if err != nil {
			t.fail(err)
			return nil
		}
		out = append(out, v)
	}
	return out
}

func isEqual(field, value string) []filter {
	return []filter{{field, "EQUAL", strVal(value)}}
}

func hasField(field, value string) func(*fsDoc) bool {
	return func(d *fsDoc) bool { return d.fields[field].str() == value }
}

// Invites are keyed by token hash: activation is the race that matters, and a get locks one document.
func (t *fsTx) GetInviteByHash(h string) (Invite, bool) {
	return getRecord[Invite](t, collInvites, h)
}
func (t *fsTx) inviteDocByID(id string) *fsDoc {
	docs := t.query(collInvites, isEqual(fieldID, id), hasField(fieldID, id), nil, 0)
	if len(docs) == 0 {
		return nil
	}
	return docs[0]
}
func (t *fsTx) GetInviteByID(id string) (Invite, bool) {
	d := t.inviteDocByID(id)
	if d == nil {
		return Invite{}, false
	}
	v, err := decode[Invite](d)
	if err != nil {
		t.fail(err)
		return Invite{}, false
	}
	return v, true
}
func (t *fsTx) PutInvite(v Invite) {
	d, err := jsonDoc(v, map[string]fsValue{fieldID: strVal(v.ID)})
	t.put(collInvites, v.TokenHash, d, err, false)
}
func (t *fsTx) ListInvites() []Invite {
	out := listRecords[Invite](t, collInvites)
	sort.Slice(out, func(i, j int) bool { return out[i].CreatedAt.Before(out[j].CreatedAt) })
	return out
}
func (t *fsTx) DeleteInvite(id string) {
	if d := t.inviteDocByID(id); d != nil {
		t.del(collInvites, d.Name[strings.LastIndexByte(d.Name, '/')+1:], false)
	}
}

func (t *fsTx) GetAccount(id string) (Account, bool) { return getRecord[Account](t, collAccounts, id) }
func (t *fsTx) PutAccount(a Account) {
	d, err := jsonDoc(a, nil)
	t.put(collAccounts, a.BetaID, d, err, false)
}
func (t *fsTx) ListAccounts() []Account {
	out := listRecords[Account](t, collAccounts)
	sort.Slice(out, func(i, j int) bool { return out[i].ActivatedAt.Before(out[j].ActivatedAt) })
	return out
}
func (t *fsTx) DeleteAccount(id string) { t.del(collAccounts, id, false) }

func (t *fsTx) GetSession(h string) (Session, bool) { return getRecord[Session](t, collSessions, h) }
func (t *fsTx) PutSession(v Session) {
	d, err := jsonDoc(v, map[string]fsValue{fieldBeta: strVal(v.BetaID)})
	t.put(collSessions, v.TokenHash, d, err, false)
}
func (t *fsTx) DeleteSession(h string) { t.del(collSessions, h, false) }
func (t *fsTx) sessionDocsFor(betaID string) []*fsDoc {
	return t.query(collSessions, isEqual(fieldBeta, betaID), hasField(fieldBeta, betaID), nil, 0)
}
func (t *fsTx) DeleteSessionsFor(betaID string) {
	for _, d := range t.sessionDocsFor(betaID) {
		t.del(collSessions, d.Name[strings.LastIndexByte(d.Name, '/')+1:], false)
	}
}
func (t *fsTx) CountSessionsFor(betaID string) int { return len(t.sessionDocsFor(betaID)) }
func (t *fsTx) ListSessions() []Session            { return listRecords[Session](t, collSessions) }

// AppendAudit takes the next number in the same transaction, so entries have one total order even
// across instances whose clocks differ.
func (t *fsTx) AppendAudit(e AuditEntry) {
	if t.auditSeq < 0 {
		t.auditSeq = 0
		if d := t.get(collMeta, auditSeqDoc); d != nil {
			t.auditSeq = d.fields[fieldValue].num()
		}
	}
	t.auditSeq++
	e.ID = fmt.Sprintf("%s-%06d", e.At.UTC().Format("20060102T150405"), t.auditSeq)
	d, err := jsonDoc(e, map[string]fsValue{fieldSeq: intVal(t.auditSeq)})
	t.put(collAudit, e.ID, d, err, false)
	t.put(collMeta, auditSeqDoc, &fsDoc{fields: map[string]fsValue{fieldValue: intVal(t.auditSeq)}}, nil, false)
}

func auditSeqOf(id string) int64 {
	n, _ := strconv.ParseInt(id[strings.LastIndexByte(id, '-')+1:], 10, 64)
	return n
}

func (t *fsTx) ListAudit(limit int, beforeID string) []AuditEntry {
	var filters []filter
	keep := func(*fsDoc) bool { return true }
	if beforeID != "" {
		before := auditSeqOf(beforeID)
		filters = []filter{{fieldSeq, "LESS_THAN", intVal(before)}}
		keep = func(d *fsDoc) bool { return d.fields[fieldSeq].num() < before }
	}
	order := map[string]any{"field": map[string]string{"fieldPath": fieldSeq}, "direction": "DESCENDING"}
	docs := t.query(collAudit, filters, keep, order, limit)
	sort.Slice(docs, func(i, j int) bool { return docs[i].fields[fieldSeq].num() > docs[j].fields[fieldSeq].num() })
	if limit > 0 && len(docs) > limit {
		docs = docs[:limit]
	}
	var out []AuditEntry
	for _, d := range docs {
		e, err := decode[AuditEntry](d)
		if err != nil {
			t.fail(err)
			return nil
		}
		out = append(out, e)
	}
	return out
}

func (t *fsTx) GetCounter(k string) int64 {
	d := t.get(collCounters, keyID(k))
	if d == nil {
		return 0
	}
	return d.fields[fieldValue].num()
}
func (t *fsTx) AddCounter(k string, delta int64) int64 {
	v := t.GetCounter(k) + delta
	d := &fsDoc{fields: map[string]fsValue{fieldKey: strVal(k), fieldValue: intVal(v)}}
	t.put(collCounters, keyID(k), d, nil, true)
	return v
}
func (t *fsTx) ListCounters(prefix string) map[string]int64 {
	var filters []filter
	if prefix != "" {
		filters = []filter{
			{fieldKey, "GREATER_THAN_OR_EQUAL", strVal(prefix)},
			{fieldKey, "LESS_THAN", strVal(prefix + "")},
		}
	}
	docs := t.query(collCounters, filters, func(d *fsDoc) bool { return strings.HasPrefix(d.fields[fieldKey].str(), prefix) }, nil, 0)
	out := make(map[string]int64, len(docs))
	for _, d := range docs {
		out[d.fields[fieldKey].str()] = d.fields[fieldValue].num()
	}
	return out
}
func (t *fsTx) DeleteCounter(k string) { t.del(collCounters, keyID(k), true) }

func (t *fsTx) GetAttempts(k string) []time.Time {
	v, _ := getRecord[[]time.Time](t, collAttempts, keyID(k))
	return v
}
func (t *fsTx) PutAttempts(k string, ts []time.Time) {
	if len(ts) == 0 {
		t.del(collAttempts, keyID(k), false)
		return
	}
	d, err := jsonDoc(ts, map[string]fsValue{fieldKey: strVal(k)})
	t.put(collAttempts, keyID(k), d, err, false)
}
func (t *fsTx) ListAttemptKeys() []string {
	docs := t.query(collAttempts, nil, nil, nil, 0)
	out := make([]string, 0, len(docs))
	for _, d := range docs {
		out = append(out, d.fields[fieldKey].str())
	}
	return out
}

func (t *fsTx) PutFeedback(f Feedback) {
	d, err := jsonDoc(f, nil)
	t.put(collFeedback, f.ID, d, err, false)
}
func (t *fsTx) GetFeedback(id string) (Feedback, bool) {
	return getRecord[Feedback](t, collFeedback, id)
}
func (t *fsTx) ListFeedback() []Feedback {
	out := listRecords[Feedback](t, collFeedback)
	sort.Slice(out, func(i, j int) bool { return out[i].At.After(out[j].At) })
	return out
}
func (t *fsTx) DeleteFeedback(id string) { t.del(collFeedback, id, false) }
