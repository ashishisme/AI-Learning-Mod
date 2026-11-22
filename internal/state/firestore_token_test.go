// SPEC: FR-023
package state

import (
	"context"
	"io"
	"net/http"
	"strings"
	"testing"
)

type roundTrip func(*http.Request) (*http.Response, error)

func (f roundTrip) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }

func TestMetadataTokenIsRequestedCorrectlyAndCached(t *testing.T) {
	calls := 0
	m := &metadataToken{client: &http.Client{Transport: roundTrip(func(r *http.Request) (*http.Response, error) {
		calls++
		if r.Header.Get("Metadata-Flavor") != "Google" || r.URL.String() != metadataTokenURL {
			t.Errorf("request: %s %v", r.URL, r.Header)
		}
		return &http.Response{StatusCode: 200, Body: io.NopCloser(strings.NewReader(`{"access_token":"tok","expires_in":3600}`))}, nil
	})}}
	for i := 0; i < 3; i++ {
		got, err := m.get(context.Background())
		if err != nil || got != "tok" {
			t.Fatalf("token: %q %v", got, err)
		}
	}
	if calls != 1 {
		t.Errorf("metadata server calls = %d, want 1", calls)
	}
}

func TestMetadataTokenFailureIsAnError(t *testing.T) {
	m := &metadataToken{client: &http.Client{Transport: roundTrip(func(*http.Request) (*http.Response, error) {
		return &http.Response{StatusCode: 403, Body: io.NopCloser(strings.NewReader(""))}, nil
	})}}
	if _, err := m.get(context.Background()); err == nil {
		t.Error("a refused token must be an error")
	}
}

func TestDocIDKeepsStoredIDsAndEncodesTheRest(t *testing.T) {
	for _, id := range []string{"BETA-AAAA-BBBB", "20261102T100000-000001", "k_dXNhZ2U6", "abc123"} {
		if docID(id) != id {
			t.Errorf("%q changed to %q", id, docID(id))
		}
	}
	for _, id := range []string{"", ".", "..", "a/b", "__x__", "a b", strings.Repeat("x", 300)} {
		got := docID(id)
		if !safeDocID.MatchString(got) || docID(got) != got {
			t.Errorf("%q gave unsafe or unstable %q", id, got)
		}
	}
}
