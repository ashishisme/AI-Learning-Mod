import React, { useState } from 'react'
import { fetchCosts, resetTutor } from '../../adminApi'
import { formatIST } from '../../dates'
import { btn, Dialog, primary } from './ui'
import { useVisiblePoll } from './useVisiblePoll'

interface CostData { generatedAt: string; ai: { estimated: boolean; todayUSD: number; ceilingUSD: number; ceilingReached: boolean; monthToDateUSD: number; budgetUSD: number; budgetUsedPct: number; projectedMonthUSD: number | null; thresholds: Record<string, boolean> }; hosting: { connected: boolean; reason: string; items: { name: string; usd: number }[] }; tutorOff: boolean }
const money = (n: number) => `$${n.toFixed(2)}`

// FR-026: the budget switch stays off until an admin turns it back on, so this names what that costs.
const TutorOff: React.FC<{ onReset: () => void }> = ({ onReset }) => {
  const [asking, setAsking] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const go = async () => {
    setBusy(true)
    setErr('')
    try {
      await resetTutor()
      setAsking(false)
      onReset()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not turn the tutor back on. Try again.')
    } finally {
      setBusy(false)
    }
  }
  return <section data-testid="tutor-off" aria-labelledby="tutor-off-title" className="rounded-lg border border-red-800 dark:border-red-300 p-4 mb-4">
    <h3 id="tutor-off-title" className="font-semibold mb-1">The tutor is off</h3>
    <p className="mb-3">The monthly budget was reached. Learners cannot ask the tutor anything until an admin turns it back on.</p>
    <button type="button" className={btn} onClick={() => setAsking(true)}>Turn the tutor back on</button>
    {asking && <Dialog title="Turn the tutor back on?" onClose={() => setAsking(false)} testId="tutor-reset-dialog">
      <p className="mb-3">AI spending can continue for the rest of this month, up to the daily ceiling, even though the budget has been reached. Your email is recorded in the audit trail.</p>
      {err && <p role="alert" className="mb-3 text-sm font-medium text-red-800 dark:text-red-300">{err}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" className={btn} onClick={() => setAsking(false)}>Keep it off</button>
        <button type="button" className={primary} disabled={busy} onClick={go}>{busy ? 'Working...' : 'Turn it back on'}</button>
      </div>
    </Dialog>}
  </section>
}

export const Costs: React.FC = () => {
  const [version, setVersion] = useState(0)
  const { data, error } = useVisiblePoll(() => fetchCosts() as Promise<CostData>, [version])
  return <section aria-labelledby="cost-title"><h2 id="cost-title" className="text-xl font-bold mb-4">Costs</h2>
    {error && <p role="alert">{error}</p>}{!data && !error && <p role="status">Loading costs…</p>}
    {data && <>{data.tutorOff && <TutorOff onReset={() => setVersion((v) => v + 1)} />}<div className="grid sm:grid-cols-2 gap-4"><section className="rounded-lg border border-slate-300 dark:border-slate-600 p-4"><h3 className="font-semibold mb-2">AI spend (estimated)</h3>
      <p>Today: {money(data.ai.todayUSD)} of {money(data.ai.ceilingUSD)} ceiling{data.ai.ceilingReached ? ' — reached' : ''}</p><p>Month to date: {money(data.ai.monthToDateUSD)} of {money(data.ai.budgetUSD)} budget ({data.ai.budgetUsedPct.toFixed(1)}%)</p>
      <p>Projected month: {data.ai.projectedMonthUSD === null ? 'Available after day 3' : money(data.ai.projectedMonthUSD)}</p><p>Budget thresholds: {[50, 90, 100].map((n) => `${n}% ${data.ai.thresholds[String(n)] ? 'reached' : 'open'}`).join(' · ')}</p>
    </section><section className="rounded-lg border border-slate-300 dark:border-slate-600 p-4"><h3 className="font-semibold mb-2">Hosting</h3>{data.hosting.connected ? data.hosting.items.map((i) => <p key={i.name}>{i.name}: {money(i.usd)}</p>) : <p>Not connected. {data.hosting.reason}</p>}</section></div>
      <p className="text-sm text-slate-700 dark:text-slate-300 mt-4">Last updated {formatIST(data.generatedAt)}</p></>}
  </section>
}
