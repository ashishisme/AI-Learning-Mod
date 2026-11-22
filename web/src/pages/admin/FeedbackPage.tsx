// SPEC: FR-051, FR-I18N-11, FR-I18N-12. The admin Feedback page: "Read feedback" (the inbox) and "Controls"
// (the per-learner limits). Admin pages are English-only, like the rest of the console.
import React, { useEffect, useState } from 'react'
import { NavLink, Route, Routes } from 'react-router-dom'
import { fetchFeedbackLimits, fetchFeedbackRatings, setFeedbackLimits, type AreaSummary, type FeedbackLimits, type RatingsSummary } from '../../adminApi'
import { FeedbackInbox } from './FeedbackInbox'
import { field, primary, td, th } from './ui'

const sub = ({ isActive }: { isActive: boolean }) =>
  `inline-flex items-center min-h-11 px-4 rounded-lg text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
    isActive ? 'bg-blue-700 text-white' : 'border border-slate-400 dark:border-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
  }`

export const FeedbackPage: React.FC<{ unreadChanged?: (n: number) => void }> = ({ unreadChanged }) => (
  <div>
    <nav aria-label="Feedback sections" className="flex flex-wrap gap-2 mb-5">
      <NavLink to="/admin/feedback" end className={sub}>Read feedback</NavLink>
      <NavLink to="/admin/feedback/ratings" className={sub}>Ratings</NavLink>
      <NavLink to="/admin/feedback/controls" className={sub}>Controls</NavLink>
    </nav>
    <Routes>
      <Route index element={<FeedbackInbox unreadChanged={unreadChanged} />} />
      <Route path="ratings" element={<FeedbackRatings />} />
      <Route path="controls" element={<FeedbackControls />} />
    </Routes>
  </div>
)

// FR-I18N-12: each learner may send a set number of reports a day and in total. The admin may raise or lower both.
export const FeedbackControls: React.FC = () => {
  const [limits, setLimits] = useState<FeedbackLimits | null>(null)
  const [daily, setDaily] = useState('')
  const [total, setTotal] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    fetchFeedbackLimits().then((l) => { setLimits(l); setDaily(String(l.daily)); setTotal(String(l.total)) })
      .catch(() => setNotice('Could not load the limits.'))
  }, [])
  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    const d = Number(daily), t = Number(total)
    if (!limits || !Number.isInteger(d) || !Number.isInteger(t) || d < 1 || t < 1 || d > limits.maxDaily || t > limits.maxTotal || d > t) {
      setNotice(`Use whole numbers: daily 1–${limits?.maxDaily ?? 100}, total 1–${limits?.maxTotal ?? 1000}, and daily no more than total.`)
      return
    }
    setBusy(true); setNotice('')
    try {
      const l = await setFeedbackLimits(d, t)
      setLimits(l); setNotice(`Saved: ${l.daily} a day, ${l.total} in total per learner. The change is in the audit log.`)
    } catch { setNotice('Could not save the limits.') } finally { setBusy(false) }
  }
  return (
    <section aria-labelledby="controls-title" className="max-w-xl space-y-4">
      <h2 id="controls-title" className="text-xl font-bold">Feedback controls</h2>
      <p className="text-sm">Each learner can send at most this many reports. Refused messages (with personal details) do not count. Every learner is also limited to 5 an hour.</p>
      {limits && <p data-testid="limits-now" className="text-sm font-semibold">Now: {limits.daily} a day, {limits.total} in total per learner.</p>}
      <form onSubmit={save} className="flex flex-wrap items-end gap-3">
        <label className="block text-sm font-semibold">Per day
          <input type="number" min={1} max={limits?.maxDaily} value={daily} onChange={(e) => setDaily(e.target.value)} className={`${field} block w-28`} />
        </label>
        <label className="block text-sm font-semibold">In total
          <input type="number" min={1} max={limits?.maxTotal} value={total} onChange={(e) => setTotal(e.target.value)} className={`${field} block w-28`} />
        </label>
        <button type="submit" className={primary} disabled={busy || !limits}>{busy ? 'Saving…' : 'Save limits'}</button>
      </form>
      {notice && <p role="status" className="text-sm">{notice}</p>}
      <p className="text-sm text-slate-700 dark:text-slate-300">Defaults: 10 a day, 50 in total. Messages with a phone number, email or address are refused before they reach you. There is no AI check and no cost per message.</p>
    </section>
  )
}

const AREA_NAMES: Record<string, string> = { lessons: 'Lessons are easy to understand', ease: 'The app is easy to use', voice: 'Voices and narration', translation: 'Translation (all languages)' }
const LANG_NAMES: Record<string, string> = { hi: 'Hindi', kn: 'Kannada', ta: 'Tamil' }

// FR-I18N-13: the star ratings, as averages and counts. One set per learner; no learner is shown.
export const FeedbackRatings: React.FC = () => {
  const [data, setData] = useState<RatingsSummary | null>(null)
  const [error, setError] = useState('')
  useEffect(() => { fetchFeedbackRatings().then(setData).catch(() => setError('Could not load the ratings.')) }, [])
  const row = (name: string, a: AreaSummary) => (
    <tr key={name}>
      <th scope="row" className={`${td} text-left font-semibold`}>{name}</th>
      <td className={td}>{a.count ? `${a.average.toFixed(2)} ★` : '—'}</td>
      <td className={td}>{a.count}</td>
      <td className={td}>{a.stars.map((n, i) => `${i + 1}★ ${n}`).join(' · ')}</td>
    </tr>
  )
  if (error) return <p role="alert">{error}</p>
  if (!data) return <p role="status">Loading ratings…</p>
  const tr = data.areas.translation
  return (
    <section aria-labelledby="ratings-title">
      <h2 id="ratings-title" className="text-xl font-bold mb-2">Ratings</h2>
      <p data-testid="ratings-learners" className="text-sm mb-4">{data.learners} learners have rated. Each learner has one set of ratings; changing it replaces the old one.</p>
      <div className="overflow-x-auto"><table className="w-full text-sm"><caption className="sr-only">Average ratings by area</caption>
        <thead><tr>{['Area', 'Average', 'Ratings', 'Spread'].map((h) => <th key={h} scope="col" className={th}>{h}</th>)}</tr></thead>
        <tbody>
          {['lessons', 'ease', 'voice', 'translation'].map((k) => data.areas[k] && row(AREA_NAMES[k], data.areas[k]))}
          {tr?.byLang && Object.entries(tr.byLang).map(([code, a]) => row(`Translation: ${LANG_NAMES[code] ?? code}`, a))}
        </tbody>
      </table></div>
    </section>
  )
}
