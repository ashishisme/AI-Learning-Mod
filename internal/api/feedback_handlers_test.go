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
