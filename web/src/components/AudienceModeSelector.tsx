import React from 'react'
import { AudienceMode, useAudienceModeStore } from '../store'
import { VoicePersonaSelector } from './VoicePersonaSelector'
import { useT } from '../i18n'

interface Props {
  className?: string
}

export const AudienceModeSelector: React.FC<Props> = ({ className = '' }) => {
  const { mode, setMode } = useAudienceModeStore()
  const t = useT()

  const options: Array<{ id: AudienceMode; label: string; icon: string; desc: string }> = [
    { id: 'standard', label: t('adaptive.modeStandard'), icon: '🎓', desc: t('adaptive.modeStandardDesc') },
    { id: 'junior', label: t('adaptive.modeJunior'), icon: '🚀', desc: t('adaptive.modeJuniorDesc') },
    { id: 'plain-english', label: t('adaptive.modePlain'), icon: '💡', desc: t('adaptive.modePlainDesc') },
  ]

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm ${className}`}>
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {t('adaptive.readingMode')}
        </span>
        <span className="text-xs text-slate-400 dark:text-slate-500 hidden md:inline">
          {options.find((o) => o.id === mode)?.desc}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <div
          role="tablist"
          aria-label={t('adaptive.modeLabel')}
          className="inline-flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-xs font-medium"
        >
          {options.map((opt) => {
            const isActive = mode === opt.id
            return (
              <button
                key={opt.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setMode(opt.id)}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-sm font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>{opt.icon}</span>
                <span>{opt.label}</span>
              </button>
            )
          })}
        </div>

        {/* Audio Studio Persona Control */}
        <VoicePersonaSelector />
      </div>
    </div>
  )
}
