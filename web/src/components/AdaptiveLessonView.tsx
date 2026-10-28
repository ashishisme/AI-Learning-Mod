import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { AdaptiveLessonPayload } from '../api'
import { ChipMascotBanner } from './ChipMascotBanner'
import { ChipVectorAvatar } from './ChipVectorAvatar'
import { TuringWidget } from './TuringWidget'
import { ExpertSystemWidget } from './ExpertSystemWidget'
import { MermaidRenderer } from './MermaidRenderer'
import { VisualMetaphorCard } from './VisualMetaphorCard'
import { AudioNarrationButton } from './AudioNarrationButton'
import { speechService } from '../services/speechService'
import { useAudioStore } from '../store'

interface Props {
  payload: AdaptiveLessonPayload
}

export const AdaptiveLessonView: React.FC<Props> = ({ payload }) => {
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({})
  const { activeTrackId, currentSentence, isPlaying } = useAudioStore()

  const isJunior = payload.mode === 'junior'

  const handleSelectQuizOption = (qIdx: number, optIdx: number) => {
    setQuizAnswers((prev) => ({ ...prev, [qIdx]: optIdx }))
    const q = payload.miniQuiz?.[qIdx]
    if (q) {
      const isCorrect = optIdx === q.correctIndex
      speechService.playChime(isCorrect ? 'success' : 'click')
    }
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Mascot Banner (Junior) or Plain Intro Banner (Adults) */}
      {isJunior ? (
        <ChipMascotBanner greeting={payload.mascot?.greeting} />
      ) : (
        payload.intro && (
          <div className="p-6 rounded-3xl bg-gradient-to-r from-blue-50/90 to-indigo-50/70 dark:from-blue-950/40 dark:to-indigo-950/20 border-2 border-blue-200/90 dark:border-blue-800/50 text-slate-800 dark:text-slate-100 text-sm sm:text-base leading-relaxed font-medium shadow-sm flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">💡</span>
              <div>
                <span className="block font-bold text-xs uppercase tracking-wider text-blue-800 dark:text-blue-300 mb-1">
                  Course Guide Note
                </span>
                <p>{payload.intro}</p>
              </div>
            </div>
            <AudioNarrationButton
              id="intro-guide-note"
              textToRead={payload.intro}
              label="Listen"
              variant="pill"
            />
          </div>
        )
      )}

      {/* Lesson Header */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
            {isJunior ? '🌟 Junior AI Explorer' : '📘 Plain English Track'}
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
        {payload.sections.map((section, sIdx) => {
          const sectionTrackId = `section-${section.id || sIdx}`
          const isThisSectionPlaying = isPlaying && activeTrackId === sectionTrackId

          return (
            <article
              key={section.id || sIdx}
              className={`p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border transition-all duration-300 space-y-6 shadow-md ${
                isThisSectionPlaying
                  ? 'border-blue-400 dark:border-blue-500 ring-2 ring-blue-300/40 dark:ring-blue-700/40'
                  : 'border-slate-200/90 dark:border-slate-800'
              }`}
            >
              {/* Section Heading + Audio Button */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
                  {section.heading}
                </h2>
                <AudioNarrationButton
                  id={sectionTrackId}
                  textToRead={`${section.heading}. ${section.chipQuote ? 'Chip says: ' + section.chipQuote + '. ' : ''}${section.bodyMarkdown}`}
                  label="Read section"
                  variant="pill"
                />
              </div>

              {/* Active Karaoke Spoken Sentence Indicator */}
              {isThisSectionPlaying && currentSentence && (
                <div className="p-3 rounded-xl bg-blue-50/90 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-xs text-blue-900 dark:text-blue-200 font-medium flex items-center gap-2 animate-fadeIn shadow-2xs">
                  <span className="flex h-2 w-2 relative flex-shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                  </span>
                  <span className="font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider text-[10px] flex-shrink-0">
                    Speaking:
                  </span>
                  <span className="italic line-clamp-2">"{currentSentence}"</span>
                </div>
              )}

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

              {/* Embedded Interactive Expert System Simulator */}
              {section.interactiveWidget && section.interactiveWidget.type === 'expert-system-sim' && (
                <ExpertSystemWidget />
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
          )
        })}
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
