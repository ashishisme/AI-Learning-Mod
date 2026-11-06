// SPEC: SPEC-011 FR-UI-18, FR-016 (static under reduced motion), FR-008; DC-11
// Six always-open stops. Status is said in words (and an icon), never by colour alone. When the
// current stop has moved on since this tab last showed the trail, Chip "hops" in at the new stop.
import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { LessonMeta } from '../../api'
import { useT } from '../../i18n'
import { ChipVectorAvatar } from '../ChipVectorAvatar'
import { StopArt } from './StopArt'

const LAST_STOP_KEY = 'ai-foundations-kids-trail-stop'

interface Props {
  lessons: LessonMeta[]
  isDone: (id: string) => boolean
  currentIndex: number // -1 when every stop is done
}

function readLastStop(): number | null {
  try {
    const v = sessionStorage.getItem(LAST_STOP_KEY)
    return v === null ? null : Number(v)
  } catch {
    return null
  }
}

export const TrailPath: React.FC<Props> = ({ lessons, isDone, currentIndex }) => {
  const t = useT()
  const [hop, setHop] = useState(false)

  useEffect(() => {
    const last = readLastStop()
    if (last !== null && currentIndex > last) setHop(true)
    try {
      sessionStorage.setItem(LAST_STOP_KEY, String(currentIndex))
    } catch {
      // Private mode: the hop is a nicety, the trail works without it.
    }
  }, [currentIndex])

  return (
    <section aria-labelledby="kids-trail-title" className="mt-8">
      <h2 id="kids-trail-title" className="kids-heading text-2xl mb-4">{t('kids.trail.title')}</h2>
      <ol data-testid="kids-trail" className="kids-trail relative grid gap-4 md:grid-cols-6 md:gap-3">
        {lessons.map((lesson, i) => {
          const done = isDone(lesson.id)
          const here = i === currentIndex
          const status = done ? 'done' : here ? 'here' : 'next'
          return (
            <li
              key={lesson.id}
              data-testid={`kids-stop-${lesson.id}`}
              data-status={status}
              className={`relative flex md:block ${i % 2 === 1 ? 'md:mt-12' : ''} ${i % 2 === 1 ? 'pl-10 md:pl-0' : 'pr-10 md:pr-0'}`}
            >
              <div className={`kids-card kids-stop w-full p-4 md:p-3 ${here ? 'kids-stop-here' : ''}`}>
                <div className="flex md:flex-col items-center md:items-start gap-3">
                  <div className="relative">
                    <StopArt index={i} />
                    {here && (
                      <span className={`absolute -top-5 -right-4 ${hop ? 'kids-hop' : ''}`} data-testid="kids-chip-marker">
                        <ChipVectorAvatar size={40} />
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`kids-status kids-status-${status} text-sm font-bold`}>
                      <span aria-hidden="true">{done ? '✓ ' : here ? '★ ' : '○ '}</span>
                      {t(`kids.trail.status.${status}`)}
                    </p>
                    <Link to={`/lesson/${lesson.id}`} className="kids-ink block font-bold text-base leading-snug mt-0.5 hover:underline">
                      <span className="sr-only">{t('kids.continue.stop', { n: i + 1 })}: </span>
                      {lesson.title}
                    </Link>
                    <Link
                      to={`/quiz/${lesson.id}`}
                      data-testid={`kids-quiz-${lesson.id}`}
                      className="kids-link inline-flex items-center text-sm font-semibold mt-1"
                      aria-label={t('kids.trail.quizFor', { title: lesson.title })}
                    >
                      {t('home.quiz')}
                    </Link>
                  </div>
                </div>
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
