import React from 'react'
import { AudienceMode, useAudienceModeStore } from '../store'
import { VoicePersonaSelector } from './VoicePersonaSelector'

interface Props {
  className?: string
}

export const AudienceModeSelector: React.FC<Props> = ({ className = '' }) => {
  const { mode, setMode } = useAudienceModeStore()

  const options: Array<{ id: AudienceMode; label: string; icon: string; desc: string }> = [
    { id: 'standard', label: 'Standard', icon: '🎓', desc: 'Original technical curriculum' },
    { id: 'junior', label: 'Kids (8–14)', icon: '🚀', desc: 'Story-driven with Chip the Robot' },
    { id: 'plain-english', label: 'Plain English', icon: '💡', desc: 'Everyday non-technical analogies' },
  ]

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm ${className}`}>
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Reading Mode:
        </span>
        <span className="text-xs text-slate-400 dark:text-slate-500 hidden md:inline">
          {options.find((o) => o.id === mode)?.desc}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <div
          role="tablist"
          aria-label="Reading presentation mode"
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
