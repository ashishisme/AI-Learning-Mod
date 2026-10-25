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
  const percentComplete = total > 0 ? Math.round((done / total) * 100) : 0

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-24 px-4 text-center">
        <div className="inline-block w-8 h-8 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-500">Loading curriculum...</p>
      </div>
    )
  }

  // FR-UI-06, AC-23: Message instructing operator to run ingestion
  if (ingestRequired) {
    return (
      <div className="max-w-2xl mx-auto my-16 px-4">
        <div
          data-testid="ingest-required-message"
          className="bg-white border border-amber-300/80 rounded-2xl p-8 shadow-sm"
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center text-lg font-bold flex-shrink-0">
              !
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-slate-900 mb-2">Content Ingestion Required</h2>
              <p className="text-sm text-slate-600 mb-5 leading-relaxed">
                The curriculum lessons have not been ingested yet. Please run the ingestion CLI command with your GitHub token to generate local lesson JSON artifacts:
              </p>
              <div className="relative group">
                <code className="block bg-slate-900 text-slate-100 font-mono text-xs px-4 py-3 rounded-lg overflow-x-auto shadow-inner">
                  GITHUB_TOKEN=your_token go run ./cmd/ingest
                </code>
              </div>
              <p className="text-xs text-slate-500 mt-4">
                Once the ingestion completes, refresh this page to begin your learning track. Please run ingest before continuing.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (errorMessage) {
    return (
      <div className="max-w-2xl mx-auto my-16 px-4">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-800">
          <h2 className="text-base font-bold mb-1">Failed to Connect</h2>
          <p className="text-sm">{errorMessage}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6">
      {/* Editorial Header */}
      <header className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-3">
          Artificial Intelligence Foundations
        </h1>
        <p className="text-slate-600 text-base max-w-2xl leading-relaxed">
          A structured self-paced guide exploring machine learning, neural architectures, computer vision, and grounded language systems.
        </p>

        {/* FR-UI-02, FR-PRG-03, AC-19: overall done / total summary */}
        <div className="mt-8 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm transition hover:border-slate-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">
                Curriculum Mastery
              </span>
              <span
                data-testid="progress-summary"
                className="text-lg font-bold text-slate-900 tracking-tight"
              >
                {done} / {total} completed
              </span>
            </div>
            <span className="text-sm font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full self-start sm:self-auto">
              {percentComplete}% finished
            </span>
          </div>

          {/* Animated progress track */}
          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${percentComplete}%` }}
            />
          </div>
        </div>
      </header>

      {/* Lesson Index List */}
      <section aria-label="Curriculum Modules">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm divide-y divide-slate-100 overflow-hidden">
          {lessons.map((lesson, idx) => {
            const completed = !!completedLessons[lesson.id]
            return (
              <div
                key={lesson.id}
                data-testid={`lesson-item-${lesson.id}`}
                className="group flex items-center justify-between p-4 sm:p-5 hover:bg-slate-50/80 transition-all duration-150"
              >
                <div className="flex items-center gap-3.5 min-w-0 pr-4">
                  {/* FR-UI-02 completion indicator: ✅ / ⬜ */}
                  <button
                    type="button"
                    data-testid={`toggle-complete-${lesson.id}`}
                    onClick={() => toggleLesson(lesson.id)}
                    aria-label={`Mark ${lesson.title} as ${completed ? 'incomplete' : 'complete'}`}
                    className="flex-shrink-0 text-xl leading-none select-none hover:scale-110 active:scale-95 transition-transform duration-100 p-1 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                  >
                    {completed ? '✅' : '⬜'}
                  </button>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-mono text-slate-400 font-medium">
                        {(idx + 1).toString().padStart(2, '0')}
                      </span>
                      {lesson.module && (
                        <span className="inline-block text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          {lesson.module}
                        </span>
                      )}
                    </div>
                    <Link
                      to={`/lesson/${lesson.id}`}
                      className="text-sm sm:text-base font-semibold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1"
                    >
                      {lesson.title}
                    </Link>
                  </div>
                </div>

                <Link
                  to={`/lesson/${lesson.id}`}
                  className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 group-hover:bg-blue-600 group-hover:text-white rounded-lg transition-colors duration-150"
                >
                  <span>Open</span>
                  <span className="group-hover:translate-x-0.5 transition-transform">&rarr;</span>
                </Link>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
