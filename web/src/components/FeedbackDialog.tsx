import React, { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { ApiError } from '../api'
import { useAudienceModeStore } from '../store'
import pkg from '../../package.json'

export const FeedbackDialog: React.FC<{ close: () => void }> = ({ close }) => {
  const [rating, setRating] = useState(0)
  const [category, setCategory] = useState('content')
  const [message, setMessage] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const panel = useRef<HTMLDivElement>(null)
  const location = useLocation()
  const mode = useAudienceModeStore((s) => s.mode)
  const lessonId = location.pathname.match(/^\/(?:lesson|quiz)\/([a-z0-9_-]{1,64})$/)?.[1] ?? ''
  useEffect(() => {
    panel.current?.querySelector<HTMLElement>('input')?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      if (e.key !== 'Tab' || !panel.current) return
      const controls = Array.from(panel.current.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)'))
      if (!controls.length) return
      const first = controls[0], last = controls[controls.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [close])
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rating || busy) return
    setBusy(true); setNotice('')
    try {
      const response = await fetch('/api/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rating, category, message, lessonId, mode, appVersion: pkg.version }) })
      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new ApiError(response.status, body.error || 'Could not send feedback', body)
      }
      setNotice('Thanks! Your feedback was sent for review.')
      setMessage('')
    } catch (error) {
      if (error instanceof ApiError && error.code === 'pii_detected') {
        const kind = String((error.data as { kind?: string } | undefined)?.kind || 'personal details').replace(/_/g, ' ')
        setNotice(`Please remove personal details (${kind}) and send again.`)
      } else if (error instanceof ApiError && error.code === 'feedback_limit') {
        setNotice('Thanks! You have sent a few already. Please try again later.')
      } else setNotice('Could not send feedback. Please try again.')
    } finally { setBusy(false) }
  }
  return <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"><div ref={panel} role="dialog" aria-modal="true" aria-labelledby="feedback-title" className="w-full max-w-lg rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-5 shadow-xl">
    <div className="flex justify-between items-center"><h2 id="feedback-title" className="text-xl font-bold">Send feedback</h2><button type="button" aria-label="Close feedback" className="min-h-11 min-w-11 focus-visible:ring-2 focus-visible:ring-blue-600" onClick={close}>✕</button></div>
    <p className="text-sm my-3">Please do not include names, phone numbers, emails or addresses. Feedback is checked before an admin can read it.</p>
    <form onSubmit={submit} className="space-y-4">
      <fieldset><legend className="font-semibold">Rating</legend><div className="flex gap-2">{[1,2,3,4,5].map((n) => <label key={n} className="min-h-11 min-w-11 flex items-center gap-1"><input type="radio" name="rating" value={n} checked={rating === n} onChange={() => setRating(n)} className="focus-visible:ring-2 focus-visible:ring-blue-600" />{n}</label>)}</div></fieldset>
      <label className="block font-semibold">Category<select value={category} onChange={(e) => setCategory(e.target.value)} className="block w-full min-h-11 p-2 border border-slate-500 rounded bg-white dark:bg-slate-900 focus-visible:ring-2 focus-visible:ring-blue-600"><option value="content">Content</option><option value="bug">Bug</option><option value="idea">Idea</option><option value="other">Other</option></select></label>
      <label className="block font-semibold">Message (optional)<textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={500} className="block w-full min-h-24 p-2 border border-slate-500 rounded bg-white dark:bg-slate-900 focus-visible:ring-2 focus-visible:ring-blue-600" /></label>
      <p className="text-sm">{message.length} / 500 characters</p>
      {notice && <p role="status" className="text-sm font-semibold">{notice}</p>}
      <button type="submit" disabled={!rating || busy} className="min-h-11 px-5 rounded bg-blue-700 text-white disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-blue-600">{busy ? 'Sending…' : 'Send feedback'}</button>
    </form>
  </div></div>
}
