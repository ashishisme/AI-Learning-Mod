// SPEC: SPEC-009 FR-001, FR-002, FR-004; DC-11
// A native select: keyboard, screen reader and the phone's own picker work without extra code, and
// it stays compact as more languages arrive. Each option is written in its own language and script,
// so a learner who cannot read the current one still finds theirs.
import React from 'react'
import { useLanguageStore } from '../store'
import { useLanguage, useT } from '../i18n'

interface Props {
  variant?: 'header' | 'settings'
}

export const LanguageSwitcher: React.FC<Props> = ({ variant = 'header' }) => {
  const { code, languages } = useLanguage()
  const setLanguage = useLanguageStore((s) => s.setLanguage)
  const t = useT()
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
          {l.name}
        </option>
      ))}
    </select>
  )
  if (variant === 'header') return select
  return (
    <div>
      <label htmlFor="settings-language" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
        {label}
      </label>
      {select}
    </div>
  )
}
