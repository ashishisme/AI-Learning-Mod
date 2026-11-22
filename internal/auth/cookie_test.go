// SPEC: FR-014
package auth

import (
	"strings"
	"testing"
	"time"
)

type payload struct {
	Email string `json:"email"`
	CSRF  string `json:"csrf"`
}

func TestSignerRoundTripAndTamper(t *testing.T) {
	s, err := NewSigner(strings.Repeat("k", 32))
	if err != nil {
		t.Fatal(err)
	}
	signed := s.Sign(payload{"a@example.org", "tok"}, time.Hour)
	var got payload
	if err := s.Verify(signed, &got); err != nil || got.Email != "a@example.org" || got.CSRF != "tok" {
		t.Fatalf("round trip failed: %v %+v", err, got)
	}

	i := strings.IndexByte(signed, '.')
	for name, bad := range map[string]string{
		"tampered payload": "A" + signed[1:],
		"tampered mac":     signed[:len(signed)-2] + "AA",
		"no separator":     strings.ReplaceAll(signed, ".", ""),
		"empty":            "",
		"mac only":         signed[i:],
	} {
		if err := s.Verify(bad, &got); err == nil {
			t.Errorf("%s: accepted", name)
		}
	}

	other, _ := NewSigner(strings.Repeat("z", 32))
	if err := other.Verify(signed, &got); err == nil {
		t.Error("a value signed with another secret was accepted")
	}
	if err := s.Verify(s.Sign(payload{}, -time.Second), &got); err == nil {
		t.Error("an expired value was accepted")
	}
	if _, err := NewSigner("short"); err == nil {
		t.Error("a short secret was accepted")
	}
}
