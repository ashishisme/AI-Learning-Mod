package netopt

import (
	"net"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestIsBlockedIP(t *testing.T) {
	blocked := []string{"127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254",
		"100.64.0.1", "0.0.0.0", "224.0.0.1", "::1", "fd00::1", "fe80::1", "::ffff:169.254.169.254", "::ffff:10.0.0.1"}
	allowed := []string{"8.8.8.8", "1.1.1.1", "172.32.0.1", "104.18.0.1", "2606:4700:4700::1111"}
	for _, s := range blocked {
		if !IsBlockedIP(net.ParseIP(s)) {
			t.Errorf("%s should be blocked", s)
		}
	}
	for _, s := range allowed {
		if IsBlockedIP(net.ParseIP(s)) {
			t.Errorf("%s should be allowed", s)
		}
	}
	if !IsBlockedIP(nil) {
		t.Error("an unparseable address must be blocked")
	}
}

func TestGuardedHTTPClientRefusesLoopbackAndRedirects(t *testing.T) {
	var hits int
	internal := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		hits++
		w.WriteHeader(http.StatusOK)
	}))
	defer internal.Close()

	c := GuardedHTTPClient(5*time.Second, false)
	if resp, err := c.Get(internal.URL); err == nil {
		resp.Body.Close()
		t.Fatal("expected the guarded client to refuse a loopback server")
	}
	if hits != 0 {
		t.Fatalf("the internal server was reached %d times", hits)
	}
}
