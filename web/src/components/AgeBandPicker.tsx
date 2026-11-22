// SPEC: FR-UI-16 (amended 2.11.0, SPEC-012 FR-005, FR-006). The Kids age band, kept only in this browser.
import React from 'react'
import { AGE_BANDS, AgeBand, useAudienceModeStore } from '../store'
import { useT } from '../i18n'

interface Props {
  onPicked?: (band: AgeBand) => void
}

export const AgeBandPicker: React.FC<Props> = ({ onPicked }) => {
  const ageBand = useAudienceModeStore((s) => s.ageBand)
  const setAgeBand = useAudienceModeStore((s) => s.setAgeBand)
  const t = useT()
  return (
    <div role="group" aria-label={t('ageBand.label')} className="flex flex-wrap gap-3">
      {AGE_BANDS.map((b) => (
        <button
          key={b}
          type="button"
          data-testid={`age-band-${b}`}
          aria-pressed={ageBand === b}
          onClick={() => {
            setAgeBand(b)
            onPicked?.(b)
          }}
          className={`min-h-[44px] min-w-[44px] px-5 py-2.5 rounded-2xl border-2 text-base font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950 ${
            ageBand === b
              ? 'border-amber-500 bg-amber-100 text-amber-950 dark:bg-amber-900/60 dark:text-amber-50'
              : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          {t(b === '8-11' ? 'ageBand.young' : 'ageBand.older')}
        </button>
      ))}
    </div>
  )
}
