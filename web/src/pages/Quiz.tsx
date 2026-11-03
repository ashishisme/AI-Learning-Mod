// SPEC: FR-UI-05, FR-QZ-01, FR-QZ-02, FR-QZ-03, FR-QZ-04, AC-25, AC-35
import React, { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ENGLISH_QUIZZES, loadQuizzes, LessonQuiz } from '../data/quizzes'
import { useProgressStore } from '../store'
import { askTutorStream } from '../api'
import { useLanguage, useT } from '../i18n'
import { NotTranslatedNotice } from '../components/NotTranslatedNotice'

export const Quiz: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const lessonId = id || ''
  const t = useT()
  const { code } = useLanguage()
  const [quizzes, setQuizzes] = useState(ENGLISH_QUIZZES)
  const [translated, setTranslated] = useState<Set<string>>(new Set())
  useEffect(() => {
    let live = true
    void loadQuizzes(code).then((q) => { if (live) { setQuizzes(q.quizzes); setTranslated(q.translated) } })
    return () => { live = false }
  }, [code])
  const quiz: LessonQuiz | undefined = quizzes[lessonId]
  const countedQuiz = useRef<string | null>(null)

  useEffect(() => {
    if (!quiz || countedQuiz.current === lessonId) return
    countedQuiz.current = lessonId
    void fetch('/api/usage/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'quiz_open' }),
    }).catch(() => { /* Usage counting must never interrupt a quiz. */ })
  }, [lessonId, quiz])

  const { setLessonCompleted, isLessonCompleted } = useProgressStore()

  // State for interactive quiz
  const [currentIdx, setCurrentIdx] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({})
  const [showRationale, setShowRationale] = useState<Record<number, boolean>>({})
  const [hintText, setHintText] = useState('')
  const [hintLoading, setHintLoading] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)

  // Fallback to placeholder if quiz not in registry (preserves AC-25)
  if (!quiz) {
    return (
      <div className="max-w-xl mx-auto py-20 px-4 text-center">
        <div
          data-testid="quiz-placeholder"
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-10 shadow-sm"
        >
          <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center text-2xl font-bold">
            ?
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mb-2">{t('quiz.placeholderTitle', { id: id ?? '' })}</h1>
          <p className="text-slate-600 dark:text-slate-300 text-sm mb-8 leading-relaxed max-w-sm mx-auto">
            {t('quiz.notAvailable')}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/"
              data-testid="quiz-home-link"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
            >
              <span>&larr;</span>
              <span>{t('quiz.backToCurriculum')}</span>
            </Link>
            <Link
              to="/quiz/1-intro"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl transition-all"
            >
              <span>{t('quiz.tryIntro')}</span>
              <span>&rarr;</span>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const currentQ = quiz.questions[currentIdx]
  const totalQuestions = quiz.questions.length
  const userChoice = selectedAnswers[currentIdx]
  const hasAnswered = userChoice !== undefined
  const isCorrect = userChoice === currentQ?.correctIndex

  const handleSelectOption = (optionIdx: number) => {
    if (hasAnswered) return // lock after selection
    setSelectedAnswers({ ...selectedAnswers, [currentIdx]: optionIdx })
    setShowRationale({ ...showRationale, [currentIdx]: true })
  }

  const handleNext = () => {
    setHintText('')
    if (currentIdx < totalQuestions - 1) {
      setCurrentIdx(currentIdx + 1)
    } else {
      setIsCompleted(true)
    }
  }

  const handleAskHint = async () => {
    if (hintLoading || !currentQ) return
    setHintLoading(true)
    setHintText('')
    try {
      await askTutorStream(
        quiz.lessonId,
        `Please give me a concise conceptual hint for answering this question without revealing the answer: "${currentQ.prompt}"`,
        (token) => setHintText((prev) => prev + token),
        () => setHintLoading(false),
        (err) => {
          setHintText(t('quiz.hintUnavailable', { message: err.message }))
          setHintLoading(false)
        }
      )
    } catch {
      setHintLoading(false)
    }
  }

  const handleRetake = () => {
    setCurrentIdx(0)
    setSelectedAnswers({})
    setShowRationale({})
    setHintText('')
    setIsCompleted(false)
  }

  // Calculate score
  const correctCount = Object.entries(selectedAnswers).filter(
    ([idx, choice]) => choice === quiz.questions[Number(idx)]?.correctIndex
  ).length
  const scorePercent = Math.round((correctCount / totalQuestions) * 100)
  // The title is styled, so the sentence is split around its placeholder (word order can differ by language).
  const completedFor = t('quiz.completedFor').split('{title}')

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 sm:px-6" data-testid="quiz-interactive">
      {/* Quiz Top Navigation Bar */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200 dark:border-slate-800">
        <Link
          to={`/lesson/${quiz.lessonId}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition"
        >
          <span>&larr;</span>
          <span>{t('quiz.backToLesson')}</span>
        </Link>
        <span className="text-xs font-mono text-slate-400">
          {t('quiz.lessonLabel', { id: quiz.lessonId })}
        </span>
      </div>
      {code !== 'en' && !translated.has(lessonId) && <NotTranslatedNotice className="mb-6" />}

      {isCompleted ? (
        /* Quiz Completed Recap Card */
        <div
          data-testid="quiz-recap-card"
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 sm:p-12 shadow-sm text-center animate-fade-in"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-500 dark:text-amber-400 flex items-center justify-center text-3xl shadow-sm">
            🏆
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">{t('quiz.completed')}</h2>
          <p className="text-slate-600 dark:text-slate-300 text-sm mb-6">
            {completedFor[0]}<span className="font-semibold text-slate-800 dark:text-slate-200">{quiz.title}</span>{completedFor[1]}
          </p>

          <div className="inline-block bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-8 py-5 mb-8">
            <div className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 mb-1" data-testid="quiz-final-score">
              {t('quiz.score', { count: correctCount, total: totalQuestions })}
            </div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {t('quiz.accuracy', { percent: scorePercent })}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={handleRetake}
              className="w-full sm:w-auto px-6 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition"
            >
              {t('quiz.retake')}
            </button>
            <button
              onClick={() => setLessonCompleted(quiz.lessonId, true)}
              className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm transition"
            >
              {t(isLessonCompleted(quiz.lessonId) ? 'quiz.markedComplete' : 'quiz.markComplete')}
            </button>
            <Link
              to="/"
              className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition"
            >
              {t('quiz.home')}
            </Link>
          </div>
        </div>
      ) : (
        /* Question Active View */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-sm">
          {/* Header & Stepper */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-full">
              {t('quiz.questionOf', { n: currentIdx + 1, total: totalQuestions })}
            </span>
            <span className="text-xs font-medium text-slate-400">
              {t('quiz.progress', { percent: Math.round((currentIdx / totalQuestions) * 100) })}
            </span>
          </div>

          {/* Stepper bar */}
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mb-6 overflow-hidden">
            <div
              className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${((currentIdx + 1) / totalQuestions) * 100}%` }}
            />
          </div>

          {/* Prompt */}
          <h2
            data-testid="question-prompt"
            className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 mb-6 leading-snug"
          >
            {currentQ.prompt}
          </h2>

          {/* Options */}
          <div className="space-y-3 mb-6" data-testid="question-options">
            {currentQ.options.map((option, optIdx) => {
              const isThisSelected = userChoice === optIdx
              const isThisCorrect = optIdx === currentQ.correctIndex

              let btnStyle = 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
              if (hasAnswered) {
                if (isThisCorrect) {
                  btnStyle = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-950 dark:text-emerald-100 font-medium'
                } else if (isThisSelected) {
                  btnStyle = 'border-rose-400 bg-rose-50 dark:bg-rose-950/50 text-rose-950 dark:text-rose-100'
                } else {
                  btnStyle = 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 text-slate-400 dark:text-slate-500 opacity-60'
                }
              }

              return (
                <button
                  key={optIdx}
                  type="button"
                  data-testid={`option-${optIdx}`}
                  onClick={() => handleSelectOption(optIdx)}
                  disabled={hasAnswered}
                  className={`w-full text-left p-4 rounded-2xl border transition-all flex items-start gap-3 ${btnStyle}`}
                >
                  <span
                    className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${
                      hasAnswered && isThisCorrect
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : hasAnswered && isThisSelected
                        ? 'border-rose-500 bg-rose-500 text-white'
                        : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {String.fromCharCode(65 + optIdx)}
                  </span>
                  <span className="text-sm leading-relaxed flex-1">{option}</span>
                </button>
              )
            })}
          </div>

          {/* Rationale Reveal */}
          {hasAnswered && (
            <div
              data-testid="answer-rationale"
              className={`p-4 rounded-2xl border text-xs leading-relaxed mb-6 animate-fade-in ${
                isCorrect
                  ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200'
                  : 'border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/50 text-rose-900 dark:text-rose-200'
              }`}
            >
              <div className="font-bold mb-1 flex items-center gap-1.5 text-sm">
                <span>{t(isCorrect ? 'quiz.correct' : 'quiz.incorrect')}</span>
              </div>
              <p>{currentQ.rationale}</p>
            </div>
          )}

          {/* AI Hint Section */}
          {hintText && (
            <div
              data-testid="tutor-hint-box"
              className="p-4 rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-950/50 text-indigo-950 dark:text-indigo-200 text-xs leading-relaxed mb-6 animate-fade-in"
            >
              <div className="font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5 mb-1">
                <span>{t('quiz.hintTitle')}</span>
              </div>
              <p>{hintText}</p>
            </div>
          )}

          {/* Action Row */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              data-testid="ask-hint-btn"
              onClick={handleAskHint}
              disabled={hintLoading || hasAnswered}
              className="px-3.5 py-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 disabled:opacity-50 rounded-xl transition flex items-center gap-1.5"
            >
              <span>{t(hintLoading ? 'quiz.thinking' : 'quiz.getHint')}</span>
            </button>

            {hasAnswered ? (
              <button
                type="button"
                data-testid="next-question-btn"
                onClick={handleNext}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition flex items-center gap-1.5"
              >
                <span>{t(currentIdx < totalQuestions - 1 ? 'quiz.next' : 'quiz.seeResults')}</span>
              </button>
            ) : (
              <span className="text-xs text-slate-400 italic">{t('quiz.selectOption')}</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
