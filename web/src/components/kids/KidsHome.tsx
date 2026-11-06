// SPEC: SPEC-011 FR-UI-18 (Chip's Trail), FR-007, FR-016; specs/011-kids-ui-overhaul/kids-home-brief.md
import React from 'react'
import { Link } from 'react-router-dom'
import { LessonMeta } from '../../api'
import { useT } from '../../i18n'
import { ChipVectorAvatar } from '../ChipVectorAvatar'
import { KidVisual } from '../KidVisual'
import { ContinueCard } from './ContinueCard'
import { TrailPath } from './TrailPath'

interface Props {
  lessons: LessonMeta[]
  isDone: (id: string) => boolean
}

export const KidsHome: React.FC<Props> = ({ lessons, isDone }) => {
  const t = useT()
  const currentIndex = lessons.findIndex((l) => !isDone(l.id))
  const doneCount = lessons.filter((l) => isDone(l.id)).length
  const allDone = lessons.length > 0 && currentIndex === -1

  return (
    <div data-testid="kids-home" className="kids-page max-w-5xl mx-auto py-8 sm:py-10 px-4 sm:px-6">
      <p className="sr-only" aria-live="polite">{t('kids.trail.progress', { done: doneCount, total: lessons.length })}</p>
      {allDone ? (
        <section data-testid="kids-celebration" aria-labelledby="kids-done-title" className="kids-card kids-celebrate p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <KidVisual assetId="chip-cheer" altKey="brand.chipCheerAlt" width={88} height={88} className="kids-cheer flex-shrink-0" />
            <div>
              <h1 id="kids-done-title" className="kids-heading text-3xl sm:text-4xl">{t('kids.done.title')}</h1>
              <p className="kids-ink text-lg mt-2">{t('kids.done.body', { total: lessons.length })}</p>
              <div className="flex flex-wrap gap-3 mt-5">
                <Link to={`/lesson/${lessons[0].id}`} className="kids-button inline-flex items-center px-5">{t('kids.done.replay')}</Link>
                <Link to={`/quiz/${lessons[0].id}`} className="kids-button kids-button-secondary inline-flex items-center px-5">{t('kids.done.quizzes')}</Link>
              </div>
            </div>
          </div>
        </section>
      ) : (
        lessons.length > 0 && <ContinueCard lesson={lessons[currentIndex]} index={currentIndex} firstVisit={doneCount === 0} />
      )}
      {lessons.length > 0 && <TrailPath lessons={lessons} isDone={isDone} currentIndex={currentIndex} />}
    </div>
  )
}

export const KidsHomeSkeleton: React.FC = () => {
  const t = useT()
  return (
    <div data-testid="kids-home-loading" className="max-w-5xl mx-auto py-8 px-4 sm:px-6" aria-busy="true">
      <p className="sr-only">{t('home.loading')}</p>
      <div className="kids-card h-40 animate-pulse" />
      <div className="grid gap-4 md:grid-cols-6 mt-8">
        {Array.from({ length: 6 }, (_, i) => <div key={i} className="kids-card h-24 animate-pulse" />)}
      </div>
    </div>
  )
}

export const KidsHomeError: React.FC<{ onRetry: () => void }> = ({ onRetry }) => {
  const t = useT()
  return (
    <div className="max-w-2xl mx-auto my-12 px-4">
      <section data-testid="kids-home-error" role="alert" className="kids-card p-6 flex items-center gap-4">
        <ChipVectorAvatar size={56} className="flex-shrink-0" />
        <div>
          <h2 className="kids-heading text-xl">{t('kids.error.title')}</h2>
          <p className="kids-ink mt-1">{t('kids.error.body')}</p>
          <button type="button" onClick={onRetry} className="kids-button mt-3 px-5">{t('kids.error.retry')}</button>
        </div>
      </section>
    </div>
  )
}
