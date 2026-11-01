// SPEC: FR-007, FR-008, FR-011
package api

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/cookiejar"
	"strings"
	"testing"
	"time"

	"ai-foundations-coach/internal/state"
)

func activateLearner(t *testing.T, e *adminEnv, label string) (client *http.Client, betaID, password string) {
	t.Helper()
	links, err := e.svc.CreateInvites(context.Background(), adminAddr, 1, label)
	if err != nil {
		t.Fatal(err)
	}
	act, err := e.svc.Activate(context.Background(), links[0][strings.LastIndex(links[0], "/")+1:])
	if err != nil {
		t.Fatal(err)
	}
	jar, _ := cookiejar.New(nil)
	c := &http.Client{Jar: jar}
	resp, err := c.Post(e.app.URL+"/api/auth/login", "application/json",
		strings.NewReader(`{"betaId":"`+act.BetaID+`","password":"`+act.Password+`"}`))
	if err != nil || resp.StatusCode != 200 {
		t.Fatalf("learner login: %v %v", resp, err)
	}
	return c, act.BetaID, act.Password
}

func setExpiry(t *testing.T, e *adminEnv, betaID string, exp time.Time) {
	t.Helper()
	_ = e.store.Do(context.Background(), func(tx state.Tx) error {
		a, _ := tx.GetAccount(betaID)
		a.ExpiresAt = exp
		tx.PutAccount(a)
		return nil
	})
}

func TestAdminExtendOverHTTP(t *testing.T) {
	e := newAdminEnv(t, []string{adminAddr})
	e.signIn(t)
	_, id, pw := activateLearner(t, e, "Class")
	setExpiry(t, e, id, time.Now().Add(-48*time.Hour)) // expired two days ago

	if resp, _ := e.http.Post(e.app.URL+"/api/auth/login", "application/json", strings.NewReader(`{"betaId":"`+id+`","password":"`+pw+`"}`)); resp.StatusCode != 401 {
		t.Fatalf("setup: expired accounts are refused, got %d", resp.StatusCode)
	}
	resp, body := e.post(t, "/api/admin/accounts/"+id+"/extend", map[string]any{"months": 2})
	var out struct {
		ExpiresAt time.Time `json:"expiresAt"`
	}
	_ = json.Unmarshal([]byte(body), &out)
	if resp.StatusCode != 200 || out.ExpiresAt.Before(time.Now().Add(50*24*time.Hour)) {
		t.Fatalf("extend: %d %s", resp.StatusCode, body)
	}
	if resp, _ := e.http.Post(e.app.URL+"/api/auth/login", "application/json", strings.NewReader(`{"betaId":"`+id+`","password":"`+pw+`"}`)); resp.StatusCode != 200 {
		t.Errorf("sign-in must work at once after the extension: %d", resp.StatusCode)
	}

	for name, in := range map[string]map[string]any{"too many months": {"months": 25}, "negative": {"months": -1}} {
		if resp, _ := e.post(t, "/api/admin/accounts/"+id+"/extend", in); resp.StatusCode != 400 {
			t.Errorf("%s: %d", name, resp.StatusCode)
		}
	}
	if resp, _ := e.post(t, "/api/admin/accounts/BETA-ZZZZ-ZZZZ/extend", map[string]any{}); resp.StatusCode != 404 {
		t.Errorf("unknown account: %d", resp.StatusCode)
	}
	_ = e.svc.RevokeAccount(context.Background(), adminAddr, id)
	if resp, body := e.post(t, "/api/admin/accounts/"+id+"/extend", map[string]any{}); resp.StatusCode != 409 || !strings.Contains(body, `"code":"revoked"`) {
		t.Errorf("revoked: %d %s", resp.StatusCode, body)
	}
}

func TestAdminExtendLabelOverHTTP(t *testing.T) {
	e := newAdminEnv(t, []string{adminAddr})
	e.signIn(t)
	for i := 0; i < 3; i++ {
		activateLearner(t, e, "Class 9")
	}
	activateLearner(t, e, "Other")
	resp, body := e.post(t, "/api/admin/accounts/extend-label", map[string]any{"label": "Class 9", "months": 2})
	if resp.StatusCode != 200 || !strings.Contains(body, `"extended":3`) {
		t.Fatalf("extend label: %d %s", resp.StatusCode, body)
	}
	if resp, _ := e.post(t, "/api/admin/accounts/extend-label", map[string]any{"label": "", "months": 2}); resp.StatusCode != 400 {
		t.Errorf("empty label must be refused so nothing is extended by accident: %d", resp.StatusCode)
	}
	_, body = e.do(t, "GET", "/api/admin/audit", nil, nil)
	if !strings.Contains(body, "account.extend_label") {
		t.Errorf("audit: %s", body)
	}
}

func TestLearnerSeesReminderWithinSevenDaysAndExpiredMessage(t *testing.T) {
	e := newAdminEnv(t, []string{adminAddr})
	c, id, _ := activateLearner(t, e, "")

	get := func() (int, string) {
		resp, err := c.Get(e.app.URL + "/api/auth/session")
		if err != nil {
			t.Fatal(err)
		}
		defer resp.Body.Close()
		var b strings.Builder
		buf := make([]byte, 4096)
		n, _ := resp.Body.Read(buf)
		b.Write(buf[:n])
		return resp.StatusCode, b.String()
	}
	if _, body := get(); !strings.Contains(body, `"expiringSoon":false`) {
		t.Errorf("fresh account: %s", body)
	}
	setExpiry(t, e, id, time.Now().Add(5*24*time.Hour))
	if _, body := get(); !strings.Contains(body, `"expiringSoon":true`) || !strings.Contains(body, `"daysLeft":5`) {
		t.Errorf("five days left: %s", body)
	}
	setExpiry(t, e, id, time.Now().Add(-time.Minute))
	resp, err := c.Get(e.app.URL + "/api/lessons")
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	buf := make([]byte, 4096)
	n, _ := resp.Body.Read(buf)
	if resp.StatusCode != 401 || !strings.Contains(string(buf[:n]), "Your beta access has expired. Ask your teacher or admin to extend it.") {
		t.Errorf("expired: %d %s", resp.StatusCode, buf[:n])
	}
}
