// SPEC: FR-040..FR-046, SC-015, SC-016
package api

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"testing"
	"time"

	"ai-foundations-coach/internal/state"
)

func decode(t *testing.T, body string) map[string]any {
	t.Helper()
	var m map[string]any
	if err := json.Unmarshal([]byte(body), &m); err != nil {
		t.Fatalf("not JSON: %s", body)
	}
	return m
}

func TestInsightsRequireAnAdmin(t *testing.T) {
	e := newAdminEnv(t, []string{adminAddr})
	for _, p := range []string{"/api/admin/overview", "/api/admin/usage", "/api/admin/users/activity", "/api/admin/costs", "/api/admin/feedback"} {
		if resp, _ := e.do(t, "GET", p, nil, nil); resp.StatusCode != 401 {
			t.Errorf("%s signed out: %d", p, resp.StatusCode)
		}
	}
}

func TestInsightsOnAnEmptyStoreAreZeroes(t *testing.T) {
	e := newAdminEnv(t, []string{adminAddr})
	e.signIn(t)
	for _, p := range []string{"/api/admin/overview", "/api/admin/usage", "/api/admin/usage?days=7", "/api/admin/users/activity", "/api/admin/costs"} {
		resp, body := e.do(t, "GET", p, nil, nil)
		if resp.StatusCode != 200 || !strings.Contains(body, `"generatedAt"`) {
			t.Errorf("%s: %d %s", p, resp.StatusCode, body)
		}
	}
	if resp, _ := e.do(t, "GET", "/api/admin/usage?days=9", nil, nil); resp.StatusCode != 400 {
		t.Errorf("days=9: %d", resp.StatusCode)
	}
}

func TestUsageIsCountedThroughRealRequests(t *testing.T) {
	e := newAdminEnv(t, []string{adminAddr})
	e.signIn(t)
	learner, id, pw := activateLearner(t, e, "Class 9") // one sign-in

	get := func(c *http.Client, p string) int {
		resp, err := c.Get(e.app.URL + p)
		if err != nil {
			t.Fatal(err)
		}
		resp.Body.Close()
		return resp.StatusCode
	}
	if get(learner, "/api/lessons/lesson-1") != 200 || get(learner, "/api/lessons/lesson-1?mode=junior") != 200 {
		t.Fatal("setup: lessons should load")
	}
	if resp, err := learner.Post(e.app.URL+"/api/usage/event", "application/json", strings.NewReader(`{"event":"quiz_open"}`)); err != nil || resp.StatusCode != 204 {
		t.Fatalf("quiz event: %v %v", resp, err)
	}
	if resp, _ := learner.Post(e.app.URL+"/api/usage/event", "application/json", strings.NewReader(`{"event":"anything"}`)); resp.StatusCode != 400 {
		t.Errorf("unknown event: %d", resp.StatusCode)
	}
	if resp, _ := (&http.Client{}).Post(e.app.URL+"/api/usage/event", "application/json", strings.NewReader(`{"event":"quiz_open"}`)); resp.StatusCode != 401 {
		t.Errorf("signed out event: %d", resp.StatusCode)
	}
	resp, _ := (&http.Client{}).Post(e.app.URL+"/api/auth/login", "application/json", strings.NewReader(`{"betaId":"`+id+`","password":"nope"}`))
	resp.Body.Close()
	_ = pw

	_, body := e.do(t, "GET", "/api/admin/usage?days=7", nil, nil)
	m := decode(t, body)
	series := m["series"].([]any)
	today := series[len(series)-1].(map[string]any)
	if len(series) != 7 || today["dau"].(float64) != 1 || today["signinOk"].(float64) != 1 || today["signinFail"].(float64) != 1 || today["quiz"].(float64) != 1 {
		t.Errorf("today: %v", today)
	}
	if today["requests"].(float64) < 3 {
		t.Errorf("requests: %v", today["requests"])
	}
	lessons := m["lessons"].([]any)
	if len(lessons) != 1 || lessons[0].(map[string]any)["lessonId"] != "lesson-1" || lessons[0].(map[string]any)["views"].(float64) != 1 {
		t.Errorf("a page view counts once, adaptive fetch or not: %v", lessons)
	}
	totals := m["totals"].(map[string]any)
	if totals["last7d"].(map[string]any)["dau"].(float64) != 1 {
		t.Errorf("totals: %v", totals)
	}

	// Health checks are left out, so an idle server shows no traffic.
	before := today["requests"].(float64)
	for i := 0; i < 5; i++ {
		get(&http.Client{}, "/api/health")
	}
	_, body = e.do(t, "GET", "/api/admin/usage?days=7", nil, nil)
	s2 := decode(t, body)["series"].([]any)
	if got := s2[len(s2)-1].(map[string]any)["requests"].(float64); got > before+2 {
		t.Errorf("health checks were counted: %v then %v", before, got)
	}

	// Persisted counters and last-seen hold no identity beyond the account's own last-seen time.
	if err := e.usage.Flush(context.Background()); err != nil {
		t.Fatal(err)
	}
	_ = e.store.View(context.Background(), func(tx state.Tx) error {
		for k := range tx.ListCounters("") {
			if strings.Contains(k, id) || strings.Contains(k, "127.0.0.1") {
				t.Errorf("counter key holds identity: %s", k)
			}
		}
		a, _ := tx.GetAccount(id)
		if a.LastSeenAt == nil {
			t.Error("last seen was not flushed")
		}
		return nil
	})
}

func TestUsersActivityAndAccountRows(t *testing.T) {
	e := newAdminEnv(t, []string{adminAddr})
	e.signIn(t)
	learner, id, _ := activateLearner(t, e, "Class 9")
	_, idle, _ := activateLearner(t, e, "Class 9")
	_, gone, _ := activateLearner(t, e, "Other")
	if resp, _ := learner.Get(e.app.URL + "/api/lessons"); resp.StatusCode != 200 {
		t.Fatal("setup")
	}
	_ = e.svc.RevokeAccount(context.Background(), adminAddr, gone)

	_, body := e.do(t, "GET", "/api/admin/users/activity", nil, nil)
	m := decode(t, body)
	if m["activeNow"].(float64) != 1 || m["activeLast24h"].(float64) != 1 || m["activeLast7d"].(float64) != 1 || m["inactive14d"].(float64) != 1 {
		t.Errorf("activity: %s", body)
	}
	labels := m["byLabel"].([]any)
	if len(labels) != 1 || labels[0].(map[string]any)["label"] != "Class 9" || labels[0].(map[string]any)["accounts"].(float64) != 2 || labels[0].(map[string]any)["activeLast7d"].(float64) != 1 {
		t.Errorf("revoked accounts leave the group counts: %v", labels)
	}

	_, body = e.do(t, "GET", "/api/admin/accounts?sort=lastSeen", nil, nil)
	var list struct {
		Items []struct {
			BetaID     string     `json:"betaId"`
			ActiveNow  bool       `json:"activeNow"`
			LastSeenAt *time.Time `json:"lastSeenAt"`
			Devices    int        `json:"devices"`
		} `json:"items"`
	}
	if err := json.Unmarshal([]byte(body), &list); err != nil {
		t.Fatal(err)
	}
	found := false
	for _, it := range list.Items {
		if it.BetaID == id {
			found = true
			if !it.ActiveNow || it.LastSeenAt == nil || it.Devices < 1 {
				t.Errorf("active learner row: %+v", it)
			}
		}
		if it.BetaID == idle && it.ActiveNow {
			t.Errorf("idle learner flagged active: %+v", it)
		}
	}
	if !found {
		t.Errorf("rows: %s", body)
	}
}

func TestCostsAndOverviewShapes(t *testing.T) {
	e := newAdminEnv(t, []string{adminAddr})
	e.signIn(t)
	_ = e.store.Do(context.Background(), func(tx state.Tx) error {
		tx.AddCounter("spend:"+time.Now().UTC().Add(5*time.Hour+30*time.Minute).Format("2006-01-02"), 120_000)
		return nil
	})
	_, body := e.do(t, "GET", "/api/admin/costs", nil, nil)
	m := decode(t, body)
	ai := m["ai"].(map[string]any)
	if ai["todayUSD"].(float64) != 0.12 || ai["ceilingUSD"].(float64) != 1 || ai["budgetUSD"].(float64) != 30 || ai["estimated"] != true {
		t.Errorf("ai: %v", ai)
	}
	for _, k := range []string{"monthToDateUSD", "budgetUsedPct", "thresholds", "projectedMonthUSD", "daily", "ceilingReached"} {
		if _, ok := ai[k]; !ok {
			t.Errorf("costs lacks %s", k)
		}
	}
	h := m["hosting"].(map[string]any)
	if h["connected"] != false || h["reason"] != "Cloud billing source is not connected" || len(h["items"].([]any)) != 0 {
		t.Errorf("hosting must say not connected and show no amount: %v", h)
	}

	_, body = e.do(t, "GET", "/api/admin/overview", nil, nil)
	o := decode(t, body)
	if o["seats"].(map[string]any)["cap"].(float64) != 1000 || o["ai"].(map[string]any)["todayUSD"].(float64) != 0.12 || o["tutorEnabled"] != true {
		t.Errorf("overview: %s", body)
	}
	for _, k := range []string{"accounts", "invites", "activeNow", "activeLast24h", "activeLast7d", "feedback"} {
		if _, ok := o[k]; !ok {
			t.Errorf("overview lacks %s", k)
		}
	}
}

func TestStreamingStillWorksThroughTheUsageWrapper(t *testing.T) {
	e := newAdminEnv(t, []string{adminAddr})
	learner, _, _ := activateLearner(t, e, "")
	resp, err := learner.Post(e.app.URL+"/api/tutor/stream", "application/json", strings.NewReader(`{"lessonId":"lesson-1","question":"What is ML?"}`))
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if ct := resp.Header.Get("Content-Type"); resp.StatusCode != 200 || !strings.HasPrefix(ct, "text/event-stream") {
		t.Errorf("stream: %d %s", resp.StatusCode, ct)
	}
}
