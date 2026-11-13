// SPEC: SPEC-011 FR-UI-16 (amended 2.11.0: Kids age band step), FR-003 (three equal choices, none framed as lesser), DC-11
import React, { useState } from 'react'
import { AudienceMode, useAudienceModeStore } from '../store'
import { useT } from '../i18n'
import { ChipVectorAvatar } from './ChipVectorAvatar'
import { AgeBandPicker } from './AgeBandPicker'

const OPTIONS: Array<{ id: AudienceMode; name: string; desc: string; tone: string }> = [
  { id: 'junior', name: 'journey.kids.name', desc: 'journey.kids.desc', tone: 'border-amber-300 dark:border-amber-500/70' },
  { id: 'plain-english', name: 'journey.plain.name', desc: 'journey.plain.desc', tone: 'border-emerald-300 dark:border-emerald-600/70' },
  { id: 'standard', name: 'journey.standard.name', desc: 'journey.standard.desc', tone: 'border-blue-300 dark:border-blue-600/70' },
]

export const JourneyChooser: React.FC = () => {
  const chooseJourney = useAudienceModeStore((s) => s.chooseJourney)
  const [askBand, setAskBand] = useState(false)
  const t = useT()
  if (askBand) {
    return (
      <section data-testid="age-band-step" aria-labelledby="age-band-title" className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <div className="flex items-center gap-4 mb-6">
          <ChipVectorAvatar size={64} className="flex-shrink-0" />
          <h1 id="age-band-title" className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            {t('ageBand.question')}
          </h1>
        </div>
        <AgeBandPicker onPicked={() => chooseJourney('junior')} />
        <button
          type="button"
          data-testid="age-band-skip"
          onClick={() => chooseJourney('junior')} // keeps the current band, 8-11 by default
          className="mt-5 min-h-[44px] px-4 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        >
          {t('ageBand.skip')}
        </button>
        <button
          type="button"
          data-testid="age-band-back"
          onClick={() => setAskBand(false)}
          className="mt-5 ml-2 min-h-[44px] px-4 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        >
          {t('ageBand.back')}
        </button>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">{t('ageBand.later')}</p>
      </section>
    )
  }
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
              onClick={() => (o.id === 'junior' ? setAskBand(true) : chooseJourney(o.id))}
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
