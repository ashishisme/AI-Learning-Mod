// SPEC: FR-UI-02, FR-UI-06, FR-PRG-03, AC-19, AC-23
import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchLessons, LessonMeta, ApiError } from '../api'
import { useProgressStore } from '../store'

export const Home: React.FC = () => {
  const [lessons, setLessons] = useState<LessonMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [ingestRequired, setIngestRequired] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const { completedLessons, toggleLesson, isLessonCompleted } = useProgressStore()

  useEffect(() => {
    fetchLessons()
      .then((data) => {
        setLessons(data.lessons || [])
        setLoading(false)
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 503) {
          // FR-UI-06, AC-23: operator message to run ingest
          setIngestRequired(true)
        } else {
          setErrorMessage(err instanceof Error ? err.message : 'Failed to load lessons')
        }
        setLoading(false)
      })
  }, [])

  const total = lessons.length
  const done = lessons.filter((l) => isLessonCompleted(l.id)).length

  if (loading) {
    return (
      <div className="py-12 text-center text-slate-500">
        <p className="animate-pulse">Loading curriculum...</p>
      </div>
    )
  }

  // FR-UI-06, AC-23: Message instructing operator to run ingestion
  if (ingestRequired) {
    return (
      <div
        data-testid="ingest-required-message"
        className="max-w-2xl mx-auto my-12 p-6 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 shadow-sm"
      >
        <h2 className="text-xl font-bold mb-2">Content Not Ingested</h2>
        <p className="text-sm leading-relaxed mb-4">
          The lesson content has not been generated yet. Please run the ingestion process to fetch curriculum files:
        </p>
        <code className="block bg-amber-100/80 p-3 rounded font-mono text-xs text-amber-950 mb-2">
          go run ./cmd/ingest
        </code>
        <p className="text-xs text-amber-700">Please run ingest with a valid GITHUB_TOKEN configured.</p>
      </div>
    )
  }

  if (errorMessage) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-6 bg-red-50 border border-red-200 rounded-xl text-red-700">
        <h2 className="text-lg font-bold mb-1">Error</h2>
        <p className="text-sm">{errorMessage}</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <header className="mb-8 border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
          AI Foundations Curriculum
        </h1>
        <p className="text-slate-600 text-sm">
          A foundational self-paced journey into artificial intelligence.
        </p>

        {/* FR-UI-02, FR-PRG-03, AC-19: overall done / total summary */}
        <div className="mt-4 flex items-center justify-between bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
          <div>
            <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold block">
              Progress
            </span>
            <span
              data-testid="progress-summary"
              className="text-lg font-bold text-slate-800"
            >
              {done} / {total} completed
            </span>
          </div>
          <div className="w-32 bg-slate-100 rounded-full h-3 overflow-hidden">
            <div
              className="bg-green-500 h-3 transition-all duration-300"
              style={{ width: `${total > 0 ? (done / total) * 100 : 0}%` }}
            />
          </div>
        </div>
      </header>

      <section aria-label="Lessons List">
        <ul className="divide-y divide-slate-200 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          {lessons.map((lesson) => {
            const completed = !!completedLessons[lesson.id]
            return (
              <li
                key={lesson.id}
                data-testid={`lesson-item-${lesson.id}`}
                className="flex items-center justify-between p-4 hover:bg-slate-50 transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    data-testid={`toggle-complete-${lesson.id}`}
                    onClick={() => toggleLesson(lesson.id)}
                    aria-label={`Mark lesson ${lesson.title} as ${completed ? 'incomplete' : 'complete'}`}
                    className="text-xl leading-none select-none hover:scale-110 transition"
                  >
                    {/* FR-UI-02 completion indicator: ✅ / ⬜ */}
                    {completed ? '✅' : '⬜'}
                  </button>

                  <div className="truncate">
                    <Link
                      to={`/lesson/${lesson.id}`}
                      className="font-medium text-slate-900 hover:text-blue-600 text-sm sm:text-base hover:underline"
                    >
                      {lesson.title}
                    </Link>
                    {lesson.module && (
                      <span className="block text-xs text-slate-400 mt-0.5">
                        {lesson.module}
                      </span>
                    )}
                  </div>
                </div>

                <Link
                  to={`/lesson/${lesson.id}`}
                  className="ml-4 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition"
                >
                  Start &rarr;
                </Link>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
