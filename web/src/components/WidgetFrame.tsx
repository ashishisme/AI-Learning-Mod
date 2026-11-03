// SPEC-006 FR-REV-10, FR-REV-11: predict -> act -> compare -> explain around any widget.
import React, { useState } from 'react'
import { useT } from '../i18n'

export interface WidgetFrameMeta {
  goal?: string
  scaffold?: 'guided' | 'standard'
  predictionPrompt?: string
  hints?: string[]
  successMessage?: string
  allowFreePlay?: boolean
}

interface Props extends WidgetFrameMeta {
  children: React.ReactNode
  isJunior?: boolean
}

type Phase = 'predict' | 'play'

export const WidgetFrame: React.FC<Props> = ({
  goal,
  scaffold = 'standard',
  predictionPrompt,
  hints = [],
  successMessage,
  allowFreePlay = true,
  isJunior = false,
  children,
}) => {
  const [phase, setPhase] = useState<Phase>(predictionPrompt ? 'predict' : 'play')
  const t = useT()
  const [prediction, setPrediction] = useState('')
  const [lockedPrediction, setLockedPrediction] = useState<string | null>(null)
  const [hintsShown, setHintsShown] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [freePlay, setFreePlay] = useState(false)
  const [showMath, setShowMath] = useState(scaffold === 'standard')

  // No SPEC-006 metadata: render the widget unchanged.
  if (!goal) return <>{children}</>

  const startPlaying = (skip: boolean) => {
    if (skip) setFreePlay(true)
    else setLockedPrediction(prediction.trim())
    setPhase('play')
  }

  return (
    <section aria-label={t('widget.activity')} data-testid="widget-frame" className="my-6">
      <div
        data-testid="widget-goal"
        className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-sm text-amber-950 dark:text-amber-100"
      >
        <span className="font-bold">🎯 {t(isJunior ? 'widget.mission' : 'widget.goal')}</span>
        {goal}
      </div>

      {phase === 'predict' && (
        <div
          data-testid="widget-predict"
          className="mt-3 p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/60"
        >
          <label htmlFor="widget-prediction" className="block text-sm font-semibold text-indigo-950 dark:text-indigo-100 mb-2">
            🤔 {predictionPrompt}
          </label>
          <input
            id="widget-prediction"
            type="text"
            value={prediction}
            onChange={(e) => setPrediction(e.target.value)}
            maxLength={160}
            placeholder={t('widget.guessPlaceholder')}
            className="w-full px-3 py-2 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          />
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => startPlaying(false)}
              disabled={!prediction.trim()}
              data-testid="widget-lock-prediction"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2"
            >
              {t('widget.lockGuess')}
            </button>
            {allowFreePlay && (
              <button
                type="button"
                onClick={() => startPlaying(true)}
                data-testid="widget-skip-predict"
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-white/70 dark:hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              >
                {t('widget.skip')}
              </button>
            )}
          </div>
        </div>
      )}

      {phase === 'play' && (
        <>
          {scaffold === 'guided' && (
            <div className="mt-3 flex items-center justify-between gap-3 text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                {t(freePlay ? 'widget.freePlay' : 'widget.tryIt')}
              </span>
              <button
                type="button"
                aria-pressed={showMath}
                onClick={() => setShowMath((v) => !v)}
                data-testid="widget-show-math"
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
              >
                {t(showMath ? 'widget.hideMath' : 'widget.showMath')}
              </button>
            </div>
          )}

          <div className={`scaffold-${scaffold}${showMath ? ' show-math' : ''}`} data-testid="widget-body">
            {children}
          </div>

          {!freePlay && (
            <div className="mt-3 space-y-3">
              {hints.length > 0 && (
                <div>
                  {hints.slice(0, hintsShown).map((h, i) => (
                    <p
                      key={i}
                      data-testid="widget-hint"
                      className="mb-2 p-3 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900/60 text-sm text-sky-950 dark:text-sky-100"
                    >
                      💡 {h}
                    </p>
                  ))}
                  {hintsShown < hints.length && (
                    <button
                      type="button"
                      onClick={() => setHintsShown((n) => n + 1)}
                      data-testid="widget-hint-btn"
                      className="px-3 py-1.5 rounded-lg text-sm font-medium text-sky-800 dark:text-sky-200 hover:bg-sky-100 dark:hover:bg-sky-950/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                    >
                      {t('widget.needHint')}
                    </button>
                  )}
                </div>
              )}

              {!revealed ? (
                <button
                  type="button"
                  onClick={() => setRevealed(true)}
                  data-testid="widget-check"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2"
                >
                  {t('widget.check')}
                </button>
              ) : (
                <div
                  role="status"
                  data-testid="widget-result"
                  className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 text-sm text-emerald-950 dark:text-emerald-100 space-y-1.5"
                >
                  {lockedPrediction && (
                    <p>
                      <span className="font-semibold">{t('widget.youGuessed')}</span> {t('widget.compareGuess', { guess: lockedPrediction })}
                    </p>
                  )}
                  {successMessage && <p>🎉 {successMessage}</p>}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </section>
  )
}
