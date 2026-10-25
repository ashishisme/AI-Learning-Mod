// SPEC: FR-UI-03, FR-UI-07, FR-UI-12, NFR-SEC-05, AC-24
import React, { useState } from 'react'
import { askTutorStream, ApiError } from '../api'

interface TutorPanelProps {
  lessonId: string
}

export const TutorPanel: React.FC<TutorPanelProps> = ({ lessonId }) => {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [isOffline, setIsOffline] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim() || loading || isOffline) return

    setLoading(true)
    setIsStreaming(true)
    setAnswer('')
    setErrorMessage(null)

    await askTutorStream(
      lessonId,
      question.trim(),
      (token) => {
        setAnswer((prev) => (prev || '') + token)
      },
      (fallback) => {
        if (fallback) {
          setAnswer(fallback)
        }
        setLoading(false)
        setIsStreaming(false)
      },
      (err) => {
        setLoading(false)
        setIsStreaming(false)
        if (err instanceof ApiError && err.status === 503) {
          // FR-UI-07, AC-24: 503 renders "Tutor offline" and disables input
          setIsOffline(true)
          setErrorMessage(null)
        } else {
          // FR-UI-07: non-destructive inline error and re-enable input
          const msg = err instanceof Error ? err.message : 'An unexpected error occurred'
          setErrorMessage(msg)
        }
      }
    )
  }

  return (
    <aside
      data-testid="tutor-panel"
      className="mt-10 bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-sm transition-all"
      aria-label="AI Teaching Assistant"
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
            AI
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 leading-none">
              Lesson Assistant
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">
              Grounded exclusively in this module
            </span>
          </div>
        </div>

        {isOffline ? (
          <span
            data-testid="tutor-offline-badge"
            className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-200"
          >
            Tutor offline
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/60">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Online
          </span>
        )}
      </div>

      {/* Offline Alert Box */}
      {isOffline && (
        <div
          data-testid="tutor-offline-message"
          className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-sm flex items-start gap-3"
        >
          <span className="text-base leading-none">⚠️</span>
          <div>
            <p className="font-semibold mb-0.5">Tutor offline</p>
            <p className="text-xs text-amber-700 leading-relaxed">
              The AI Teaching Assistant service is currently unavailable or disabled. All other curriculum content remains fully accessible.
            </p>
          </div>
        </div>
      )}

      {/* Inline Error Message */}
      {errorMessage && (
        <div
          data-testid="tutor-error"
          className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start gap-2.5"
        >
          <span className="font-bold leading-none">!</span>
          <p className="text-xs leading-relaxed">{errorMessage}</p>
        </div>
      )}

      {/* Answer Container (NFR-SEC-05: Plain Text only, FR-UI-12: Progressive streaming) */}
      {answer !== null && answer !== '' && (
        <div
          data-testid="tutor-answer"
          className="mb-6 p-5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-normal leading-relaxed whitespace-pre-wrap select-text"
        >
          {answer}
          {isStreaming && (
            <span
              data-testid="streaming-cursor"
              className="inline-block w-1.5 h-3.5 ml-1 bg-blue-600 animate-pulse align-middle"
            />
          )}
        </div>
      )}

      {/* Question Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <label htmlFor="tutor-question" className="block text-xs font-semibold text-slate-700">
          Have a question about this lesson?
        </label>
        <div className="flex flex-col sm:flex-row gap-2.5">
          <input
            id="tutor-question"
            data-testid="tutor-input"
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={isOffline || loading}
            placeholder={isOffline ? 'Tutor is offline' : 'e.g. Can you explain the core perceptron formula?'}
            maxLength={500}
            className="flex-1 px-4 py-2.5 border border-slate-300 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed transition"
          />
          <button
            type="submit"
            data-testid="tutor-submit"
            disabled={isOffline || loading || !question.trim()}
            className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-semibold rounded-xl shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
          >
            {loading ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Thinking...
              </span>
            ) : (
              <span>Ask Tutor</span>
            )}
          </button>
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span>Responses include citations: [Lesson Title § Section]</span>
          <span>{question.length}/500</span>
        </div>
      </form>
    </aside>
  )
}
