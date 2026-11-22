// SPEC: FR-047..FR-059, SC-019
package api

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"testing"

	"ai-foundations-coach/internal/feedback"
)

func sendFeedback(t *testing.T, e *adminEnv, c *http.Client, body map[string]any) (*http.Response, string) {
	t.Helper()
	raw, _ := json.Marshal(body)
	resp, err := c.Post(e.app.URL+"/api/feedback", "application/json", bytes.NewReader(raw))
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	b, _ := io.ReadAll(resp.Body)
	return resp, string(b)
}

func goodFeedback() map[string]any {
	return map[string]any{"rating": 4, "category": "content", "message": "Lesson 2 was clear", "lessonId": "lesson-1", "mode": "junior", "appVersion": "3.2.0"}
}

func TestFeedbackRequiresASession(t *testing.T) {
	e := newAdminEnv(t, []string{adminAddr})
	if resp, _ := sendFeedback(t, e, &http.Client{}, goodFeedback()); resp.StatusCode != 401 {
		t.Errorf("signed out: %d", resp.StatusCode)
	}
}

func TestFeedbackResponses(t *testing.T) {
	var logs bytes.Buffer
	old := slog.Default()
	slog.SetDefault(slog.New(slog.NewTextHandler(&logs, nil)))
	defer slog.SetDefault(old)

	e := newAdminEnv(t, []string{adminAddr})
	learner, _, _ := activateLearner(t, e, "Class 9")

	if resp, body := sendFeedback(t, e, learner, goodFeedback()); resp.StatusCode != 201 || !strings.Contains(body, `"ok":true`) {
		t.Errorf("clean: %d %s", resp.StatusCode, body)
	}
	bad := goodFeedback()
	bad["rating"] = 9
	if resp, body := sendFeedback(t, e, learner, bad); resp.StatusCode != 400 || !strings.Contains(body, `"code":"invalid"`) {
		t.Errorf("bad rating: %d %s", resp.StatusCode, body)
	}
	unknown := goodFeedback()
	unknown["betaId"] = "BETA-X"
	if resp, _ := sendFeedback(t, e, learner, unknown); resp.StatusCode != 400 {
		t.Errorf("unknown field: %d", resp.StatusCode)
	}
	pii := goodFeedback()
	pii["message"] = "call me on 98765 43210"
	resp, body := sendFeedback(t, e, learner, pii)
	if resp.StatusCode != 422 || !strings.Contains(body, `"code":"pii_detected"`) || !strings.Contains(body, `"kind":"phone"`) ||
		!strings.Contains(body, "Please remove personal details") || strings.Contains(body, "98765") {
		t.Errorf("personal details: %d %s", resp.StatusCode, body)
	}
	if strings.Contains(logs.String(), "98765") {
		t.Errorf("the matched text reached the log: %s", logs.String())
	}
	for i := 0; i < 3; i++ {
		sendFeedback(t, e, learner, goodFeedback())
	}
	resp, body = sendFeedback(t, e, learner, goodFeedback())
	if resp.StatusCode != 429 || !strings.Contains(body, `"code":"feedback_limit"`) {
		t.Errorf("sixth in an hour: %d %s", resp.StatusCode, body)
	}
}

func TestFeedbackIsUnavailableWithoutAuditor(t *testing.T) {
	e := newAuthEnv(t) // no Feedback service configured
	c, _ := signedInClient(t, e)
	if resp, _ := e.post(t, c, "/api/feedback", goodFeedback(), "application/json"); resp.StatusCode != 404 {
		t.Errorf("no auditor: %d, want 404", resp.StatusCode)
	}
	if _, body := e.get(t, c, "/api/runtime"); !strings.Contains(body, `"feedbackEnabled":false`) {
		t.Errorf("runtime: %s", body)
	}
}

func TestAdminInboxShowsOnlyWhatPassedBothChecks(t *testing.T) {
	e := newAdminEnv(t, []string{adminAddr})
	e.signIn(t)
	learner, id, _ := activateLearner(t, e, "Class 9")

	sendFeedback(t, e, learner, goodFeedback())
	_, body := e.do(t, "GET", "/api/admin/feedback", nil, nil)
	if !strings.Contains(body, `"total":0`) || !strings.Contains(body, `"waiting":1`) || strings.Contains(body, "Lesson 2 was clear") {
		t.Fatalf("waiting items stay hidden: %s", body)
	}
	if !e.fb.ProcessWaiting(context.Background()) {
		t.Fatal("process")
	}
	_, body = e.do(t, "GET", "/api/admin/feedback", nil, nil)
	if !strings.Contains(body, "Lesson 2 was clear") || !strings.Contains(body, `"unread":1`) || !strings.Contains(body, `"label":"Class 9"`) || strings.Contains(body, id) {
		t.Errorf("passed: %s", body)
	}

	withhold := goodFeedback()
	withhold["message"] = "my name is Asha from Rose Valley school"
	if resp, _ := sendFeedback(t, e, learner, withhold); resp.StatusCode != 201 {
		t.Fatal("the rule check cannot see a name; the auditor must")
	}
	e.audit.verdict = feedback.Verdict{Reason: feedback.ReasonPersonalDetails}
	e.fb.ProcessWaiting(context.Background())
	_, body = e.do(t, "GET", "/api/admin/feedback", nil, nil)
	if strings.Contains(body, "Asha") || !strings.Contains(body, `"withheld":1`) || !strings.Contains(body, `"personal_details":1`) {
		t.Errorf("withheld is a count, never text: %s", body)
	}
	if len(e.audit.seen) != 2 || e.audit.seen[0] != "Lesson 2 was clear" {
		t.Errorf("the auditor saw: %v", e.audit.seen)
	}
	_, csvBody := e.do(t, "GET", "/api/admin/feedback.csv", nil, nil)
	if strings.Contains(csvBody, "Asha") || !strings.Contains(csvBody, "Lesson 2 was clear") {
		t.Errorf("csv: %s", csvBody)
	}
	// SPEC-016 FR-008, FR-009: the language filter reaches the list and the CSV; a record without one is "unknown".
	if _, b := e.do(t, "GET", "/api/admin/feedback.csv?lang=unknown", nil, nil); !strings.Contains(b, "Lesson 2 was clear") || !strings.Contains(b, ",lang,section,step") {
		t.Errorf("csv unknown: %s", b)
	}
	if _, b := e.do(t, "GET", "/api/admin/feedback?lang=kn", nil, nil); !strings.Contains(b, `"total":0`) {
		t.Errorf("list kn: %s", b)
	}
	_, ov := e.do(t, "GET", "/api/admin/overview", nil, nil)
	if !strings.Contains(ov, `"unread":1`) {
		t.Errorf("overview: %s", ov)
	}
}

func TestAdminFeedbackWritesNeedCSRFAndAreAudited(t *testing.T) {
	e := newAdminEnv(t, []string{adminAddr})
	e.signIn(t)
	learner, _, _ := activateLearner(t, e, "")
	sendFeedback(t, e, learner, goodFeedback())
	e.fb.ProcessWaiting(context.Background())
	_, body := e.do(t, "GET", "/api/admin/feedback", nil, nil)
	var list struct {
		Items []struct {
			ID string `json:"id"`
		} `json:"items"`
	}
	_ = json.Unmarshal([]byte(body), &list)
	id := list.Items[0].ID

	if resp, _ := e.do(t, "POST", "/api/admin/feedback/"+id+"/status", map[string]string{"status": "read"}, nil); resp.StatusCode != 403 {
		t.Errorf("no csrf: %d", resp.StatusCode)
	}
	if resp, _ := e.post(t, "/api/admin/feedback/"+id+"/status", map[string]string{"status": "read"}); resp.StatusCode != 204 {
		t.Errorf("status: %d", resp.StatusCode)
	}
	if resp, _ := e.post(t, "/api/admin/feedback/"+id+"/status", map[string]string{"status": "bogus"}); resp.StatusCode != 400 {
		t.Errorf("bad status: %d", resp.StatusCode)
	}
	if resp, _ := e.do(t, "GET", "/api/admin/feedback.csv?status=read", nil, nil); resp.StatusCode != 200 || !strings.HasPrefix(resp.Header.Get("Content-Type"), "text/csv") {
		t.Errorf("csv: %d", resp.StatusCode)
	}
	if resp, _ := e.post(t, "/api/admin/feedback/"+id+"/delete", nil); resp.StatusCode != 204 {
		t.Errorf("delete: %d", resp.StatusCode)
	}
	if resp, _ := e.post(t, "/api/admin/feedback/"+id+"/delete", nil); resp.StatusCode != 404 {
		t.Errorf("delete twice: %d", resp.StatusCode)
	}
	_, audit := e.do(t, "GET", "/api/admin/audit", nil, nil)
	for _, want := range []string{"feedback.status", "feedback.export", "feedback.delete"} {
		if !strings.Contains(audit, want) {
			t.Errorf("audit lacks %s: %s", want, audit)
		}
	}
	if strings.Contains(audit, "Lesson 2 was clear") {
		t.Error("feedback text must not reach the audit trail")
	}
}

// FR-I18N-12: an admin reads and changes the per-learner limits; writes need CSRF and are audited.
func TestAdminFeedbackLimits(t *testing.T) {
	e := newAdminEnv(t, []string{adminAddr})
	e.signIn(t)
	if _, body := e.do(t, "GET", "/api/admin/feedback/limits", nil, nil); !strings.Contains(body, `"daily":10`) || !strings.Contains(body, `"total":50`) {
		t.Errorf("defaults: %s", body)
	}
	if resp, _ := e.do(t, "POST", "/api/admin/feedback/limits", map[string]int{"daily": 20, "total": 100}, nil); resp.StatusCode != 403 {
		t.Errorf("no csrf: %d", resp.StatusCode)
	}
	if resp, _ := e.post(t, "/api/admin/feedback/limits", map[string]int{"daily": 0, "total": 100}); resp.StatusCode != 400 {
		t.Errorf("invalid: %d", resp.StatusCode)
	}
	if resp, body := e.post(t, "/api/admin/feedback/limits", map[string]int{"daily": 20, "total": 100}); resp.StatusCode != 200 || !strings.Contains(body, `"daily":20`) {
		t.Errorf("change: %d %s", resp.StatusCode, body)
	}
	if _, audit := e.do(t, "GET", "/api/admin/audit", nil, nil); !strings.Contains(audit, "feedback.limits") {
		t.Errorf("audit: %s", audit)
	}
}

// FR-I18N-13: a learner saves, reads and overwrites one set of ratings; the admin sees only the summary.
func TestRatingsEndpoints(t *testing.T) {
	e := newAdminEnv(t, []string{adminAddr})
	e.signIn(t)
	learner, betaID, _ := activateLearner(t, e, "")
	post := func(body map[string]any) (*http.Response, string) {
		raw, _ := json.Marshal(body)
		resp, err := learner.Post(e.app.URL+"/api/feedback/ratings", "application/json", bytes.NewReader(raw))
		if err != nil {
			t.Fatal(err)
		}
		defer resp.Body.Close()
		b, _ := io.ReadAll(resp.Body)
		return resp, string(b)
	}
	get := func() string {
		resp, err := learner.Get(e.app.URL + "/api/feedback/ratings")
		if err != nil {
			t.Fatal(err)
		}
		defer resp.Body.Close()
		b, _ := io.ReadAll(resp.Body)
		return string(b)
	}
	if resp, _ := (&http.Client{}).Get(e.app.URL + "/api/feedback/ratings"); resp.StatusCode != 401 {
		t.Errorf("signed out: %d", resp.StatusCode)
	}
	if resp, _ := post(map[string]any{"lessons": 4, "ease": 5, "voice": 3}); resp.StatusCode != 200 {
		t.Fatalf("save: %d", resp.StatusCode)
	}
	if resp, _ := post(map[string]any{"lessons": 2, "ease": 3, "translation": 4, "lang": "en"}); resp.StatusCode != 200 {
		t.Fatalf("overwrite: %d", resp.StatusCode)
	}
	if got := get(); !strings.Contains(got, `"lessons":2`) || !strings.Contains(got, `"voice":0`) || !strings.Contains(got, `"translation":0`) {
		t.Errorf("after overwrite (voice cleared, English translation dropped): %s", got)
	}
	if resp, _ := post(map[string]any{"lessons": 9}); resp.StatusCode != 400 {
		t.Errorf("9 stars: %d", resp.StatusCode)
	}
	_, sum := e.do(t, "GET", "/api/admin/feedback/ratings", nil, nil)
	if !strings.Contains(sum, `"learners":1`) || strings.Contains(sum, betaID) {
		t.Errorf("summary: %s", sum)
	}
}
