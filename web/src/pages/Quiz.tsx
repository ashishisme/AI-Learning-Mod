// SPEC: FR-UI-05, FR-QZ-01, FR-QZ-02, FR-QZ-03, FR-QZ-04, AC-25, AC-35
import React, { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { QUIZ_DATA, LessonQuiz } from '../data/quizzes'
import { useProgressStore } from '../store'
import { askTutorStream } from '../api'

export const Quiz: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const lessonId = id || ''
  const quiz: LessonQuiz | undefined = QUIZ_DATA[lessonId]

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
          className="bg-white border border-slate-200 rounded-3xl p-10 shadow-sm"
        >
          <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl font-bold">
            ?
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mb-2">Quiz: {id}</h1>
          <p className="text-slate-600 text-sm mb-8 leading-relaxed max-w-sm mx-auto">
            Quizzes are not yet available for this lesson. Please review the lesson material and check back soon!
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/"
              data-testid="quiz-home-link"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
            >
              <span>&larr;</span>
              <span>Back to Curriculum</span>
            </Link>
            <Link
              to="/quiz/1-intro"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 text-xs font-semibold rounded-xl transition-all"
            >
              <span>Try Intro to AI Quiz</span>
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
          setHintText(`Hint unavailable: ${err.message}`)
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

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 sm:px-6" data-testid="quiz-interactive">
      {/* Quiz Top Navigation Bar */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200">
        <Link
          to={`/lesson/${quiz.lessonId}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 transition"
        >
          <span>&larr;</span>
          <span>Back to Lesson</span>
        </Link>
        <span className="text-xs font-mono text-slate-400">
          Lesson: {quiz.lessonId}
        </span>
      </div>

      {isCompleted ? (
        /* Quiz Completed Recap Card */
        <div
          data-testid="quiz-recap-card"
          className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 shadow-sm text-center animate-fade-in"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center text-3xl shadow-sm">
            🏆
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Quiz Completed!</h2>
          <p className="text-slate-600 text-sm mb-6">
            You completed the comprehension check for <span className="font-semibold text-slate-800">{quiz.title}</span>.
          </p>

          <div className="inline-block bg-slate-50 border border-slate-200 rounded-2xl px-8 py-5 mb-8">
            <div className="text-3xl font-extrabold text-blue-600 mb-1" data-testid="quiz-final-score">
              {correctCount} / {totalQuestions}
            </div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {scorePercent}% Accuracy
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={handleRetake}
              className="w-full sm:w-auto px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
            >
              🔄 Retake Quiz
            </button>
            <button
              onClick={() => setLessonCompleted(quiz.lessonId, true)}
              className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm transition"
            >
              {isLessonCompleted(quiz.lessonId) ? 'Marked Complete ✅' : 'Mark Lesson Complete ✅'}
            </button>
            <Link
              to="/"
              className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition"
            >
              Curriculum Home &rarr;
            </Link>
          </div>
        </div>
      ) : (
        /* Question Active View */
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-sm">
          {/* Header & Stepper */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
              Question {currentIdx + 1} of {totalQuestions}
            </span>
            <span className="text-xs font-medium text-slate-400">
              {Math.round(((currentIdx) / totalQuestions) * 100)}% progress
            </span>
          </div>

          {/* Stepper bar */}
          <div className="w-full bg-slate-100 rounded-full h-1.5 mb-6 overflow-hidden">
            <div
              className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${((currentIdx + 1) / totalQuestions) * 100}%` }}
            />
          </div>

          {/* Prompt */}
          <h2
            data-testid="question-prompt"
            className="text-lg sm:text-xl font-bold text-slate-900 mb-6 leading-snug"
          >
            {currentQ.prompt}
          </h2>

          {/* Options */}
          <div className="space-y-3 mb-6" data-testid="question-options">
            {currentQ.options.map((option, optIdx) => {
              const isThisSelected = userChoice === optIdx
              const isThisCorrect = optIdx === currentQ.correctIndex

              let btnStyle = 'border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50'
              if (hasAnswered) {
                if (isThisCorrect) {
                  btnStyle = 'border-emerald-500 bg-emerald-50 text-emerald-950 font-medium'
                } else if (isThisSelected) {
                  btnStyle = 'border-rose-400 bg-rose-50 text-rose-950'
                } else {
                  btnStyle = 'border-slate-200 bg-slate-50/50 text-slate-400 opacity-60'
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
                        : 'border-slate-300 text-slate-600'
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
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                  : 'border-rose-200 bg-rose-50 text-rose-900'
              }`}
            >
              <div className="font-bold mb-1 flex items-center gap-1.5 text-sm">
                <span>{isCorrect ? '✅ Correct!' : '❌ Incorrect'}</span>
              </div>
              <p>{currentQ.rationale}</p>
            </div>
          )}

          {/* AI Hint Section */}
          {hintText && (
            <div
              data-testid="tutor-hint-box"
              className="p-4 rounded-2xl border border-indigo-200 bg-indigo-50/60 text-indigo-950 text-xs leading-relaxed mb-6 animate-fade-in"
            >
              <div className="font-bold text-indigo-900 flex items-center gap-1.5 mb-1">
                <span>💡 AI Tutor Hint:</span>
              </div>
              <p>{hintText}</p>
            </div>
          )}

          {/* Action Row */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              data-testid="ask-hint-btn"
              onClick={handleAskHint}
              disabled={hintLoading || hasAnswered}
              className="px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 rounded-xl transition flex items-center gap-1.5"
            >
              <span>{hintLoading ? '⏳ Thinking...' : '💡 Get AI Hint'}</span>
            </button>

            {hasAnswered ? (
              <button
                type="button"
                data-testid="next-question-btn"
                onClick={handleNext}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition flex items-center gap-1.5"
              >
                <span>{currentIdx < totalQuestions - 1 ? 'Next Question →' : 'See Results 🏆'}</span>
              </button>
            ) : (
              <span className="text-xs text-slate-400 italic">Select an option to continue</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
