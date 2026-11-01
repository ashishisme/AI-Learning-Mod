import React, { useState } from 'react'
import { deleteFeedback, fetchFeedback, qs, setFeedbackStatus } from '../../adminApi'
import { formatIST } from '../../dates'
import { btn, field, td, th } from './ui'
import { useVisiblePoll } from './useVisiblePoll'

interface Item { id: string; at: string; rating: number; category: string; message: string; label: string; lessonId: string; mode: string; status: 'new' | 'read' | 'resolved' }
interface Inbox { items: Item[]; total: number; unread: number; held: { waiting: number; withheld: number; byReason: Record<string, number> } }
export const FeedbackInbox: React.FC<{ unreadChanged?: (n: number) => void }> = ({ unreadChanged }) => {
  const [status, setStatus] = useState('')
  const [category, setCategory] = useState('')
  const [rating, setRating] = useState('')
  const [lessonId, setLessonId] = useState('')
  const [label, setLabel] = useState('')
  const [tick, setTick] = useState(0)
  const [notice, setNotice] = useState('')
  const filters = { status, category, rating, lessonId, label }
  const { data, error } = useVisiblePoll(async () => {
    const result = await fetchFeedback({ ...filters, limit: 100 }) as Inbox
    unreadChanged?.(result.unread)
    return result
  }, [status, category, rating, lessonId, label, tick])
  const update = async (id: string, value: 'new' | 'read' | 'resolved') => {
    try { await setFeedbackStatus(id, value); setTick((n) => n + 1) } catch { setNotice('Could not update feedback.') }
  }
  const remove = async (id: string) => {
    if (!window.confirm('Delete this feedback? This cannot be undone.')) return
    try { await deleteFeedback(id); setTick((n) => n + 1) } catch { setNotice('Could not delete feedback.') }
  }
  return <section aria-labelledby="inbox-title"><h2 id="inbox-title" className="text-xl font-bold mb-2">Feedback</h2><p className="text-sm mb-4">Do not copy feedback text elsewhere.</p>
    <div className="flex flex-wrap gap-3 mb-4">
      <label>Status <select className={field} value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All</option><option value="new">New</option><option value="read">Read</option><option value="resolved">Resolved</option></select></label>
      <label>Category <select className={field} value={category} onChange={(e) => setCategory(e.target.value)}><option value="">All</option>{['bug','content','idea','other'].map((c) => <option key={c}>{c}</option>)}</select></label>
      <label>Rating <select className={field} value={rating} onChange={(e) => setRating(e.target.value)}><option value="">All</option>{[1,2,3,4,5].map((n) => <option key={n}>{n}</option>)}</select></label>
      <label>Lesson <input className={field} value={lessonId} onChange={(e) => setLessonId(e.target.value)} /></label>
      <label>Group <input className={field} value={label} onChange={(e) => setLabel(e.target.value)} /></label>
    </div>
    {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}{!data && !error && <p role="status">Loading feedback…</p>}
    {data && <><div className="rounded border border-slate-300 dark:border-slate-600 p-3 mb-4"><h3 className="font-semibold">Held for review</h3><p>Waiting: {data.held.waiting}; withheld: {data.held.withheld}</p><ul>{Object.entries(data.held.byReason).map(([reason, count]) => <li key={reason}>{reason.replace(/_/g, ' ')}: {count}</li>)}</ul></div>
      <p className="mb-3">Unread: {data.unread} · Total: {data.total}</p>
      <a className={`${btn} inline-flex items-center`} href={`/api/admin/feedback.csv${qs(filters)}`} download>Export CSV</a>
      {data.items.length === 0 ? <p className="mt-4">No reviewed feedback matches these filters.</p> : <div className="overflow-x-auto mt-4"><table className="w-full text-sm"><caption className="sr-only">Reviewed feedback</caption><thead><tr>{['Date','Rating','Category','Message','Group','Lesson','Status','Actions'].map((h) => <th key={h} scope="col" className={th}>{h}</th>)}</tr></thead><tbody>{data.items.map((item) => <tr key={item.id}><td className={td}>{formatIST(item.at)}</td><td className={td}>{item.rating}</td><td className={td}>{item.category}</td><td className={td}>{item.message}</td><td className={td}>{item.label}</td><td className={td}>{item.lessonId}</td><td className={td}>{item.status}</td><td className={td}><div className="flex gap-1 flex-wrap">{(['new','read','resolved'] as const).filter((s) => s !== item.status).map((s) => <button key={s} type="button" className={btn} onClick={() => void update(item.id,s)}>Mark {s}</button>)}<button type="button" className={btn} onClick={() => void remove(item.id)}>Delete</button></div></td></tr>)}</tbody></table></div>}
    </>}
  </section>
}
