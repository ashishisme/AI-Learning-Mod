// SPEC: FR-UI-03, FR-UI-08, FR-PRG-01, FR-PRG-02, AC-20
import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { fetchLesson, Lesson as LessonData, ApiError } from '../api'
import { useProgressStore } from '../store'
import { MarkdownBlock } from '../components/MarkdownBlock'
import { TutorPanel } from '../components/TutorPanel'

export const Lesson: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const [lesson, setLesson] = useState<LessonData | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const { completedLessons, toggleLesson } = useProgressStore()

  useEffect(() => {
    if (!id) return
    setLoading(true)
    fetchLesson(id)
      .then((data) => {
        setLesson(data)
        setLoading(false)
      })
      .catch((err) => {
        setErrorMessage(err instanceof ApiError ? err.message : 'Failed to load lesson')
        setLoading(false)
      })
  }, [id])

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-24 px-4 text-center">
        <div className="inline-block w-8 h-8 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-500">Loading lesson content...</p>
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
          <span>&larr;</span> Back to Curriculum
        </Link>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-800">
          <h2 className="text-base font-bold mb-1">Lesson Unavailable</h2>
          <p className="text-sm">{errorMessage || 'The requested lesson could not be found.'}</p>
        </div>
      </div>
    )
  }

  const isCompleted = !!completedLessons[lesson.id]
  const hasNotebook = !!lesson.colabUrl || lesson.blocks.some((b) => b.type === 'notebook')
  const colabLink =
    lesson.colabUrl ||
    `https://colab.research.google.com/github/microsoft/AI-For-Beginners/blob/main/${lesson.path.replace(/README\.md$/, 'lab.ipynb')}`

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6">
      {/* Navigation Sub-bar */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <Link
          to="/"
          data-testid="back-link"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition group"
        >
          <span className="group-hover:-translate-x-0.5 transition-transform">&larr;</span>
          <span>Back to Curriculum</span>
        </Link>

        {lesson.module && (
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {lesson.module}
          </span>
        )}
      </div>

      {/* Lesson Header Bench */}
      <header className="mb-8 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5">
          <div className="flex-1">
            <h1
              data-testid="lesson-title"
              className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight"
            >
              {lesson.title}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 flex-shrink-0">
            {/* FR-UI-08: Colab button linking to colab with rel="noreferrer" */}
            {hasNotebook && (
              <a
                href={colabLink}
                target="_blank"
                rel="noreferrer"
                data-testid="colab-button"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
              >
                <span>⚡</span>
                <span>Open in Colab</span>
              </a>
            )}

            {/* FR-UI-03: Mark complete control bound to progress state */}
            <button
              type="button"
              data-testid="mark-complete-button"
              onClick={() => toggleLesson(lesson.id)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg border active:scale-95 transition-all ${
                isCompleted
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 shadow-sm'
              }`}
            >
              <span>{isCompleted ? '✅' : '⬜'}</span>
              <span>{isCompleted ? 'Completed' : 'Mark Complete'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Lesson Content Body (measured for technical reading comfort) */}
      <main
        data-testid="lesson-content"
        className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-10 shadow-sm space-y-6 text-slate-800 leading-relaxed text-base"
      >
        {lesson.blocks.map((block, idx) => (
          <MarkdownBlock key={idx} block={block} />
        ))}
      </main>

      {/* Grounded AI Teaching Assistant */}
      <TutorPanel lessonId={lesson.id} />
    </div>
  )
}
