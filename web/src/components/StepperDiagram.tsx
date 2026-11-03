// SPEC-006 FR-REV-05: junior-track "stepper" diagram, one idea revealed per tap.
import React, { useState } from 'react'
import { useT } from '../i18n'

interface Props {
  caption?: string
  alt?: string
  steps: string[]
}

export const StepperDiagram: React.FC<Props> = ({ caption, alt, steps }) => {
  const [shown, setShown] = useState(1)
  const t = useT()
  const done = shown >= steps.length

  return (
    <figure
      aria-label={alt}
      data-testid="stepper-diagram"
      className="my-6 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm"
    >
      {caption && (
        <figcaption className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          📊 {caption}
        </figcaption>
      )}
      {alt && <p className="sr-only">{alt}</p>}

      <ol className="p-4 sm:p-6 space-y-3" aria-live="polite">
        {steps.slice(0, shown).map((text, i) => (
          <li
            key={i}
            data-testid="stepper-step"
            className="flex items-start gap-3 p-3.5 rounded-xl bg-blue-50/70 dark:bg-slate-800/70 border border-blue-100 dark:border-slate-700"
          >
            <span
              aria-hidden="true"
              className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center"
            >
              {i + 1}
            </span>
            <span className="text-sm sm:text-base text-slate-800 dark:text-slate-100 leading-snug">{text}</span>
          </li>
        ))}
      </ol>

      <div className="px-4 sm:px-6 pb-4 flex flex-wrap items-center gap-3">
        {!done ? (
          <>
            <button
              type="button"
              onClick={() => setShown((n) => Math.min(steps.length, n + 1))}
              data-testid="stepper-next"
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
            >
              {t('widget.stepNext')}
            </button>
            <button
              type="button"
              onClick={() => setShown(steps.length)}
              className="px-3 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            >
              {t('widget.stepShowAll')}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setShown(1)}
            className="px-3 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            {t('widget.stepRestart')}
          </button>
        )}
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {t('widget.stepOf', { n: Math.min(shown, steps.length), total: steps.length })}
        </span>
      </div>
    </figure>
  )
}
