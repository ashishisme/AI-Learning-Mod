import React from 'react'
import { fetchOverview } from '../../adminApi'
import { formatIST } from '../../dates'
import { useVisiblePoll } from './useVisiblePoll'

interface OverviewData {
  generatedAt: string; seats: { used: number; cap: number }
  accounts: { active: number; expired: number; revoked: number; expiringIn7Days: number }
  invites: { pending: number }; activeNow: number; activeLast24h: number; activeLast7d: number
  ai: { todayUSD: number; ceilingUSD: number; monthToDateUSD: number; budgetUSD: number }
  feedback: { unread: number }
}

export const Overview: React.FC = () => {
  const { data, error } = useVisiblePoll(() => fetchOverview() as Promise<OverviewData>, [])
  if (error) return <p role="alert">{error}</p>
  if (!data) return <p role="status">Loading overview…</p>
  const tiles: [string, string][] = [
    ['Seats used', `${data.seats.used} / ${data.seats.cap}`], ['Active accounts', String(data.accounts.active)],
    ['Active now', String(data.activeNow)], ['Active in 7 days', String(data.activeLast7d)],
    ['Pending invites', String(data.invites.pending)], ['Expiring in 7 days', String(data.accounts.expiringIn7Days)],
    ['Unread feedback', String(data.feedback.unread)],
    ['AI spend today', `$${data.ai.todayUSD.toFixed(2)} / $${data.ai.ceilingUSD.toFixed(2)}`],
  ]
  return <section aria-labelledby="overview-title"><h2 id="overview-title" className="text-xl font-bold mb-4">Overview</h2>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{tiles.map(([label, value]) => <div key={label} className="rounded-lg border border-slate-300 dark:border-slate-600 p-4"><h3 className="text-sm text-slate-700 dark:text-slate-300">{label}</h3><p className="text-2xl font-bold mt-2">{value}</p></div>)}</div>
    <p className="text-sm text-slate-700 dark:text-slate-300 mt-4">Last updated {formatIST(data.generatedAt)}</p>
  </section>
}
