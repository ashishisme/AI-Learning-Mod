// SPEC: SPEC-011 FR-UI-18 (Continue card for the first unfinished lesson), DC-11
import React from 'react'
import { Link } from 'react-router-dom'
import { LessonMeta } from '../../api'
import { useT } from '../../i18n'
import { ChipVectorAvatar } from '../ChipVectorAvatar'
import { StopArt } from './StopArt'

interface Props {
  lesson: LessonMeta
  index: number
  firstVisit: boolean
}

export const ContinueCard: React.FC<Props> = ({ lesson, index, firstVisit }) => {
  const t = useT()
  return (
    <section data-testid="kids-continue" aria-labelledby="kids-continue-title" className="kids-card p-5 sm:p-7">
      <div className="flex items-start gap-4 sm:gap-6">
        <ChipVectorAvatar size={72} className="flex-shrink-0 hidden sm:block" />
        <div className="flex-1 min-w-0">
          <p className="kids-ink-muted text-base font-bold">
            {firstVisit ? t('kids.continue.hello') : t('kids.continue.welcomeBack')}
          </p>
          <h1 id="kids-continue-title" className="kids-heading text-3xl sm:text-4xl mt-1">
            {t('kids.continue.stop', { n: index + 1 })}: {lesson.title}
          </h1>
          <p className="kids-ink mt-2 text-base sm:text-lg leading-relaxed">
            <span className="font-bold">{t('narration.chipSays')}</span> {t('kids.continue.chipLine')}
          </p>
          <Link
            to={`/lesson/${lesson.id}`}
            data-testid="kids-continue-button"
            className="kids-button mt-5 inline-flex items-center gap-2 px-6 text-lg"
          >
            {firstVisit ? t('kids.continue.start') : t('kids.continue.go')}
            <span aria-hidden="true">→</span>
          </Link>
        </div>
        <StopArt index={index} size="lg" />
      </div>
    </section>
  )
}
