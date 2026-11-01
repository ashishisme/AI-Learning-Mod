// SPEC-008: the server sends UTC; every date the user sees is India Standard Time, e.g. "2 Nov 2026, 3:30 pm".
export function formatIST(iso: string | null | undefined, withTime = true): string {
  if (!iso) return 'Never'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'Unknown'
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
      .formatToParts(d)
      .map((p) => [p.type, p.value]),
  )
  const date = `${parts.day} ${parts.month} ${parts.year}`
  return withTime ? `${date}, ${parts.hour}:${parts.minute} ${String(parts.dayPeriod).toLowerCase()}` : date
}
