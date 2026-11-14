// SPEC: FR-UI-03, FR-UI-08, FR-PRG-01, FR-PRG-02, FR-ADAPT-01..05, AC-20; SPEC-013 (Detailed, own notebooks)
import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  fetchLesson,
  fetchAdaptiveLesson,
  Lesson as LessonData,
  Served,
  AdaptiveLessonPayload,
  ApiError,
  isLocalLLMUrl,
} from '../api'
import { useProgressStore, useAudienceModeStore, useRuntimeStore, useSettingsStore } from '../store'
import { useLanguage, useT } from '../i18n'
import { NotTranslatedNotice } from '../components/NotTranslatedNotice'
import { MarkdownBlock } from '../components/MarkdownBlock'
import { TutorPanel } from '../components/TutorPanel'
import { AudienceModeSelector } from '../components/AudienceModeSelector'
import { AdaptiveLessonView } from '../components/AdaptiveLessonView'

const OWN_COLAB_PREFIX = 'https://colab.research.google.com/github/ashishisme/AI-Learning-Mod/'

export const Lesson: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const [lesson, setLesson] = useState<(LessonData & Served) | null>(null)
  const [adaptivePayload, setAdaptivePayload] = useState<(AdaptiveLessonPayload & Served) | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const { completedLessons, toggleLesson } = useProgressStore()
  const { mode: audienceMode } = useAudienceModeStore()
  const serverTutor = useRuntimeStore((st) => st.tutorEnabled) // FR-024
  const hosted = useRuntimeStore((st) => st.hosted)
  const { localLLMEnabled, baseUrl } = useSettingsStore((st) => st.settings)
  // FR-021a: a hosted learner's own local AI works even while the hosted tutor is off.
  const t = useT()
  const { code, languages } = useLanguage()
  const tutorEnabled = serverTutor || (hosted && !!localLLMEnabled && isLocalLLMUrl(baseUrl))
  // FR-024 (amended 2026-11-03): a hosted site with its tutor off still shows the panel, greyed out
  // until the learner connects their own local AI in Settings.
  const tutorNeedsSetup = hosted && !tutorEnabled

  // 1. Fetch canonical lesson metadata
  useEffect(() => {
    if (!id) return
    setLoading(true)
    fetchLesson(id)
      .then((data) => {
        setLesson(data)
        setLoading(false)
      })
      .catch((err) => {
        setErrorMessage(err instanceof ApiError ? err.message : t('lesson.loadFailed'))
        setLoading(false)
      })
  }, [id, code])

  // 2. Fetch adaptive payload when mode changes. SPEC-013: the Standard journey ("Detailed") asks for our
  // Detailed version and keeps the standard lesson until that lesson has one.
  const adaptiveMode = audienceMode === 'standard' ? 'detailed' : audienceMode
  useEffect(() => {
    if (!id) {
      setAdaptivePayload(null)
      return
    }
    setAdaptivePayload(null)
    fetchAdaptiveLesson(id, adaptiveMode)
      .then((payload) => {
        setAdaptivePayload(payload)
      })
      .catch((err) => {
        console.warn('Could not load adaptive payload for mode:', adaptiveMode, err)
        setAdaptivePayload(null)
      })
  }, [id, adaptiveMode, code])

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-24 px-4 text-center">
        <div className="inline-block w-8 h-8 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-500">{t('lesson.loading')}</p>
      </div>
    )
  }

  if (errorMessage || !lesson) {
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

  const isCompleted = !!completedLessons[lesson.id]
  const isAdaptiveActive = adaptivePayload !== null
  // SPEC-013 FR-016: our own lessons open only our own notebooks; derived lessons keep today's link until replaced.
  const ownColab = adaptivePayload?.colabUrl?.startsWith(OWN_COLAB_PREFIX) ? adaptivePayload.colabUrl : undefined
  const derivedNotebook = !!lesson.colabUrl || lesson.blocks.some((b) => b.type === 'notebook')
  const hasNotebook = isAdaptiveActive && adaptivePayload?.origin === 'own' ? !!ownColab : !!ownColab || derivedNotebook
  const colabLink =
    ownColab ||
    lesson.colabUrl ||
    `https://colab.research.google.com/github/microsoft/AI-For-Beginners/blob/main/${lesson.path.replace(/README\.md$/, 'lab.ipynb')}`
  // The tutor grounds on the version on screen (SPEC-013 research R4).
  const tutorMode = audienceMode === 'standard' && isAdaptiveActive ? 'detailed' : audienceMode
  // FR-UI-26: Read section speaks in the language the lesson came back in (English fallback included).
  const lessonSpeechLang = languages.find((l) => l.code === (lesson.servedLang ?? 'en'))?.speechLang ?? 'en-US'

  // Quiz, Colab and completion stay reachable in every audience mode.
  const lessonActions = (
      <div className="flex flex-wrap items-center gap-2.5 flex-shrink-0" data-testid="lesson-actions">
        <Link
          to={`/quiz/${lesson.id}`}
          data-testid="lesson-quiz-button"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
        >
          <span>🎯</span>
          <span>{t('lesson.takeQuiz')}</span>
        </Link>

        {hasNotebook && (
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
          onClick={() => toggleLesson(lesson.id)}
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

        {lesson.module && (
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
            {t(`module.${lesson.module}`) || lesson.module}
          </span>
        )}
      </div>

      {/* Audience Mode Selector Toggle (FR-ADAPT-02) */}
      <AudienceModeSelector className="mb-6" />

      {/* FR-009: the part on screen came back in English */}
      {code !== 'en' && (isAdaptiveActive ? adaptivePayload?.servedLang : lesson.servedLang) !== code && (
        <NotTranslatedNotice className="mb-6" />
      )}

      {/* Lesson Header Bench (Standard Mode) */}
      {!isAdaptiveActive && (
        <header className="mb-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5">
            <div className="flex-1">
              <h1
                data-testid="lesson-title"
                className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight leading-tight"
              >
                {lesson.title}
              </h1>
            </div>

            {lessonActions}
          </div>
        </header>
      )}

      {/* Main Content Area */}
      {isAdaptiveActive ? (
        <>
          <div className="mb-6 flex justify-end">{lessonActions}</div>
          <AdaptiveLessonView payload={adaptivePayload} />
        </>
      ) : (
        <section
          data-testid="lesson-content"
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-10 shadow-sm space-y-6 text-slate-800 dark:text-slate-200 leading-relaxed text-base"
        >
          {audienceMode !== 'standard' && !adaptivePayload && (
            <div className="p-3 mb-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 text-amber-800 dark:text-amber-300 text-xs font-medium">
              {t('lesson.modeUnavailable', { mode: audienceMode })}
            </div>
          )}
          {lesson.blocks.map((block, idx) => (
            <MarkdownBlock key={idx} block={block} narrateId={`std-${lesson.id}-${idx}`} speechLang={lessonSpeechLang} />
          ))}
        </section>
      )}

      {/* Grounded AI Teaching Assistant */}
      {(tutorEnabled || tutorNeedsSetup) && <TutorPanel lessonId={lesson.id} needsSetup={tutorNeedsSetup} mode={tutorMode} />}
    </div>
  )
}
