// SPEC: AC-34, FR-SET-03
package api

import (
	"bytes"
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

// Opt-in TLS skip for self-signed AI endpoints.
func TestConfigTestInsecureTLSOptIn(t *testing.T) {
	srv := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"id":"x","object":"chat.completion","choices":[{"index":0,"message":{"role":"assistant","content":"pong"},"finish_reason":"stop"}]}`))
	}))
	defer srv.Close()

	call := func(insecure bool) ConfigTestResponse {
		body, _ := json.Marshal(ConfigTestRequest{BaseURL: srv.URL + "/v1", Model: "m", APIKey: "k", InsecureTLS: insecure})
		rec := httptest.NewRecorder()
		ConfigTestHandler(rec, httptest.NewRequest(http.MethodPost, "/api/config/test", bytes.NewReader(body)))
		var out ConfigTestResponse
		if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
			t.Fatalf("bad response: %v", err)
		}
		return out
	}

	if r := call(false); r.OK {
		t.Fatal("self-signed endpoint must be rejected by default")
	}
	if r := call(true); !r.OK {
		t.Fatalf("insecureTls=true should connect, got error: %s", r.Error)
	}
}
