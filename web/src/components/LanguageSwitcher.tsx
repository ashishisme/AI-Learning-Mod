// SPEC: SPEC-009 FR-001, FR-002, FR-004; DC-11
// A native select: keyboard, screen reader and the phone's own picker work without extra code, and
// it stays compact as more languages arrive. Each option is written in its own language and script,
// so a learner who cannot read the current one still finds theirs.
import React, { useEffect, useId, useRef, useState } from 'react'
import { useAuthStore, useLanguageStore, useRuntimeStore } from '../store'
import { useLanguage, useT } from '../i18n'

interface Props {
  variant?: 'header' | 'settings'
}

export const LanguageSwitcher: React.FC<Props> = ({ variant = 'header' }) => {
  const { code, languages } = useLanguage()
  const setLanguage = useLanguageStore((s) => s.setLanguage)
  const t = useT()
  const beta = languages.find((l) => l.code === code)?.beta === true
  const feedbackOn = useRuntimeStore((s) => s.feedbackEnabled)
  const signedIn = useAuthStore((s) => s.status === 'authenticated')
  const invite = feedbackOn && signedIn
  if (languages.length < 2) return null

  // The accessible name also says "Language" in English, for someone stuck in a script they don't read.
  const label = code === 'en' ? t('language.label') : `${t('language.label')} (Language)`
  const select = (
    <select
      data-testid="language-switcher"
      aria-label={variant === 'header' ? label : undefined}
      id={variant === 'settings' ? 'settings-language' : undefined}
      value={code}
      onChange={(e) => setLanguage(e.target.value)}
      className={
        variant === 'header'
          ? 'min-h-11 min-w-11 pl-2 pr-7 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-800 dark:text-slate-100 text-sm font-semibold shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600'
          : 'block w-full min-h-11 px-3 rounded-xl border border-slate-700 bg-slate-800/60 text-slate-100 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400'
      }
    >
      {languages.map((l) => (
        <option key={l.code} value={l.code} lang={l.code}>
          {l.name}{l.beta ? ` ${t('language.beta')}` : ''}
        </option>
      ))}
    </select>
  )
  const withNote = beta ? <span className="relative inline-flex items-center gap-1">{select}<BetaNote text={t(invite ? 'language.betaNoteInvite' : 'language.betaNote')} label={t('language.betaInfo')} /></span> : select
  if (variant === 'header') return withNote
  return (
    <div>
      <label htmlFor="settings-language" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
        {label}
      </label>
      {withNote}
    </div>
  )
}

// SPEC-016 FR-011: a beta language's one-line note, opened from a 44×44 info button and closed with Esc.
const BetaNote: React.FC<{ text: string; label: string }> = ({ text, label }) => {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 64, right: 16 }) // fixed, so a scrolling or wrapping header never clips it
  const id = useId()
  const button = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); button.current?.focus() } }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])
  return (
    <>
      <button ref={button} type="button" data-testid="beta-note-button" aria-label={label} aria-expanded={open} aria-describedby={open ? id : undefined}
        onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setPos({ top: r.bottom + 4, right: Math.max(16, window.innerWidth - r.right) }); setOpen((o) => !o) }}
        className="min-h-11 min-w-11 shrink-0 rounded-full text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">ⓘ</button>
      {open && <p id={id} role="note" data-testid="beta-note" style={{ top: pos.top, right: pos.right }}
        className="fixed z-40 w-64 max-w-[calc(100vw-2rem)] whitespace-normal p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-sm text-slate-800 dark:text-slate-100 shadow-lg break-words">{text}</p>}
    </>
  )
}
