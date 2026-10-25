// SPEC: AC-34, FR-SET-03
package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestAC34_ConfigTest(t *testing.T) {
	router := NewRouter(RouterConfig{})

	// 1. Invalid method returns 405
	req := httptest.NewRequest(http.MethodGet, "/api/config/test", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusMethodNotAllowed {
		t.Fatalf("expected 405 for GET /api/config/test, got %d", rec.Code)
	}

	// 2. Test with mock/reachable endpoint
	body := `{"baseUrl":"http://localhost:11434/v1","model":"llama3.2:1b","apiKey":"ollama"}`
	req = httptest.NewRequest(http.MethodPost, "/api/config/test", strings.NewReader(body))
	rec = httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d: %s", rec.Code, rec.Body.String())
	}

	var resp ConfigTestResponse
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if resp.ActiveModel != "llama3.2:1b" {
		t.Errorf("expected activeModel llama3.2:1b, got %q", resp.ActiveModel)
	}
}
