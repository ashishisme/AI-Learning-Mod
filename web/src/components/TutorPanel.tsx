// SPEC: FR-UI-03, FR-UI-07, NFR-SEC-05, AC-24
import React, { useState } from 'react'
import { askTutor, ApiError } from '../api'

interface TutorPanelProps {
  lessonId: string
}

export const TutorPanel: React.FC<TutorPanelProps> = ({ lessonId }) => {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isOffline, setIsOffline] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim() || loading || isOffline) return

    setLoading(true)
    setErrorMessage(null)

    try {
      const resp = await askTutor(lessonId, question.trim())
      setAnswer(resp.answer)
    } catch (err) {
      if (err instanceof ApiError && err.status === 503) {
        // FR-UI-07, AC-24: 503 renders "Tutor offline" and disables input
        setIsOffline(true)
        setErrorMessage(null)
      } else {
        // FR-UI-07: non-destructive inline error and re-enable input
        const msg = err instanceof Error ? err.message : 'An unexpected error occurred'
        setErrorMessage(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <aside
      data-testid="tutor-panel"
      className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm my-8"
      aria-label="AI Tutor"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <span>🤖</span> AI Teaching Assistant
        </h3>
        {isOffline && (
          <span
            data-testid="tutor-offline-badge"
            className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-red-100 text-red-800"
          >
            Tutor offline
          </span>
        )}
      </div>

      {isOffline && (
        <div
          data-testid="tutor-offline-message"
          className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm"
        >
          Tutor offline
        </div>
      )}

      {errorMessage && (
        <div
          data-testid="tutor-error"
          className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"
        >
          {errorMessage}
        </div>
      )}

      {/* NFR-SEC-05: Tutor output rendered as plain text */}
      {answer && (
        <div
          data-testid="tutor-answer"
          className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm whitespace-pre-wrap leading-relaxed"
        >
          {answer}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label htmlFor="tutor-question" className="text-sm font-medium text-slate-700">
          Ask a question about this lesson
        </label>
        <div className="flex gap-2">
          <input
            id="tutor-question"
            data-testid="tutor-input"
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={isOffline || loading}
            placeholder={isOffline ? 'Tutor is offline' : 'e.g. What is gradient descent?'}
            maxLength={500}
            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            data-testid="tutor-submit"
            disabled={isOffline || loading || !question.trim()}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Thinking...' : 'Ask'}
          </button>
        </div>
        <p className="text-xs text-slate-400">
          Answers are strictly grounded in this lesson's text.
        </p>
      </form>
    </aside>
  )
}
