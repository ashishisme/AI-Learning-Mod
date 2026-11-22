// SPEC: FR-029
// Package firestorefake is an in-process stand-in for the parts of the Firestore REST API that
// state.FirestoreStore uses. It is for tests only and is never built into the image.
//
// It gives snapshot reads, and at commit it aborts a transaction if anything it read has changed, so
// the adapter's retries really run. It proves the adapter's own logic and wire format as written from
// Google's reference. It does not prove production behaviour: run the suite on the emulator too
// (FIRESTORE_EMULATOR_HOST), and prove production concurrency in staging.
package firestorefake

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"sync"
)

type value = map[string]any

type doc struct {
	Name   string           `json:"name"`
	Fields map[string]value `json:"fields"`
}

type project struct {
	docs     map[string]doc
	versions map[string]int64 // by document name; never deleted, so a recreated document still conflicts
	colls    map[string]int64 // by collection; a query must conflict with an insert
	clock    int64
}

type tx struct {
	readOnly bool
	snapshot map[string]doc
	versions map[string]int64 // as of the snapshot: what this transaction actually saw
	colls    map[string]int64
	reads    map[string]bool
	queries  map[string]bool
}

// Server is the fake. Create one with New and close it with Close.
type Server struct {
	*httptest.Server

	mu       sync.Mutex
	projects map[string]*project
	txs      map[string]*tx
	nextTx   int
	abort    int
	failNext []failure
	calls    map[string]int
}

type failure struct {
	code   int
	status string
}

// New starts a fake server.
func New() *Server {
	s := &Server{projects: map[string]*project{}, txs: map[string]*tx{}, calls: map[string]int{}}
	s.Server = httptest.NewServer(http.HandlerFunc(s.handle))
	return s
}

// AbortCommits makes the next n commits fail with ABORTED.
func (s *Server) AbortCommits(n int) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.abort = n
}

// FailNext makes the next call of any kind fail with this status.
func (s *Server) FailNext(code int, status string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.failNext = append(s.failNext, failure{code, status})
}

// Calls says how many times a method ("commit", "batchGet", ...) was called.
func (s *Server) Calls(method string) int {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.calls[method]
}

// Dump returns every stored document name and field of a project, for privacy scans.
func (s *Server) Dump(projectID string) string {
	s.mu.Lock()
	defer s.mu.Unlock()
	p := s.projects[projectID]
	if p == nil {
		return ""
	}
	raw, _ := json.Marshal(p.docs)
	return string(raw)
}

var (
	pathRe  = regexp.MustCompile(`^/v1/projects/([^/]+)/databases/\(default\)/documents:([a-zA-Z]+)$`)
	badIDRe = regexp.MustCompile(`^(\.|\.\.|__.*__)$`)
)

func fail(w http.ResponseWriter, code int, status string, stream bool) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	body := fmt.Sprintf(`{"error":{"code":%d,"status":%q,"message":"document projects/x/secret-name"}}`, code, status)
	if stream {
		body = "[" + body + "]"
	}
	_, _ = w.Write([]byte(body))
}

func (s *Server) handle(w http.ResponseWriter, r *http.Request) {
	m := pathRe.FindStringSubmatch(r.URL.Path)
	if m == nil || r.Method != http.MethodPost {
		fail(w, 404, "NOT_FOUND", false)
		return
	}
	if !strings.HasPrefix(r.Header.Get("Authorization"), "Bearer ") {
		fail(w, 401, "UNAUTHENTICATED", false)
		return
	}
	method := m[2]
	stream := method == "batchGet" || method == "runQuery"
	var body map[string]any
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		fail(w, 400, "INVALID_ARGUMENT", stream)
		return
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	s.calls[method]++
	if len(s.failNext) > 0 {
		f := s.failNext[0]
		s.failNext = s.failNext[1:]
		fail(w, f.code, f.status, stream)
		return
	}
	p := s.projects[m[1]]
	if p == nil {
		p = &project{docs: map[string]doc{}, versions: map[string]int64{}, colls: map[string]int64{}}
		s.projects[m[1]] = p
	}

	var out any
	switch method {
	case "beginTransaction":
		out = s.begin(p, body)
	case "rollback":
		delete(s.txs, str(body["transaction"]))
		out = map[string]any{}
	case "batchGet":
		t := s.txs[str(body["transaction"])]
		if t == nil {
			fail(w, 400, "INVALID_ARGUMENT", true)
			return
		}
		rows := []map[string]any{}
		for _, n := range body["documents"].([]any) {
			name := n.(string)
			if !validName(name) {
				fail(w, 400, "INVALID_ARGUMENT", true)
				return
			}
			t.reads[name] = true
			if d, ok := t.snapshot[name]; ok {
				rows = append(rows, map[string]any{"found": d})
			} else {
				rows = append(rows, map[string]any{"missing": name})
			}
		}
		out = rows
	case "runQuery":
		t := s.txs[str(body["transaction"])]
		if t == nil {
			fail(w, 400, "INVALID_ARGUMENT", true)
			return
		}
		out = s.runQuery(p, t, body["structuredQuery"].(map[string]any))
	case "commit":
		code, status := s.commit(p, body)
		if code != 200 {
			fail(w, code, status, false)
			return
		}
		out = map[string]any{"commitTime": "2026-11-02T00:00:00Z"}
	default:
		fail(w, 404, "NOT_FOUND", false)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(out)
}

func str(v any) string { s, _ := v.(string); return s }

func validName(name string) bool {
	i := strings.Index(name, "/documents/")
	if i < 0 {
		return false
	}
	parts := strings.Split(name[i+len("/documents/"):], "/")
	if len(parts)%2 != 0 {
		return false
	}
	for _, p := range parts {
		if p == "" || badIDRe.MatchString(p) || len(p) > 1500 {
			return false
		}
	}
	return true
}

func collOf(name string) string {
	parts := strings.Split(name, "/")
	return parts[len(parts)-2]
}

func (s *Server) begin(p *project, body map[string]any) map[string]any {
	opts, _ := body["options"].(map[string]any)
	_, readOnly := opts["readOnly"]
	snapshot := make(map[string]doc, len(p.docs))
	for k, v := range p.docs {
		snapshot[k] = v
	}
	versions := make(map[string]int64, len(p.versions))
	for k, v := range p.versions {
		versions[k] = v
	}
	colls := make(map[string]int64, len(p.colls))
	for k, v := range p.colls {
		colls[k] = v
	}
	s.nextTx++
	id := "dHgt" + strconv.Itoa(s.nextTx) // looks like the opaque base64 the real service returns
	s.txs[id] = &tx{readOnly: readOnly, snapshot: snapshot, versions: versions, colls: colls, reads: map[string]bool{}, queries: map[string]bool{}}
	return map[string]any{"transaction": id}
}

func (s *Server) commit(p *project, body map[string]any) (int, string) {
	id := str(body["transaction"])
	t := s.txs[id]
	if t == nil || t.readOnly {
		return 400, "INVALID_ARGUMENT"
	}
	delete(s.txs, id)
	if s.abort > 0 {
		s.abort--
		return 409, "ABORTED"
	}
	for name := range t.reads {
		if p.versions[name] != t.versions[name] {
			return 409, "ABORTED"
		}
	}
	for coll := range t.queries {
		if p.colls[coll] != t.colls[coll] {
			return 409, "ABORTED"
		}
	}
	writes, _ := body["writes"].([]any)
	type op struct {
		name string
		d    *doc
	}
	ops := make([]op, 0, len(writes))
	for _, raw := range writes {
		w := raw.(map[string]any)
		if del, ok := w["delete"].(string); ok {
			if !validName(del) {
				return 400, "INVALID_ARGUMENT"
			}
			ops = append(ops, op{del, nil})
			continue
		}
		upd, ok := w["update"].(map[string]any)
		if !ok || !validName(str(upd["name"])) {
			return 400, "INVALID_ARGUMENT"
		}
		d := doc{Name: str(upd["name"]), Fields: map[string]value{}}
		fields, _ := upd["fields"].(map[string]any)
		for k, v := range fields {
			d.Fields[k] = v.(map[string]any)
		}
		ops = append(ops, op{d.Name, &d})
	}
	p.clock++
	for _, o := range ops {
		if o.d == nil {
			delete(p.docs, o.name)
		} else {
			p.docs[o.name] = *o.d
		}
		p.versions[o.name] = p.clock
		p.colls[collOf(o.name)] = p.clock
	}
	return 200, ""
}

func (s *Server) runQuery(p *project, t *tx, q map[string]any) []map[string]any {
	coll := q["from"].([]any)[0].(map[string]any)["collectionId"].(string)
	t.queries[coll] = true
	var matched []doc
	for name, d := range t.snapshot {
		if collOf(name) == coll && matches(d, q["where"]) {
			matched = append(matched, d)
		}
	}
	sort.Slice(matched, func(i, j int) bool { return matched[i].Name < matched[j].Name })
	if order, ok := q["orderBy"].([]any); ok && len(order) > 0 {
		o := order[0].(map[string]any)
		field := o["field"].(map[string]any)["fieldPath"].(string)
		desc := o["direction"] == "DESCENDING"
		sort.SliceStable(matched, func(i, j int) bool {
			c := compare(matched[i].Fields[field], matched[j].Fields[field])
			if desc {
				return c > 0
			}
			return c < 0
		})
	}
	if limit, ok := q["limit"].(float64); ok && int(limit) < len(matched) {
		matched = matched[:int(limit)]
	}
	rows := make([]map[string]any, 0, len(matched)+1)
	for _, d := range matched {
		rows = append(rows, map[string]any{"document": d, "readTime": "2026-11-02T00:00:00Z"})
	}
	if len(rows) == 0 {
		rows = append(rows, map[string]any{"readTime": "2026-11-02T00:00:00Z"})
	}
	return rows
}

func matches(d doc, where any) bool {
	w, ok := where.(map[string]any)
	if !ok {
		return true
	}
	if c, ok := w["compositeFilter"].(map[string]any); ok {
		for _, f := range c["filters"].([]any) {
			if !matches(d, f) {
				return false
			}
		}
		return true
	}
	f := w["fieldFilter"].(map[string]any)
	got, present := d.Fields[f["field"].(map[string]any)["fieldPath"].(string)]
	if !present {
		return false
	}
	c := compare(got, f["value"].(map[string]any))
	switch f["op"] {
	case "EQUAL":
		return c == 0
	case "LESS_THAN":
		return c < 0
	case "GREATER_THAN_OR_EQUAL":
		return c >= 0
	}
	panic(fmt.Sprintf("firestorefake: unsupported operator %v", f["op"]))
}

func compare(a, b value) int {
	if as, ok := a["integerValue"].(string); ok {
		bs, _ := b["integerValue"].(string)
		x, _ := strconv.ParseInt(as, 10, 64)
		y, _ := strconv.ParseInt(bs, 10, 64)
		switch {
		case x < y:
			return -1
		case x > y:
			return 1
		}
		return 0
	}
	return strings.Compare(str(a["stringValue"]), str(b["stringValue"]))
}
