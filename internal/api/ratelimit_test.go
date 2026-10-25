// SPEC: AC-14
package api

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

// AC-14 (NFR-SEC-06): The 11th /api/tutor request within a minute from one host -> 429 with Retry-After: 60.
func TestAC14_RateLimiting(t *testing.T) {
	contentDir := setupTestContent(t)
	limiter := NewRateLimiter(10, 1*time.Minute)

	router := NewRouter(RouterConfig{
		ContentDir:  contentDir,
		OpenAIKey:   "mock-key",
		RateLimiter: limiter,
		ModelClient: &mockModelClient{
			response: openaiResponse("[Lesson 1 Title § Overview] Test response."),
		},
	})

	clientHost := "192.168.1.50"

	// Send 10 valid requests
	for i := 1; i <= 10; i++ {
		req := httptest.NewRequest(http.MethodPost, "/api/tutor", strings.NewReader(`{"lessonId":"lesson-1","question":"test"}`))
		req.RemoteAddr = clientHost + ":12345"
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("request %d expected 200, got %d: %s", i, rec.Code, rec.Body.String())
		}
	}

	// 11th request from same host within a minute must produce 429 with Retry-After: 60
	req11 := httptest.NewRequest(http.MethodPost, "/api/tutor", strings.NewReader(`{"lessonId":"lesson-1","question":"test"}`))
	req11.RemoteAddr = clientHost + ":54321" // different ephemeral port, same host
	rec11 := httptest.NewRecorder()
	router.ServeHTTP(rec11, req11)

	if rec11.Code != http.StatusTooManyRequests {
		t.Fatalf("11th request expected 429, got %d", rec11.Code)
	}

	retryAfter := rec11.Header().Get("Retry-After")
	if retryAfter != "60" {
		t.Errorf("expected Retry-After: 60, got %q", retryAfter)
	}

	// Another host should NOT be blocked
	otherHostReq := httptest.NewRequest(http.MethodPost, "/api/tutor", strings.NewReader(`{"lessonId":"lesson-1","question":"test"}`))
	otherHostReq.RemoteAddr = "10.0.0.1:1234"
	otherRec := httptest.NewRecorder()
	router.ServeHTTP(otherRec, otherHostReq)

	if otherRec.Code != http.StatusOK {
		t.Errorf("different host expected 200, got %d", otherRec.Code)
	}
}
