// SPEC: FR-UI-02, FR-UI-06, FR-UI-13, FR-PRG-03, AC-19, AC-23, AC-35
import React, { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { fetchLessons, LessonMeta, ApiError } from '../api'
import { useProgressStore, useSettingsStore } from '../store'

export const Home: React.FC = () => {
  const [lessons, setLessons] = useState<LessonMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [ingestRequired, setIngestRequired] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedModule, setSelectedModule] = useState('all')

  const { completedLessons, toggleLesson, isLessonCompleted } = useProgressStore()
  const { settings, setDrawerOpen } = useSettingsStore()

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

  // Modules list for filtering
  const modules = useMemo(() => {
    const set = new Set<string>()
    lessons.forEach((l) => {
      if (l.module) set.add(l.module)
    })
    return Array.from(set)
  }, [lessons])

  // Filtered lessons per FR-UI-13
  const filteredLessons = useMemo(() => {
    return lessons.filter((l) => {
      const matchesSearch =
        searchQuery === '' ||
        l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (l.module && l.module.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesModule =
        selectedModule === 'all' ||
        (selectedModule === 'completed' && isLessonCompleted(l.id)) ||
        (selectedModule === 'incomplete' && !isLessonCompleted(l.id)) ||
        l.module === selectedModule

      return matchesSearch && matchesModule
    })
  }, [lessons, searchQuery, selectedModule, completedLessons, isLessonCompleted])

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
    <div className="max-w-5xl mx-auto py-10 px-4 sm:px-6">
      {/* Editorial Header */}
      <header className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold mb-3">
              <span>✦ Comprehensive Self-Paced Track</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Artificial Intelligence Foundations
            </h1>
          </div>

          {/* AI Status Badge */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="self-start md:self-auto flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 shadow-sm text-xs transition"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-slate-700">Model:</span>
            <span className="font-mono text-slate-600 font-medium">{settings.model}</span>
            <span className="text-slate-400">⚙️</span>
          </button>
        </div>

        <p className="text-slate-600 text-sm sm:text-base max-w-3xl leading-relaxed mb-6">
          Explore machine learning, neural network architectures, computer vision, natural language transformers, and grounded AI tutoring.
        </p>

        {/* FR-UI-02, FR-PRG-03, AC-19: overall done / total summary */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm transition hover:shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">
                Curriculum Mastery
              </span>
              <span
                data-testid="progress-summary"
                className="text-xl font-bold text-slate-900 tracking-tight"
              >
                {done} / {total} completed
              </span>
            </div>
            <span className="text-sm font-semibold text-blue-600 bg-blue-50 px-3.5 py-1 rounded-full self-start sm:self-auto border border-blue-100">
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

      {/* Search & Filter Controls (FR-UI-13, AC-35) */}
      <div className="mb-6 space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 text-sm">
              🔍
            </span>
            <input
              type="text"
              id="search-lessons-input"
              data-testid="search-lessons-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search lessons by title, topic, or keyword..."
              className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition shadow-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setSelectedModule('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                selectedModule === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              All ({lessons.length})
            </button>
            <button
              onClick={() => setSelectedModule('completed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                selectedModule === 'completed'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              Completed ({done})
            </button>
            <button
              onClick={() => setSelectedModule('incomplete')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                selectedModule === 'incomplete'
                  ? 'bg-amber-700 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              To Do ({total - done})
            </button>
          </div>
        </div>

        {/* Module Topic Tags */}
        {modules.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-1 text-xs">
            <span className="text-slate-400 text-[11px] font-semibold uppercase mr-1">Modules:</span>
            {modules.map((mod) => (
              <button
                key={mod}
                onClick={() => setSelectedModule(selectedModule === mod ? 'all' : mod)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                  selectedModule === mod
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {mod}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lesson Index List */}
      <section aria-label="Curriculum Modules">
        {filteredLessons.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
            <p className="text-sm font-semibold text-slate-700 mb-1">No lessons match your filter</p>
            <p className="text-xs text-slate-500 mb-4">Try clearing the search query or selecting "All".</p>
            <button
              onClick={() => {
                setSearchQuery('')
                setSelectedModule('all')
              }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 rounded-lg transition"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm divide-y divide-slate-100 overflow-hidden">
            {filteredLessons.map((lesson, idx) => {
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

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Interactive Quiz Link (FR-QZ-01, AC-35) */}
                    <Link
                      to={`/quiz/${lesson.id}`}
                      data-testid={`quiz-link-${lesson.id}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition"
                      title="Take interactive comprehension quiz"
                    >
                      <span>🎯</span>
                      <span className="hidden sm:inline">Quiz</span>
                    </Link>

                    {/* Open Lesson Link */}
                    <Link
                      to={`/lesson/${lesson.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 group-hover:bg-blue-600 group-hover:text-white rounded-lg transition-colors duration-150"
                    >
                      <span>Open</span>
                      <span className="group-hover:translate-x-0.5 transition-transform">&rarr;</span>
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
