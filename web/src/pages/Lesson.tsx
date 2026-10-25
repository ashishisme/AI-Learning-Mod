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
      <div className="py-12 text-center text-slate-500">
        <p className="animate-pulse">Loading lesson...</p>
      </div>
    )
  }

  if (errorMessage || !lesson) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4">
        <Link to="/" data-testid="back-link" className="text-blue-600 hover:underline mb-4 inline-block text-sm">
          &larr; Back to Curriculum
        </Link>
        <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700">
          <h2 className="text-lg font-bold mb-1">Error</h2>
          <p className="text-sm">{errorMessage || 'Lesson not found'}</p>
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
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Back link */}
      <nav className="mb-6">
        <Link
          to="/"
          data-testid="back-link"
          className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-blue-600 transition"
        >
          <span>&larr;</span> Back to Curriculum
        </Link>
      </nav>

      {/* Lesson Header */}
      <header className="mb-8 border-b border-slate-200 pb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            {lesson.module && (
              <span className="text-xs uppercase tracking-wider text-blue-600 font-bold block mb-1">
                {lesson.module}
              </span>
            )}
            <h1
              data-testid="lesson-title"
              className="text-3xl font-extrabold text-slate-900 tracking-tight"
            >
              {lesson.title}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* FR-UI-08: Colab button linking to colab with rel="noreferrer" */}
            {hasNotebook && (
              <a
                href={colabLink}
                target="_blank"
                rel="noreferrer"
                data-testid="colab-button"
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg shadow-sm transition"
              >
                <span>⚡</span> Open in Colab
              </a>
            )}

            {/* FR-UI-03: Mark complete control bound to progress state */}
            <button
              type="button"
              data-testid="mark-complete-button"
              onClick={() => toggleLesson(lesson.id)}
              className={`px-4 py-2 text-xs font-semibold rounded-lg border transition ${
                isCompleted
                  ? 'bg-green-50 text-green-700 border-green-300 hover:bg-green-100'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              {isCompleted ? '✅ Completed' : '⬜ Mark Complete'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Blocks */}
      <article data-testid="lesson-content" className="space-y-6">
        {lesson.blocks.map((block, idx) => (
          <MarkdownBlock key={idx} block={block} />
        ))}
      </article>

      {/* FR-UI-03: Tutor Panel */}
      <TutorPanel lessonId={lesson.id} />
    </div>
  )
}
