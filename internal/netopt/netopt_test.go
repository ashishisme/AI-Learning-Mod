package netopt

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestHTTPClientVerifiesByDefaultAndSkipsWhenAsked(t *testing.T) {
	srv := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()

	if _, err := HTTPClient(5*time.Second, false).Get(srv.URL); err == nil {
		t.Fatal("expected certificate verification error for a self-signed server")
	}
	resp, err := HTTPClient(5*time.Second, true).Get(srv.URL)
	if err != nil {
		t.Fatalf("insecure client should connect: %v", err)
	}
	resp.Body.Close()
}

func TestEnvInsecure(t *testing.T) {
	cases := map[string]bool{"": false, "false": false, "0": false, "garbage": false, "true": true, "1": true}
	for v, want := range cases {
		t.Setenv(EnvInsecureTLS, v)
		if got := EnvInsecure(); got != want {
			t.Errorf("EnvInsecure(%q) = %v, want %v", v, got, want)
		}
	}
}
