// SPEC-006 FR-REV-12/13: teach-it-back and recall questions (single-answer, immediate feedback).
import React, { useState } from 'react'
import { ChoiceQuestion } from '../api'
import { speechService } from '../services/speechService'
import { useT } from '../i18n'

interface Props {
  heading: string
  emoji: string
  question: ChoiceQuestion
  testId: string
  praise?: string // Chip's reaction to a right answer (SPEC FR-UI-23)
}

export const ChoiceCard: React.FC<Props> = ({ heading, emoji, question, testId, praise }) => {
  const [picked, setPicked] = useState<number | null>(null)
  const t = useT()
  const text = question.prompt || question.question || ''
  const answered = picked !== null
  const correct = picked === question.correctIndex

  const pick = (i: number) => {
    if (answered) return
    setPicked(i)
    speechService.playChime(i === question.correctIndex ? 'success' : 'click')
  }

  return (
    <section
      data-testid={testId}
      aria-label={heading}
      className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border-2 border-violet-200 dark:border-violet-900/60 shadow-sm space-y-3"
    >
      <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
        <span aria-hidden="true">{emoji}</span> {heading}
      </h2>
      <p className="text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-100">{text}</p>
      <div className="space-y-2" role="group" aria-label={t('widget.answerChoices')}>
        {question.options.map((opt, i) => {
          let style = 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
          if (answered && i === question.correctIndex) style = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 font-semibold'
          else if (answered && i === picked) style = 'border-amber-400 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-100'
          return (
            <button
              key={i}
              type="button"
              disabled={answered}
              aria-pressed={picked === i}
              onClick={() => pick(i)}
              className={`w-full text-left p-3 rounded-xl border text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${style}`}
            >
              {opt}
            </button>
          )
        })}
      </div>
      {answered && (
        <p role="status" className="p-3 rounded-xl bg-violet-50 dark:bg-violet-950/30 text-sm text-violet-950 dark:text-violet-100">
          {correct ? `✅ ${praise ? `${praise} ` : ''}` : t('widget.goodTry')}
          {question.explanation}
        </p>
      )}
    </section>
  )
}
