import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { AdaptiveLessonPayload } from '../api'
import { ChipMascotBanner } from './ChipMascotBanner'
import { ChipVectorAvatar } from './ChipVectorAvatar'
import { TuringWidget } from './TuringWidget'
import { MermaidRenderer } from './MermaidRenderer'
import { VisualMetaphorCard } from './VisualMetaphorCard'

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
      {/* Mascot Banner (Junior) or Plain Intro Banner (Adults) */}
      {isJunior ? (
        <ChipMascotBanner greeting={payload.mascot?.greeting} />
      ) : (
        payload.intro && (
          <div className="p-6 rounded-3xl bg-gradient-to-r from-blue-50/90 to-indigo-50/70 dark:from-blue-950/40 dark:to-indigo-950/20 border-2 border-blue-200/90 dark:border-blue-800/50 text-slate-800 dark:text-slate-100 text-sm sm:text-base leading-relaxed font-medium shadow-sm flex items-start gap-3">
            <span className="text-2xl flex-shrink-0">💡</span>
            <div>
              <span className="block font-bold text-xs uppercase tracking-wider text-blue-800 dark:text-blue-300 mb-1">
                Course Guide Note
              </span>
              <p>{payload.intro}</p>
            </div>
          </div>
        )
      )}

      {/* Lesson Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/70 text-blue-700 dark:text-blue-300 shadow-xs">
            {isJunior ? '🚀 Junior Explorer' : '💡 Plain English'}
          </span>
          {payload.readingTimeMinutes && (
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              ⏱️ {payload.readingTimeMinutes} min read
            </span>
          )}
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
          {payload.title}
        </h1>
      </div>

      {/* Sections */}
      <div className="space-y-12">
        {payload.sections.map((section, sIdx) => (
          <article
            key={section.id || sIdx}
            className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-md space-y-6"
          >
            {/* Section Heading */}
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
              {section.heading}
            </h2>

            {/* Chip Quote if Junior Mode */}
            {isJunior && section.chipQuote && (
              <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs sm:text-sm text-amber-900 dark:text-amber-100 font-medium shadow-xs">
                <div className="w-10 h-10 flex-shrink-0 bg-white dark:bg-slate-800 rounded-xl border border-amber-300 dark:border-amber-600 flex items-center justify-center shadow-xs">
                  <ChipVectorAvatar size={34} />
                </div>
                <p className="italic leading-relaxed">"{section.chipQuote}"</p>
              </div>
            )}

            {/* Visual Metaphor Illustration Card */}
            {section.analogy && (
              <VisualMetaphorCard
                metaphorName={section.analogy.metaphorName}
                description={section.analogy.description}
                isJunior={isJunior}
              />
            )}

            {/* Body Markdown Content */}
            <div className="prose prose-slate dark:prose-invert max-w-none text-slate-700 dark:text-slate-200 text-sm sm:text-base leading-relaxed">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {section.bodyMarkdown}
              </ReactMarkdown>
            </div>

            {/* Rendered Visual Diagram (Mermaid SVG Graphic) */}
            {section.diagram && section.diagram.content && (
              <MermaidRenderer
                chart={section.diagram.content}
                caption={section.diagram.caption}
              />
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
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-2.5">
                  💡 Jargon Buster
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {section.jargonBuster.map((jb, jIdx) => (
                    <div
                      key={jIdx}
                      className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 text-xs shadow-2xs"
                    >
                      <strong className="text-slate-900 dark:text-white block font-semibold mb-1 text-sm">
                        {jb.term}
                      </strong>
                      <span className="text-slate-600 dark:text-slate-300 leading-normal">
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
        <section className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-blue-50/60 via-indigo-50/40 to-white dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 border-2 border-blue-300 dark:border-blue-800 shadow-lg">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-3xl">🎯</span>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white leading-none">
                Quick Comprehension Check
              </h2>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Test your knowledge of the lesson
              </span>
            </div>
          </div>

          <div className="space-y-6">
            {payload.miniQuiz.map((q, qIdx) => {
              const selectedOpt = quizAnswers[qIdx]
              const hasAnswered = selectedOpt !== undefined
              const isCorrect = selectedOpt === q.correctIndex

              return (
                <div
                  key={qIdx}
                  className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3.5"
                >
                  <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                    {qIdx + 1}. {q.question}
                  </p>

                  <div className="space-y-2.5">
                    {q.options.map((opt, optIdx) => {
                      const isThisSelected = selectedOpt === optIdx
                      let btnStyle = 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300'
                      if (hasAnswered) {
                        if (optIdx === q.correctIndex) {
                          btnStyle = 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-100 font-semibold shadow-xs'
                        } else if (isThisSelected) {
                          btnStyle = 'border-rose-400 bg-rose-50/60 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 line-through'
                        }
                      }

                      return (
                        <button
                          key={optIdx}
                          disabled={hasAnswered}
                          onClick={() => handleSelectQuizOption(qIdx, optIdx)}
                          className={`w-full text-left p-3.5 rounded-xl border text-xs sm:text-sm transition-all flex items-center justify-between ${btnStyle}`}
                        >
                          <span className="leading-snug">{opt}</span>
                          {hasAnswered && optIdx === q.correctIndex && <span className="text-base flex-shrink-0 ml-2">✅</span>}
                        </button>
                      )
                    })}
                  </div>

                  {hasAnswered && (
                    <div
                      className={`p-3.5 rounded-xl text-xs sm:text-sm font-medium animate-fadeIn ${
                        isCorrect
                          ? 'bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-100'
                          : 'bg-amber-100/80 dark:bg-amber-950/60 text-amber-900 dark:text-amber-100'
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
