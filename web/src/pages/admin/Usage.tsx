import React, { useState } from 'react'
import { fetchUsage } from '../../adminApi'
import { BarSeries } from '../../components/charts/BarSeries'
import { formatIST } from '../../dates'
import { field, td, th } from './ui'
import { useVisiblePoll } from './useVisiblePoll'

interface Day { date: string; dau: number; signinOk: number; signinFail: number; activations: number; quiz: number; tutorQuestions: number; requests: number; errors5xx: number }
interface UsageData { generatedAt: string; series: Day[]; lessons: { lessonId: string; views: number }[] }
export const Usage: React.FC = () => {
  const [days, setDays] = useState<7 | 30>(30)
  const { data, error } = useVisiblePoll(() => fetchUsage(days) as Promise<UsageData>, [days])
  return <section aria-labelledby="usage-title"><h2 id="usage-title" className="text-xl font-bold mb-4">Usage</h2>
    <label className="flex items-center gap-2 mb-4">Period <select className={field} value={days} onChange={(e) => setDays(Number(e.target.value) as 7 | 30)}><option value={7}>7 days</option><option value={30}>30 days</option></select></label>
    {error && <p role="alert">{error}</p>}{!data && !error && <p role="status">Loading usage…</p>}
    {data && <><BarSeries title="Daily active accounts" bars={data.series.map((d) => ({ label: d.date, value: d.dau }))} />
      <p className="text-sm mt-2">Daily active totals count account-days.</p>
      <h3 className="text-lg font-semibold mt-6 mb-2">Lesson views</h3><table className="w-full text-sm"><caption className="sr-only">Lesson views</caption><thead><tr><th className={th}>Lesson</th><th className={th}>Views</th></tr></thead><tbody>{data.lessons.map((l) => <tr key={l.lessonId}><td className={td}>{l.lessonId}</td><td className={td}>{l.views}</td></tr>)}</tbody></table>
      <p className="text-sm text-slate-700 dark:text-slate-300 mt-4">Last updated {formatIST(data.generatedAt)}</p></>}
  </section>
}
