// SPEC: FR-007, FR-008
package auth

import (
	"testing"
	"time"
)

func ist(y int, m time.Month, d, h, min int) time.Time {
	return time.Date(y, m, d, h, min, 0, 0, IST)
}

func TestAddMonthsIST(t *testing.T) {
	cases := []struct {
		name string
		in   time.Time
		n    int
		want time.Time
	}{
		{"same day two months later", ist(2026, 11, 2, 10, 30), 2, ist(2027, 1, 2, 10, 30)},
		{"jan 31 plus 1 clamps to feb 28", ist(2027, 1, 31, 9, 0), 1, ist(2027, 2, 28, 9, 0)},
		{"jan 31 plus 1 clamps to feb 29 in a leap year", ist(2028, 1, 31, 9, 0), 1, ist(2028, 2, 29, 9, 0)},
		{"dec 31 plus 2 rolls the year", ist(2026, 12, 31, 23, 59), 2, ist(2027, 2, 28, 23, 59)},
		{"oct 31 plus 2 clamps to dec 31", ist(2026, 10, 31, 8, 0), 2, ist(2026, 12, 31, 8, 0)},
		{"24 months", ist(2026, 3, 15, 12, 0), 24, ist(2028, 3, 15, 12, 0)},
	}
	for _, c := range cases {
		got := AddMonthsIST(c.in, c.n)
		if !got.Equal(c.want) {
			t.Errorf("%s: got %s, want %s", c.name, got.In(IST), c.want)
		}
		if got.Location() != time.UTC {
			t.Errorf("%s: result must be in UTC", c.name)
		}
	}
}

func TestISTDayBoundary(t *testing.T) {
	// 18:30 UTC is midnight IST: the next IST day.
	before := time.Date(2026, 11, 1, 18, 29, 0, 0, time.UTC)
	after := time.Date(2026, 11, 1, 18, 30, 0, 0, time.UTC)
	if DayKey(before) != "2026-11-01" || DayKey(after) != "2026-11-02" {
		t.Fatalf("day keys: %s, %s", DayKey(before), DayKey(after))
	}
	if got := HourKey(after); got != "2026-11-02T00" {
		t.Fatalf("hour key: %s", got)
	}
	if DaysInMonthIST(time.Date(2028, 2, 10, 0, 0, 0, 0, time.UTC)) != 29 {
		t.Fatal("february 2028 has 29 days")
	}
}
