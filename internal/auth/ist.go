// SPEC: FR-007, FR-008 (calendar months in IST)
package auth

import "time"

// IST is a fixed +05:30 zone. India has no daylight saving, and a fixed zone needs no tzdata in
// the Alpine image.
var IST = time.FixedZone("IST", 5*3600+1800)

// AddMonthsIST adds n calendar months in IST: the same day of the month and time of day, or the
// last day of the target month when that day does not exist. The result is in UTC.
func AddMonthsIST(t time.Time, n int) time.Time {
	t = t.In(IST)
	y, m, d := t.Date()
	target := time.Date(y, m+time.Month(n), 1, t.Hour(), t.Minute(), t.Second(), t.Nanosecond(), IST)
	if last := daysIn(target); d > last {
		d = last
	}
	return time.Date(target.Year(), target.Month(), d, t.Hour(), t.Minute(), t.Second(), t.Nanosecond(), IST).UTC()
}

// DayKey is the IST calendar day, YYYY-MM-DD.
func DayKey(t time.Time) string { return t.In(IST).Format("2006-01-02") }

// HourKey is the IST hour, YYYY-MM-DDTHH.
func HourKey(t time.Time) string { return t.In(IST).Format("2006-01-02T15") }

// DaysInMonthIST is the number of days in t's IST month.
func DaysInMonthIST(t time.Time) int { return daysIn(t.In(IST)) }

func daysIn(t time.Time) int {
	return time.Date(t.Year(), t.Month()+1, 0, 0, 0, 0, 0, IST).Day()
}
