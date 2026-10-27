import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { AdaptiveLessonPayload } from '../api'
import { ChipMascotBanner } from './ChipMascotBanner'
import { TuringWidget } from './TuringWidget'

interface Props {
  payload: AdaptiveLessonPayload
}

export const AdaptiveLessonView: React.FC<Props> = ({ payload }) => {
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({})

  const isJunior = payload.mode === 'junior'

  const handleSelectQuizOption = (qIdx: number, optIdx: number) => {
    setQuizAnswers((prev) => ({ ...prev, [qIdx]: optIdx }))
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Mascot or Plain Intro Banner */}
      {isJunior ? (
        <ChipMascotBanner greeting={payload.mascot?.greeting} />
      ) : (
        payload.intro && (
          <div className="p-5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/40 text-slate-700 dark:text-slate-200 text-sm sm:text-base leading-relaxed font-medium">
            💡 {payload.intro}
          </div>
        )
      )}

      {/* Lesson Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
            {isJunior ? '🚀 Junior Explorer' : '💡 Plain English'}
          </span>
          {payload.readingTimeMinutes && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              ⏱️ {payload.readingTimeMinutes} min read
            </span>
          )}
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          {payload.title}
        </h1>
      </div>

      {/* Sections */}
      <div className="space-y-12">
        {payload.sections.map((section, sIdx) => (
          <article
            key={section.id || sIdx}
            className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6"
          >
            {/* Section Heading */}
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              {section.heading}
            </h2>

            {/* Chip Quote if Junior Mode */}
            {isJunior && section.chipQuote && (
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-xs sm:text-sm text-amber-900 dark:text-amber-200 font-medium">
                <span className="text-xl">🤖</span>
                <p>"{section.chipQuote}"</p>
              </div>
            )}

            {/* Analogy Metaphor Card */}
            {section.analogy && (
              <div className="p-5 rounded-xl bg-gradient-to-br from-indigo-50/70 to-blue-50/70 dark:from-indigo-950/30 dark:to-blue-950/20 border border-indigo-200/80 dark:border-indigo-900/40">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base">✨</span>
                  <h3 className="text-sm font-bold text-indigo-900 dark:text-indigo-200 uppercase tracking-wider">
                    Everyday Metaphor: {section.analogy.metaphorName}
                  </h3>
                </div>
                <p className="text-sm sm:text-base text-slate-700 dark:text-slate-200 leading-relaxed">
                  {section.analogy.description}
                </p>
              </div>
            )}

            {/* Body Markdown Content */}
            <div className="prose prose-slate dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 text-sm sm:text-base leading-relaxed">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {section.bodyMarkdown}
              </ReactMarkdown>
            </div>

            {/* Embedded Diagram Card */}
            {section.diagram && (
              <div className="my-6 p-5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
                  📊 Visual Guide: {section.diagram.caption}
                </span>
                <pre className="p-4 rounded-lg bg-slate-900 text-slate-100 text-xs sm:text-sm font-mono overflow-x-auto">
                  <code>{section.diagram.content}</code>
                </pre>
              </div>
            )}

            {/* Embedded Interactive Turing Widget */}
            {section.interactiveWidget && section.interactiveWidget.type === 'turing-guess-game' && (
              <TuringWidget
                title={section.interactiveWidget.title}
                instruction={section.interactiveWidget.instruction}
                scenario={section.interactiveWidget.scenario}
              />
            )}

            {/* Jargon Buster List */}
            {section.jargonBuster && section.jargonBuster.length > 0 && (
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80">
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-2">
                  💡 Jargon Buster
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {section.jargonBuster.map((jb, jIdx) => (
                    <div
                      key={jIdx}
                      className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700/50 text-xs"
                    >
                      <strong className="text-slate-900 dark:text-white block font-semibold mb-0.5">
                        {jb.term}
                      </strong>
                      <span className="text-slate-600 dark:text-slate-300">
                        {jb.simpleExplanation}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </article>
        ))}
      </div>

      {/* Mini-Quiz Section */}
      {payload.miniQuiz && payload.miniQuiz.length > 0 && (
        <section className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-slate-900 dark:to-slate-900 border-2 border-blue-200 dark:border-blue-900 shadow-md">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            🎯 Quick Comprehension Check
          </h2>

          <div className="space-y-6">
            {payload.miniQuiz.map((q, qIdx) => {
              const selectedOpt = quizAnswers[qIdx]
              const hasAnswered = selectedOpt !== undefined
              const isCorrect = selectedOpt === q.correctIndex

              return (
                <div
                  key={qIdx}
                  className="p-5 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3"
                >
                  <p className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100">
                    {qIdx + 1}. {q.question}
                  </p>

                  <div className="space-y-2">
                    {q.options.map((opt, optIdx) => {
                      const isThisSelected = selectedOpt === optIdx
                      let btnStyle = 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300'
                      if (hasAnswered) {
                        if (optIdx === q.correctIndex) {
                          btnStyle = 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 font-semibold'
                        } else if (isThisSelected) {
                          btnStyle = 'border-rose-400 bg-rose-50/50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 line-through'
                        }
                      }

                      return (
                        <button
                          key={optIdx}
                          disabled={hasAnswered}
                          onClick={() => handleSelectQuizOption(qIdx, optIdx)}
                          className={`w-full text-left p-3 rounded-lg border text-xs sm:text-sm transition-all flex items-center justify-between ${btnStyle}`}
                        >
                          <span>{opt}</span>
                          {hasAnswered && optIdx === q.correctIndex && <span>✅</span>}
                        </button>
                      )
                    })}
                  </div>

                  {hasAnswered && (
                    <div
                      className={`p-3 rounded-lg text-xs sm:text-sm font-medium ${
                        isCorrect
                          ? 'bg-emerald-100/70 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200'
                          : 'bg-amber-100/70 dark:bg-amber-950/50 text-amber-800 dark:text-amber-200'
                      }`}
                    >
                      {isCorrect
                        ? q.praise || q.explanation || 'Great job! You nailed it!'
                        : q.explanation || 'Not quite! Review the section above and try again.'}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
