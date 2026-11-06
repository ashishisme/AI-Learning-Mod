import React from 'react'
import { AudienceMode, useAudienceModeStore, useAudioStore } from '../store'
import { speechService } from '../services/speechService'
import { VoicePersonaSelector } from './VoicePersonaSelector'
import { useT } from '../i18n'

interface Props {
  className?: string
}

export const AudienceModeSelector: React.FC<Props> = ({ className = '' }) => {
  const { mode, setMode } = useAudienceModeStore()
  const stopAudio = useAudioStore((s) => s.stopAudio)
  const t = useT()

  const options: Array<{ id: AudienceMode; label: string; icon: string; desc: string }> = [
    { id: 'standard', label: t('adaptive.modeStandard'), icon: '🎓', desc: t('adaptive.modeStandardDesc') },
    { id: 'junior', label: t('adaptive.modeJunior'), icon: '🚀', desc: t('adaptive.modeJuniorDesc') },
    { id: 'plain-english', label: t('adaptive.modePlain'), icon: '💡', desc: t('adaptive.modePlainDesc') },
  ]

  const handleSelectMode = (newMode: AudienceMode) => {
    if (newMode === mode) return
    setMode(newMode)
    speechService.stop()
    stopAudio()
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }

  return (
    <div
      data-testid="audience-mode-toolbar"
      className={`flex flex-wrap items-center justify-between gap-3 p-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-xs ${className}`}
    >
      <div className="flex items-center gap-2 pl-1">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          {t('adaptive.readingMode')}
        </span>
        <span className="text-xs text-slate-600 dark:text-slate-300 hidden lg:inline">
          • {options.find((o) => o.id === mode)?.desc}
        </span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div
          role="tablist"
          aria-label={t('adaptive.modeLabel')}
          className="inline-flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-xs font-semibold gap-1"
        >
          {options.map((opt) => {
            const isActive = mode === opt.id
            return (
              <button
                key={opt.id}
                role="tab"
                aria-selected={isActive}
                data-testid={`journey-tab-${opt.id}`}
                onClick={() => handleSelectMode(opt.id)}
                className={`min-h-[44px] px-3.5 py-2 rounded-lg transition-all flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-slate-900 ${
                  isActive
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-sm font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span className="text-sm">{opt.icon}</span>
                <span>{opt.label}</span>
              </button>
            )
          })}
        </div>

        {/* Audio Studio Persona Control */}
        <VoicePersonaSelector compact />
      </div>
    </div>
  )
}
