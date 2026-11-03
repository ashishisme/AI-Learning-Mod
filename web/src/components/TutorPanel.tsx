// SPEC: FR-UI-03, FR-UI-07, FR-UI-12, NFR-SEC-05, AC-24, SPEC-005 (Audio & Speech Tutor)
import React, { useState, useEffect, useRef } from 'react'
import { askTutorStream, ApiError } from '../api'
import { useAudienceModeStore } from '../store'
import { speechService } from '../services/speechService'
import { useLanguage, useT } from '../i18n'

interface TutorPanelProps {
  lessonId: string
}

export const TutorPanel: React.FC<TutorPanelProps> = ({ lessonId }) => {
  const { mode: audienceMode } = useAudienceModeStore()
  const t = useT()
  const { language } = useLanguage() // SPEC-009 FR-026: the microphone and read-aloud follow the learner's language
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [isOffline, setIsOffline] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)
  const [isReadingAnswer, setIsReadingAnswer] = useState(false)
  // SPEC-006 FR-REV-22: microphone is off until an adult confirms. Stored only for this browser tab session.
  const [micConsent, setMicConsent] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('ai-coach-mic-consent') === 'yes'
    } catch {
      return false
    }
  })
  const [showMicConsent, setShowMicConsent] = useState(false)
  const recognitionRef = useRef<any>(null)

  // Release the microphone if the panel goes away while listening.
  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.abort()
      } catch {
        /* already stopped */
      }
    }
  }, [])

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

    if (!micConsent) {
      setShowMicConsent(true)
      return
    }

    if (isListening) {
      try {
        recognitionRef.current?.stop()
      } catch {
        /* already stopped */
      }
      setIsListening(false)
      return
    }

    try {
      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = false
      recognition.lang = language.speechLang

      recognition.onstart = () => setIsListening(true)
      recognition.onend = () => {
        recognitionRef.current = null
        setIsListening(false)
      }
      recognition.onerror = () => setIsListening(false)
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript
        if (transcript) {
          setQuestion((prev) => (prev ? `${prev} ${transcript}` : transcript))
        }
        setIsListening(false)
      }

      recognitionRef.current = recognition
      recognition.start()
    } catch (e) {
      recognitionRef.current = null
      console.warn('Speech recognition start failed', e)
      setIsListening(false)
    }
  }

  const confirmMic = () => {
    try {
      sessionStorage.setItem('ai-coach-mic-consent', 'yes')
    } catch {
      /* storage may be unavailable; consent then lasts until reload */
    }
    setMicConsent(true)
    setShowMicConsent(false)
  }

  const toggleReadAnswer = () => {
    if (!answer) return
    if (isReadingAnswer) {
      speechService.stop()
      setIsReadingAnswer(false)
    } else {
      setIsReadingAnswer(true)
      speechService.speak(answer, { speechLang: language.speechLang, onEnd: () => setIsReadingAnswer(false), onError: () => setIsReadingAnswer(false) })
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
          setIsOffline(true)
          setErrorMessage(null)
        } else {
          const msg = err instanceof Error ? err.message : t('tutor.unexpectedError')
          setErrorMessage(msg)
        }
      },
      audienceMode
    )
  }

  return (
    <aside
      data-testid="tutor-panel"
      className="mt-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-7 shadow-sm transition-all"
      aria-label={t('tutor.label')}
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm">
            AI
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-none">
              {t(audienceMode === 'junior' ? 'tutor.titleJunior' : audienceMode === 'plain-english' ? 'tutor.titlePlain' : 'tutor.title')}
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">
              {t(audienceMode === 'junior' ? 'tutor.subtitleJunior' : audienceMode === 'plain-english' ? 'tutor.subtitlePlain' : 'tutor.subtitle')}
            </span>
          </div>
        </div>

        {isOffline ? (
          <span
            data-testid="tutor-offline-badge"
            className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800"
          >
            {t('tutor.offline')}
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-200/60 dark:border-emerald-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {t('tutor.online')}
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
            <p className="font-semibold mb-0.5">{t('tutor.offline')}</p>
            <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
              {t('tutor.offlineBody')}
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
            {/* NFR-SEC-05: model output is untrusted, so it is shown as plain text. Links and images
                from a model would be live phishing links for child users. */}
            <p className="whitespace-pre-wrap break-words">{answer}</p>
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
                <span>{t(isReadingAnswer ? 'tutor.stopReading' : 'tutor.readAloud')}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Question Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <label htmlFor="tutor-question" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
          {t('tutor.question')}
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
              placeholder={t(isOffline ? 'tutor.offlinePlaceholder' : 'tutor.placeholder')}
              maxLength={500}
              className="w-full px-4 py-2.5 pr-11 border border-slate-300 dark:border-slate-400 bg-white dark:bg-white text-slate-900 dark:text-slate-900 placeholder:text-slate-500 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed transition rounded-xl text-sm font-medium shadow-2xs"
            />
            {/* Mic / Talk to Chip Button */}
            {speechSupported && !isOffline && (
              <button
                type="button"
                onClick={toggleSpeechRecognition}
                data-testid="tutor-mic-btn"
                title={t(isListening ? 'tutor.listeningStop' : 'tutor.talk')}
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
                {t('tutor.thinking')}
              </span>
            ) : (
              <span>{t('tutor.ask')}</span>
            )}
          </button>
        </div>
        {showMicConsent && (
          <div
            role="alertdialog"
            aria-label={t('tutor.micLabel')}
            data-testid="mic-consent"
            className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-2"
          >
            <p className="font-semibold">{t('tutor.micTitle')}</p>
            <p>
              {t('tutor.micBody')}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={confirmMic}
                data-testid="mic-consent-accept"
                className="px-3 py-1.5 rounded-lg bg-amber-600 text-white font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              >
                {t('tutor.micAccept')}
              </button>
              <button
                type="button"
                onClick={() => setShowMicConsent(false)}
                className="px-3 py-1.5 rounded-lg font-medium hover:bg-amber-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              >
                {t('tutor.micDecline')}
              </button>
            </div>
          </div>
        )}
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span>{t(isListening ? 'tutor.listening' : 'tutor.citations')}</span>
          <span>{question.length}/500</span>
        </div>
      </form>
    </aside>
  )
}
