// SPEC: FR-047..FR-059, FR-I18N-11..13. Feedback has two parts (owner decision 2026-11-21):
// 1. star ratings, one saved set per learner that a resubmit overwrites;
// 2. a written message, checked for personal details and limited per learner.
// Opened from "Report a wording problem", only the written part shows, with the place it is about.
import React, { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { ApiError } from '../api'
import { useAudienceModeStore } from '../store'
import pkg from '../../package.json'
import { useLanguage, useT } from '../i18n'

// A wording report (SPEC-016) names its place: the section id, the clip step and a readable label.
export type WordingPlace = { sectionId?: string; step?: number; label: string }

type Area = 'lessons' | 'ease' | 'voice' | 'translation'
type Stars = Record<Area, number>
const NONE: Stars = { lessons: 0, ease: 0, voice: 0, translation: 0 }

const field = 'block w-full min-h-11 p-2 border border-slate-500 rounded bg-white dark:bg-slate-900 focus-visible:ring-2 focus-visible:ring-blue-600'
const button = 'min-h-11 px-5 rounded bg-blue-700 text-white disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-blue-600'

async function send(url: string, body: unknown, fallback: string) {
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new ApiError(response.status, data.error || fallback, data)
  }
}

// One row of 1–5 stars, as a radio group so keyboards and screen readers work without extra code.
const StarRow: React.FC<{ area: Area; label: string; value: number; set: (n: number) => void }> = ({ area, label, value, set }) => {
  const t = useT()
  return (
    <fieldset className="flex flex-wrap items-center justify-between gap-x-3">
      <legend className="float-left text-sm font-semibold py-2">{label}</legend>
      <div className="flex">
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="min-h-11 min-w-11 flex items-center justify-center cursor-pointer text-2xl">
            <input type="radio" name={`stars-${area}`} value={n} checked={value === n} onChange={() => set(n)} className="sr-only peer" aria-label={t('feedback.stars', { n })} />
            <span aria-hidden="true" className={`rounded peer-focus-visible:ring-2 peer-focus-visible:ring-blue-600 ${n <= value ? 'text-amber-500' : 'text-slate-400 dark:text-slate-500'}`}>★</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

export const FeedbackDialog: React.FC<{ close: () => void; place?: WordingPlace }> = ({ close, place }) => {
  const t = useT()
  // The language of the text being reported is the one showing when the dialog opened (spec edge case).
  const [lang] = useState(useLanguage().code)
  const [stars, setStars] = useState<Stars>(NONE)
  const [saved, setSaved] = useState(false) // the learner already has ratings on file
  const [rateNotice, setRateNotice] = useState('')
  const [category, setCategory] = useState(place ? 'translation' : 'content')
  const [message, setMessage] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const panel = useRef<HTMLDivElement>(null)
  const location = useLocation()
  const mode = useAudienceModeStore((s) => s.mode)
  const lessonId = location.pathname.match(/^\/(?:lesson|quiz)\/([a-z0-9_-]{1,64})$/)?.[1] ?? ''
  const areas: Area[] = lang === 'en' ? ['lessons', 'ease', 'voice'] : ['lessons', 'ease', 'voice', 'translation']

  useEffect(() => {
    if (place) return
    fetch('/api/feedback/ratings').then((r) => (r.ok ? r.json() : null)).then((r) => {
      if (!r) return
      const got: Stars = { lessons: r.lessons || 0, ease: r.ease || 0, voice: r.voice || 0, translation: r.lang === lang ? r.translation || 0 : 0 }
      setStars(got)
      setSaved(Object.values(got).some((v) => v > 0))
    }).catch(() => {})
  }, [place, lang])

  useEffect(() => {
    panel.current?.querySelector<HTMLElement>('input, textarea')?.focus()
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

  const rated = areas.some((a) => stars[a] > 0)
  const saveRatings = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rated || busy) return
    setBusy(true); setRateNotice('')
    try {
      const translation = areas.includes('translation') ? stars.translation : 0
      await send('/api/feedback/ratings', { ...stars, translation, lang: translation ? lang : '' }, t('feedback.sendFailedShort'))
      setSaved(true); setRateNotice(t('feedback.ratingsSaved'))
    } catch { setRateNotice(t('feedback.sendFailed')) } finally { setBusy(false) }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || busy) return
    setBusy(true); setNotice('')
    try {
      await send('/api/feedback', { category, message, lessonId, mode, appVersion: pkg.version, lang, sectionId: place?.sectionId, step: place?.step }, t('feedback.sendFailedShort'))
      setNotice(t('feedback.sent'))
      setMessage('')
    } catch (error) {
      if (error instanceof ApiError && error.code === 'pii_detected') {
        // The server writes the rejection in the learner's language (SPEC-009 FR-022). English keeps the
        // client's own wording, which names the kind.
        if (lang !== 'en' && error.message) { setNotice(error.message); return }
        const kind = String((error.data as { kind?: string } | undefined)?.kind || t('feedback.piiDefault')).replace(/_/g, ' ')
        setNotice(t('feedback.pii', { kind }))
      } else if (error instanceof ApiError && error.code === 'feedback_daily_limit') {
        setNotice(t('feedback.dailyLimit'))
      } else if (error instanceof ApiError && error.code === 'feedback_total_limit') {
        setNotice(t('feedback.totalLimit'))
      } else if (error instanceof ApiError && error.code === 'feedback_limit') {
        setNotice(t('feedback.limit'))
      } else setNotice(t('feedback.sendFailed'))
    } finally { setBusy(false) }
  }

  return <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"><div ref={panel} role="dialog" aria-modal="true" aria-labelledby="feedback-title" className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-5 shadow-xl">
    <div className="flex justify-between items-center"><h2 id="feedback-title" className="text-xl font-bold">{t(place ? 'feedback.report' : 'feedback.title')}</h2><button type="button" aria-label={t('feedback.close')} className="min-h-11 min-w-11 focus-visible:ring-2 focus-visible:ring-blue-600" onClick={close}>✕</button></div>

    {!place && <form onSubmit={saveRatings} aria-labelledby="ratings-title" data-testid="ratings-part" className="mt-3 space-y-1 pb-4 border-b border-slate-200 dark:border-slate-700">
      <h3 id="ratings-title" className="font-bold">{t('feedback.ratingsTitle')}</h3>
      {areas.map((a) => <StarRow key={a} area={a} label={t(`feedback.area.${a}`)} value={stars[a]} set={(n) => setStars((s) => ({ ...s, [a]: n }))} />)}
      {rateNotice && <p role="status" className="text-sm font-semibold">{rateNotice}</p>}
      <button type="submit" disabled={!rated || busy} className={button}>{t(saved ? 'feedback.updateRatings' : 'feedback.saveRatings')}</button>
    </form>}

    <form onSubmit={submit} aria-labelledby="write-title" data-testid="write-part" className="mt-4 space-y-3">
      {!place && <h3 id="write-title" className="font-bold">{t('feedback.writeTitle')}</h3>}
      {place && <p id="write-title" className="text-sm font-semibold">{t('feedback.about', { place: place.label })}</p>}
      <p className="text-sm">{t('feedback.privacy')}</p>
      <label className="block font-semibold">{t('feedback.category')}<select value={category} onChange={(e) => setCategory(e.target.value)} className={field}><option value="translation">{t('feedback.translation')}</option><option value="content">{t('feedback.content')}</option><option value="bug">{t('feedback.bug')}</option><option value="idea">{t('feedback.idea')}</option><option value="other">{t('feedback.other')}</option></select></label>
      <label className="block font-semibold">{t('feedback.message')}<textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={500} className={`${field} min-h-24`} /></label>
      <p className="text-sm">{t('feedback.count', { n: message.length })}</p>
      {notice && <p role="status" className="text-sm font-semibold">{notice}</p>}
      <button type="submit" disabled={!message.trim() || busy} className={button}>{t(busy ? 'feedback.sending' : 'feedback.send')}</button>
    </form>
  </div></div>
}
