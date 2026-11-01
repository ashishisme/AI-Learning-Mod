import React from 'react'
import { fetchCosts } from '../../adminApi'
import { formatIST } from '../../dates'
import { useVisiblePoll } from './useVisiblePoll'

interface CostData { generatedAt: string; ai: { estimated: boolean; todayUSD: number; ceilingUSD: number; ceilingReached: boolean; monthToDateUSD: number; budgetUSD: number; budgetUsedPct: number; projectedMonthUSD: number | null; thresholds: Record<string, boolean> }; hosting: { connected: boolean; reason: string; items: { name: string; usd: number }[] } }
const money = (n: number) => `$${n.toFixed(2)}`
export const Costs: React.FC = () => {
  const { data, error } = useVisiblePoll(() => fetchCosts() as Promise<CostData>, [])
  return <section aria-labelledby="cost-title"><h2 id="cost-title" className="text-xl font-bold mb-4">Costs</h2>
    {error && <p role="alert">{error}</p>}{!data && !error && <p role="status">Loading costs…</p>}
    {data && <><div className="grid sm:grid-cols-2 gap-4"><section className="rounded-lg border border-slate-300 dark:border-slate-600 p-4"><h3 className="font-semibold mb-2">AI spend (estimated)</h3>
      <p>Today: {money(data.ai.todayUSD)} of {money(data.ai.ceilingUSD)} ceiling{data.ai.ceilingReached ? ' — reached' : ''}</p><p>Month to date: {money(data.ai.monthToDateUSD)} of {money(data.ai.budgetUSD)} budget ({data.ai.budgetUsedPct.toFixed(1)}%)</p>
      <p>Projected month: {data.ai.projectedMonthUSD === null ? 'Available after day 3' : money(data.ai.projectedMonthUSD)}</p><p>Budget thresholds: {[50, 90, 100].map((n) => `${n}% ${data.ai.thresholds[String(n)] ? 'reached' : 'open'}`).join(' · ')}</p>
    </section><section className="rounded-lg border border-slate-300 dark:border-slate-600 p-4"><h3 className="font-semibold mb-2">Hosting</h3>{data.hosting.connected ? data.hosting.items.map((i) => <p key={i.name}>{i.name}: {money(i.usd)}</p>) : <p>Not connected. {data.hosting.reason}</p>}</section></div>
      <p className="text-sm text-slate-700 dark:text-slate-300 mt-4">Last updated {formatIST(data.generatedAt)}</p></>}
  </section>
}
