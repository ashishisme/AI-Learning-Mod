// SPEC: FR-UI-03, FR-UI-08, FR-PRG-01, FR-PRG-02, FR-ADAPT-01..05, AC-20; SPEC-013 FR-011, FR-016
import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { fetchAdaptiveLesson, Served, AdaptiveLessonPayload, ApiError, isLocalLLMUrl } from '../api'
import { useProgressStore, useAudienceModeStore, useRuntimeStore, useSettingsStore } from '../store'
import { useLanguage, useT } from '../i18n'
import { NotTranslatedNotice } from '../components/NotTranslatedNotice'
import { TutorPanel } from '../components/TutorPanel'
import { AudienceModeSelector } from '../components/AudienceModeSelector'
import { AdaptiveLessonView } from '../components/AdaptiveLessonView'

const OWN_COLAB_PREFIX = 'https://colab.research.google.com/github/ashishisme/AI-Learning-Mod/'

export const Lesson: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  // Kept with its lesson id: while another journey or language loads, the version on screen stays, so
  // the journey picker and the tutor panel are not torn down and rebuilt.
  const [loaded, setLoaded] = useState<{ id: string; payload: AdaptiveLessonPayload & Served } | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const { completedLessons, toggleLesson } = useProgressStore()
  const { mode: audienceMode } = useAudienceModeStore()
  const serverTutor = useRuntimeStore((st) => st.tutorEnabled) // FR-024
  const hosted = useRuntimeStore((st) => st.hosted)
  const { localLLMEnabled, baseUrl } = useSettingsStore((st) => st.settings)
  // FR-021a: a hosted learner's own local AI works even while the hosted tutor is off.
  const t = useT()
  const { code } = useLanguage()
  const tutorEnabled = serverTutor || (hosted && !!localLLMEnabled && isLocalLLMUrl(baseUrl))
  // FR-024 (amended 2026-11-03): a hosted site with its tutor off still shows the panel, greyed out
  // until the learner connects their own local AI in Settings.
  const tutorNeedsSetup = hosted && !tutorEnabled

  // SPEC-013: every lesson is ours, one version per journey. The Standard journey is labelled Detailed.
  const adaptiveMode = audienceMode === 'standard' ? 'detailed' : audienceMode
  useEffect(() => {
    if (!id) return
    let current = true
    setErrorMessage(null)
    fetchAdaptiveLesson(id, adaptiveMode)
      .then((payload) => {
        if (!current) return
        if (payload) setLoaded({ id, payload })
        else setErrorMessage(t('lesson.notFound'))
      })
      .catch((err) => {
        if (current) setErrorMessage(err instanceof ApiError ? err.message : t('lesson.loadFailed'))
      })
    return () => {
      current = false
    }
  }, [id, adaptiveMode, code])

  const lesson = loaded && loaded.id === id ? loaded.payload : null

  if (errorMessage || !id) {
    return (
      <div className="max-w-3xl mx-auto py-16 px-4">
        <Link
          to="/"
          data-testid="back-link"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 mb-6 transition"
        >
          <span>&larr;</span> {t('lesson.back')}
        </Link>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-800">
          <h2 className="text-base font-bold mb-1">{t('lesson.unavailable')}</h2>
          <p className="text-sm">{errorMessage || t('lesson.notFound')}</p>
        </div>
      </div>
    )
  }

  if (!lesson) {
    return (
      <div className="max-w-3xl mx-auto py-24 px-4 text-center">
        <div className="inline-block w-8 h-8 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-500">{t('lesson.loading')}</p>
      </div>
    )
  }

  const isCompleted = !!completedLessons[id]
  // SPEC-013 FR-016: a lesson opens only our own notebook.
  const colabLink = lesson.colabUrl?.startsWith(OWN_COLAB_PREFIX) ? lesson.colabUrl : undefined
  const module = id.replace(/^\d+-/, '')

  // Quiz, Colab and completion stay reachable in every audience mode.
  const lessonActions = (
      <div className="flex flex-wrap items-center gap-2.5 flex-shrink-0" data-testid="lesson-actions">
        <Link
          to={`/quiz/${id}`}
          data-testid="lesson-quiz-button"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
        >
          <span>🎯</span>
          <span>{t('lesson.takeQuiz')}</span>
        </Link>

        {colabLink && (
          <a
            href={colabLink}
            target="_blank"
            rel="noreferrer"
            data-testid="colab-button"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-700 hover:bg-amber-800 active:scale-95 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
          >
            <span>⚡</span>
            <span>{t('lesson.colab')}</span>
          </a>
        )}

        <button
          type="button"
          data-testid="mark-complete-button"
          onClick={() => toggleLesson(id)}
          className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg border active:scale-95 transition-all ${
            isCompleted
              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 shadow-sm'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm'
          }`}
        >
          <span>{isCompleted ? '✅' : '⬜'}</span>
          <span>{isCompleted ? t('lesson.completed') : t('lesson.markComplete')}</span>
        </button>
      </div>
  )

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6">
      {/* Navigation Sub-bar */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <Link
          to="/"
          data-testid="back-link"
          className="inline-flex items-center gap-1.5 min-h-[44px] text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-md"
        >
          <span className="group-hover:-translate-x-0.5 transition-transform">&larr;</span>
          <span>{t('lesson.back')}</span>
        </Link>

        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
          {t(`module.${module}`) || module}
        </span>
      </div>

      {/* Audience Mode Selector Toggle (FR-ADAPT-02) */}
      <AudienceModeSelector className="mb-6" />

      {/* FR-009: the lesson came back in English */}
      {code !== 'en' && lesson.servedLang !== code && <NotTranslatedNotice className="mb-6" />}

      <div className="mb-6 flex justify-end">{lessonActions}</div>
      <AdaptiveLessonView payload={lesson} />

      {/* Grounded AI Teaching Assistant */}
      {(tutorEnabled || tutorNeedsSetup) && <TutorPanel lessonId={id} needsSetup={tutorNeedsSetup} mode={adaptiveMode} />}
    </div>
  )
}
