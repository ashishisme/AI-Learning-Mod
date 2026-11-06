// SPEC: SPEC-011 FR-UI-16, FR-003 (three equal choices, none framed as lesser), DC-11
import React from 'react'
import { AudienceMode, useAudienceModeStore } from '../store'
import { useT } from '../i18n'
import { ChipVectorAvatar } from './ChipVectorAvatar'

const OPTIONS: Array<{ id: AudienceMode; name: string; desc: string; tone: string }> = [
  { id: 'junior', name: 'journey.kids.name', desc: 'journey.kids.desc', tone: 'border-amber-300 dark:border-amber-500/70' },
  { id: 'plain-english', name: 'journey.plain.name', desc: 'journey.plain.desc', tone: 'border-emerald-300 dark:border-emerald-600/70' },
  { id: 'standard', name: 'journey.standard.name', desc: 'journey.standard.desc', tone: 'border-blue-300 dark:border-blue-600/70' },
]

export const JourneyChooser: React.FC = () => {
  const chooseJourney = useAudienceModeStore((s) => s.chooseJourney)
  const t = useT()
  return (
    <section data-testid="journey-chooser" aria-labelledby="journey-chooser-title" className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      <div className="flex items-center gap-4 mb-6">
        <ChipVectorAvatar size={64} className="flex-shrink-0" />
        <div>
          <h1 id="journey-chooser-title" className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            {t('journey.chooser.title')}
          </h1>
          <p className="text-base text-slate-600 dark:text-slate-300 mt-1">{t('journey.chooser.body')}</p>
        </div>
      </div>
      <ul className="grid gap-4 sm:grid-cols-3">
        {OPTIONS.map((o) => (
          <li key={o.id}>
            <button
              type="button"
              data-testid={`journey-choice-${o.id}`}
              onClick={() => chooseJourney(o.id)}
              className={`w-full h-full text-left p-5 rounded-2xl border-2 ${o.tone} bg-white dark:bg-slate-900 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950`}
            >
              <span className="block text-lg font-bold text-slate-900 dark:text-slate-100">{t(o.name)}</span>
              <span className="block mt-1 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{t(o.desc)}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">{t('journey.chooser.later')}</p>
    </section>
  )
}
