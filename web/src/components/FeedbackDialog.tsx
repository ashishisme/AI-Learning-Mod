import React, { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { ApiError } from '../api'
import { useAudienceModeStore } from '../store'
import pkg from '../../package.json'
import { useLanguage, useT } from '../i18n'

export const FeedbackDialog: React.FC<{ close: () => void }> = ({ close }) => {
  const t = useT()
  const { code: lang } = useLanguage()
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
      const response = await fetch('/api/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rating, category, message, lessonId, mode, appVersion: pkg.version, lang }) })
      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new ApiError(response.status, body.error || t('feedback.sendFailedShort'), body)
      }
      setNotice(t('feedback.sent'))
      setMessage('')
    } catch (error) {
      if (error instanceof ApiError && error.code === 'pii_detected') {
        // The server writes the rejection in the learner's language (SPEC-009 FR-022). English keeps the
        // client's own wording, which names the kind.
        if (lang !== 'en' && error.message) { setNotice(error.message); return }
        const kind = String((error.data as { kind?: string } | undefined)?.kind || t('feedback.piiDefault')).replace(/_/g, ' ')
        setNotice(t('feedback.pii', { kind }))
      } else if (error instanceof ApiError && error.code === 'feedback_limit') {
        setNotice(t('feedback.limit'))
      } else setNotice(t('feedback.sendFailed'))
    } finally { setBusy(false) }
  }
  return <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"><div ref={panel} role="dialog" aria-modal="true" aria-labelledby="feedback-title" className="w-full max-w-lg rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-5 shadow-xl">
    <div className="flex justify-between items-center"><h2 id="feedback-title" className="text-xl font-bold">{t('feedback.title')}</h2><button type="button" aria-label={t('feedback.close')} className="min-h-11 min-w-11 focus-visible:ring-2 focus-visible:ring-blue-600" onClick={close}>✕</button></div>
    <p className="text-sm my-3">{t('feedback.privacy')}</p>
    <form onSubmit={submit} className="space-y-4">
      <fieldset><legend className="font-semibold">{t('feedback.rating')}</legend><div className="flex gap-2">{[1,2,3,4,5].map((n) => <label key={n} className="min-h-11 min-w-11 flex items-center gap-1"><input type="radio" name="rating" value={n} checked={rating === n} onChange={() => setRating(n)} className="focus-visible:ring-2 focus-visible:ring-blue-600" />{n}</label>)}</div></fieldset>
      <label className="block font-semibold">{t('feedback.category')}<select value={category} onChange={(e) => setCategory(e.target.value)} className="block w-full min-h-11 p-2 border border-slate-500 rounded bg-white dark:bg-slate-900 focus-visible:ring-2 focus-visible:ring-blue-600"><option value="content">{t('feedback.content')}</option><option value="bug">{t('feedback.bug')}</option><option value="idea">{t('feedback.idea')}</option><option value="other">{t('feedback.other')}</option></select></label>
      <label className="block font-semibold">{t('feedback.message')}<textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={500} className="block w-full min-h-24 p-2 border border-slate-500 rounded bg-white dark:bg-slate-900 focus-visible:ring-2 focus-visible:ring-blue-600" /></label>
      <p className="text-sm">{t('feedback.count', { n: message.length })}</p>
      {notice && <p role="status" className="text-sm font-semibold">{notice}</p>}
      <button type="submit" disabled={!rating || busy} className="min-h-11 px-5 rounded bg-blue-700 text-white disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-blue-600">{t(busy ? 'feedback.sending' : 'feedback.title')}</button>
    </form>
  </div></div>
}
