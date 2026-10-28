// SPEC: FR-UI-03, FR-UI-07, FR-UI-12, NFR-SEC-05, AC-24, SPEC-005 (Audio & Speech Tutor)
import React, { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import { askTutorStream, ApiError } from '../api'
import { useAudienceModeStore } from '../store'
import { speechService } from '../services/speechService'

const sanitizeSchema = {
  ...defaultSchema,
  tagNames: defaultSchema.tagNames?.filter(
    (tag) => !['script', 'iframe', 'object', 'embed', 'form'].includes(tag)
  ),
  attributes: {
    ...defaultSchema.attributes,
    '*': (defaultSchema.attributes?.['*'] || []).filter(
      (attr) => typeof attr === 'string' && !attr.toLowerCase().startsWith('on')
    ),
    a: ['href', 'title', 'target', 'rel'],
  },
}

interface TutorPanelProps {
  lessonId: string
}

export const TutorPanel: React.FC<TutorPanelProps> = ({ lessonId }) => {
  const { mode: audienceMode } = useAudienceModeStore()
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [isOffline, setIsOffline] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)
  const [isReadingAnswer, setIsReadingAnswer] = useState(false)

  useEffect(() => {
    // Check Web Speech API availability
    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: any }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: any }).webkitSpeechRecognition
    if (SpeechRecognition) {
      setSpeechSupported(true)
    }
  }, [])

  const toggleSpeechRecognition = () => {
    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: any }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: any }).webkitSpeechRecognition

    if (!SpeechRecognition) return

    if (isListening) {
      setIsListening(false)
      return
    }

    try {
      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = false
      recognition.lang = 'en-US'

      recognition.onstart = () => setIsListening(true)
      recognition.onend = () => setIsListening(false)
      recognition.onerror = () => setIsListening(false)
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript
        if (transcript) {
          setQuestion((prev) => (prev ? `${prev} ${transcript}` : transcript))
        }
        setIsListening(false)
      }

      recognition.start()
    } catch (e) {
      console.warn('Speech recognition start failed', e)
      setIsListening(false)
    }
  }

  const toggleReadAnswer = () => {
    if (!answer) return
    if (isReadingAnswer) {
      speechService.stop()
      setIsReadingAnswer(false)
    } else {
      setIsReadingAnswer(true)
      speechService.speak(answer, { onEnd: () => setIsReadingAnswer(false), onError: () => setIsReadingAnswer(false) })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim() || loading || isOffline) return

    setLoading(true)
    setIsStreaming(true)
    setAnswer('')
    setErrorMessage(null)
    setIsReadingAnswer(false)

    const promptToSend =
      audienceMode === "junior"
        ? `[Tone: Friendly explanation for a 10-year-old student with playful analogies]: ${question.trim()}`
        : audienceMode === "plain-english"
        ? `[Tone: Plain English everyday explanation for non-tech adults]: ${question.trim()}`
        : question.trim()

    await askTutorStream(
      lessonId,
      promptToSend,
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
          setIsOffline(true)
          setErrorMessage(null)
        } else {
          const msg = err instanceof Error ? err.message : 'An unexpected error occurred'
          setErrorMessage(msg)
        }
      }
    )
  }

  return (
    <aside
      data-testid="tutor-panel"
      className="mt-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-7 shadow-sm transition-all"
      aria-label="AI Teaching Assistant"
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm">
            AI
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-none">
              {audienceMode === "junior" ? "Chip the AI Robot 🤖" : audienceMode === "plain-english" ? "Plain English Assistant 💡" : "Lesson Assistant"}
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">
              {audienceMode === "junior" ? "Ask Chip anything! No question is too silly." : audienceMode === "plain-english" ? "Practical everyday answers without jargon" : "Grounded exclusively in this module"}
            </span>
          </div>
        </div>

        {isOffline ? (
          <span
            data-testid="tutor-offline-badge"
            className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800"
          >
            Tutor offline
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-200/60 dark:border-emerald-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Online
          </span>
        )}
      </div>

      {/* Offline Alert Box */}
      {isOffline && (
        <div
          data-testid="tutor-offline-message"
          className="mb-5 p-4 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-900 dark:text-amber-200 text-sm flex items-start gap-3"
        >
          <span className="text-base leading-none">⚠️</span>
          <div>
            <p className="font-semibold mb-0.5">Tutor offline</p>
            <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
              The AI Teaching Assistant service is currently unavailable or disabled. All other curriculum content remains fully accessible.
            </p>
          </div>
        </div>
      )}

      {/* Inline Error Message */}
      {errorMessage && (
        <div
          data-testid="tutor-error"
          className="mb-5 p-4 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-sm flex items-start gap-2.5"
        >
          <span className="font-bold leading-none">!</span>
          <p className="text-xs leading-relaxed">{errorMessage}</p>
        </div>
      )}

      {/* Answer Container with Listen Button */}
      {answer !== null && answer !== '' && (
        <div className="mb-6 relative">
          <div
            data-testid="tutor-answer"
            className="p-5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 text-sm font-normal leading-relaxed select-text prose prose-sm dark:prose-invert max-w-none prose-headings:font-bold prose-headings:text-slate-900 dark:prose-headings:text-slate-100 prose-headings:my-2 prose-p:my-1.5 prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:font-medium prose-a:underline hover:prose-a:text-blue-700"
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema]]}
            >
              {answer}
            </ReactMarkdown>
            {isStreaming && (
              <span
                data-testid="streaming-cursor"
                className="inline-block w-1.5 h-3.5 ml-1 bg-blue-600 animate-pulse align-middle"
              />
            )}
          </div>

          {!isStreaming && (
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={toggleReadAnswer}
                data-testid="tutor-read-answer-btn"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-medium transition-colors"
              >
                <span>{isReadingAnswer ? '⏹️ Stop Reading' : '🔊 Read Answer Aloud'}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Question Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <label htmlFor="tutor-question" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
          Have a question about this lesson?
        </label>
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <input
              id="tutor-question"
              data-testid="tutor-input"
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              disabled={isOffline || loading}
              placeholder={isOffline ? 'Tutor is offline' : 'e.g. Can you explain the core concepts simply?'}
              maxLength={500}
              className="w-full px-4 py-2.5 pr-11 border border-slate-300 dark:border-slate-400 bg-white dark:bg-white text-slate-900 dark:text-slate-900 placeholder:text-slate-500 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed transition rounded-xl text-sm font-medium shadow-2xs"
            />
            {/* Mic / Talk to Chip Button */}
            {speechSupported && !isOffline && (
              <button
                type="button"
                onClick={toggleSpeechRecognition}
                data-testid="tutor-mic-btn"
                title={isListening ? 'Listening... click to stop' : 'Talk to Chip (Voice Input)'}
                className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors ${
                  isListening
                    ? 'bg-rose-500 text-white animate-pulse'
                    : 'text-slate-400 hover:text-blue-600 dark:hover:text-blue-400'
                }`}
              >
                <span className="text-sm">🎙️</span>
              </button>
            )}
          </div>

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
          <span>{isListening ? '🎙️ Listening to your voice...' : 'Responses include citations: [Lesson Title § Section]'}</span>
          <span>{question.length}/500</span>
        </div>
      </form>
    </aside>
  )
}
