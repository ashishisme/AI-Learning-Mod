// SPEC: SPEC-009 FR-009
// Shown when the chosen language was asked for but English came back, so English text is never
// silently passed off as the learner's language.
import React from 'react'
import { useT } from '../i18n'

export const NotTranslatedNotice: React.FC<{ className?: string }> = ({ className = '' }) => {
  const t = useT()
  return (
    <p
      role="note"
      data-testid="not-translated-notice"
      className={`px-4 py-3 rounded-xl border border-sky-300 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/50 text-sky-900 dark:text-sky-100 text-sm leading-relaxed ${className}`}
    >
      {t('lesson.notTranslated')}
    </p>
  )
}
