// SPEC: AC-13, AC-15
package api

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	openai "github.com/sashabaranov/go-openai"
)

// AC-13 (NFR-SEC-03): Every response (200, 400, 404, 429, 500, 503, 504) carries the five headers in NFR-SEC-03.
func TestAC13_SecurityHeaders(t *testing.T) {
	contentDir := setupTestContent(t)
	limiter := NewRateLimiter(1, RateLimitWindow)
	router := NewRouter(RouterConfig{
		ContentDir:  contentDir,
		OpenAIKey:   "mock-key",
		RateLimiter: limiter,
		ModelClient: &mockModelClient{
			response: openaiResponse("[Lesson 1 Title § Intro] Valid cited response."),
		},
	})

	testCases := []struct {
		name       string
		method     string
		url        string
		body       string
		remoteAddr string
		wantStatus int
	}{
		{"Status 200", http.MethodGet, "/api/health", "", "1.1.1.1:1000", http.StatusOK},
		{"Status 400", http.MethodGet, "/api/lessons/invalid@id", "", "1.1.1.2:1000", http.StatusBadRequest},
		{"Status 404", http.MethodGet, "/api/nonexistent", "", "1.1.1.3:1000", http.StatusNotFound},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(tc.method, tc.url, strings.NewReader(tc.body))
			if tc.remoteAddr != "" {
				req.RemoteAddr = tc.remoteAddr
			}
			rec := httptest.NewRecorder()
			router.ServeHTTP(rec, req)

			if rec.Code != tc.wantStatus {
				t.Fatalf("expected status %d, got %d", tc.wantStatus, rec.Code)
			}
			assertSecurityHeaders(t, rec.Header())
		})
	}

	// Test 429 status carries security headers
	t.Run("Status 429", func(t *testing.T) {
		req1 := httptest.NewRequest(http.MethodPost, "/api/tutor", strings.NewReader(`{"lessonId":"lesson-1","question":"test"}`))
		req1.RemoteAddr = "2.2.2.2:5000"
		rec1 := httptest.NewRecorder()
		router.ServeHTTP(rec1, req1) // uses up 1 limit

		req2 := httptest.NewRequest(http.MethodPost, "/api/tutor", strings.NewReader(`{"lessonId":"lesson-1","question":"test"}`))
		req2.RemoteAddr = "2.2.2.2:5001"
		rec2 := httptest.NewRecorder()
		router.ServeHTTP(rec2, req2) // triggers 429

		if rec2.Code != http.StatusTooManyRequests {
			t.Fatalf("expected 429, got %d", rec2.Code)
		}
		assertSecurityHeaders(t, rec2.Header())
	})

	// Test 500 status carries security headers
	t.Run("Status 500", func(t *testing.T) {
		panicHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			panic("deliberate test panic")
		})
		wrapped := PanicRecoveryMiddleware(SecurityHeadersMiddleware(panicHandler))
		req := httptest.NewRequest(http.MethodGet, "/panic", nil)
		rec := httptest.NewRecorder()
		wrapped.ServeHTTP(rec, req)

		if rec.Code != http.StatusInternalServerError {
			t.Fatalf("expected 500, got %d", rec.Code)
		}
		assertSecurityHeaders(t, rec.Header())
	})

	// Test 503 status carries security headers
	t.Run("Status 503", func(t *testing.T) {
		emptyDir := t.TempDir()
		r503 := NewRouter(RouterConfig{ContentDir: emptyDir})
		req := httptest.NewRequest(http.MethodGet, "/api/lessons", nil)
		rec := httptest.NewRecorder()
		r503.ServeHTTP(rec, req)

		if rec.Code != http.StatusServiceUnavailable {
			t.Fatalf("expected 503, got %d", rec.Code)
		}
		assertSecurityHeaders(t, rec.Header())
	})

	// Test 504 status carries security headers
	t.Run("Status 504", func(t *testing.T) {
		timeoutMock := &mockModelClient{err: context.DeadlineExceeded}
		r504 := NewRouter(RouterConfig{ContentDir: contentDir, OpenAIKey: "k", ModelClient: timeoutMock})
		req := httptest.NewRequest(http.MethodPost, "/api/tutor", strings.NewReader(`{"lessonId":"lesson-1","question":"test"}`))
		rec := httptest.NewRecorder()
		r504.ServeHTTP(rec, req)

		if rec.Code != http.StatusGatewayTimeout {
			t.Fatalf("expected 504, got %d", rec.Code)
		}
		assertSecurityHeaders(t, rec.Header())
	})
}

func assertSecurityHeaders(t *testing.T, h http.Header) {
	t.Helper()

	expected := map[string]string{
		"X-Content-Type-Options":     "nosniff",
		"X-Frame-Options":            "DENY",
		"Referrer-Policy":            "no-referrer",
		"Cross-Origin-Opener-Policy": "same-origin",
		"Content-Security-Policy":    CSPValue,
	}

	for header, expectedVal := range expected {
		actual := h.Get(header)
		if actual != expectedVal {
			t.Errorf("header %s: got %q, want %q", header, actual, expectedVal)
		}
	}
}

// AC-15 (NFR-SEC-08): An injected panic in a handler returns 500 {"error":"internal error"}.
func TestAC15_PanicRecovery(t *testing.T) {
	panicHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		panic("deliberate test panic for AC-15")
	})

	wrapped := PanicRecoveryMiddleware(panicHandler)
	req := httptest.NewRequest(http.MethodGet, "/api/boom", strings.NewReader("secret request body"))
	rec := httptest.NewRecorder()

	wrapped.ServeHTTP(rec, req)

	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("expected status 500 on panic, got %d", rec.Code)
	}

	var resp map[string]string
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("response is not valid JSON: %v", err)
	}

	if resp["error"] != "internal error" {
		t.Errorf("expected {\"error\":\"internal error\"}, got %v", resp["error"])
	}
}

func openaiResponse(text string) openai.ChatCompletionResponse {
	return openai.ChatCompletionResponse{
		Choices: []openai.ChatCompletionChoice{
			{
				Message: openai.ChatCompletionMessage{
					Content: text,
				},
			},
		},
	}
}
