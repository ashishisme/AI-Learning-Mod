import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { AdaptiveLessonPayload, Served } from '../api'
import { ChipMascotBanner } from './ChipMascotBanner'
import { ChipVectorAvatar } from './ChipVectorAvatar'
import { TuringWidget } from './TuringWidget'
import { ExpertSystemWidget } from './ExpertSystemWidget'
import { PerceptronWidget } from './PerceptronWidget'
import { ConvolutionWidget } from './ConvolutionWidget'
import { VectorMathWidget } from './VectorMathWidget'
import { BiasDetectiveWidget } from './BiasDetectiveWidget'
import { MermaidRenderer } from './MermaidRenderer'
import { VisualMetaphorCard } from './VisualMetaphorCard'
import { AudioNarrationButton } from './AudioNarrationButton'
import { sectionNarration } from '../services/narrationText'
import { speechService } from '../services/speechService'
import { useAudioStore, useProgressStore } from '../store'
import { StepperDiagram } from './StepperDiagram'
import { WidgetFrame } from './WidgetFrame'
import { ChoiceCard } from './ChoiceCard'
import { useLanguage, useT } from '../i18n'

interface Props {
  payload: AdaptiveLessonPayload & Served
}

export const AdaptiveLessonView: React.FC<Props> = ({ payload }) => {
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({})
  const t = useT()
  // SPEC-009 FR-013: read the lesson in the language it was served in (English when it fell back).
  const { languages } = useLanguage()
  const contentSpeechLang = languages.find((l) => l.code === (payload.servedLang ?? 'en'))?.speechLang ?? 'en-US'
  const trackPrefix = `${payload.lessonId}/${payload.mode}/`
  const { activeTrackId, currentSentence, isPlaying } = useAudioStore()

  const isJunior = payload.mode === 'junior'
  const completedLessons = useProgressStore((st) => st.completedLessons)
  // SPEC-006 FR-REV-13: warm-up questions about lessons the learner has already completed
  const recallQuestions = (payload.recall ?? []).filter((q) => q.fromLesson && completedLessons[q.fromLesson])

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
        <ChipMascotBanner greeting={payload.mascot?.greeting} speechLang={contentSpeechLang} trackPrefix={trackPrefix} />
      ) : (
        payload.intro && (
          <div className="p-6 rounded-3xl bg-gradient-to-r from-blue-50/90 to-indigo-50/70 dark:from-blue-950/40 dark:to-indigo-950/20 border-2 border-blue-200/90 dark:border-blue-800/50 text-slate-800 dark:text-slate-100 text-sm sm:text-base leading-relaxed font-medium shadow-sm flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">💡</span>
              <div>
                <span className="block font-bold text-xs uppercase tracking-wider text-blue-800 dark:text-blue-300 mb-1">
                  {t('adaptive.guideNote')}
                </span>
                <p>{payload.intro}</p>
              </div>
            </div>
            <AudioNarrationButton
              id="intro-guide-note"
              trackKey={trackPrefix + 'intro-guide-note'}
              speechLang={contentSpeechLang}
              textToRead={payload.intro}
              label={t('narration.listen')}
              variant="pill"
            />
          </div>
        )
      )}

      {/* Spaced recall warm-up (only after the earlier lesson was completed) */}
      {recallQuestions.map((q, i) => (
        <ChoiceCard
          key={`recall-${i}`}
          testId="recall-card"
          heading={t('adaptive.warmUp')}
          emoji="🧠"
          question={q}
        />
      ))}

      {/* Lesson Header */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
            {t(isJunior ? 'adaptive.trackJunior' : 'adaptive.trackPlain')}
          </span>
          {payload.readingTimeMinutes && (
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              ⏱️ {t('adaptive.minRead', { n: payload.readingTimeMinutes })}
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
                  trackKey={trackPrefix + sectionTrackId}
                  speechLang={contentSpeechLang}
                  textToRead={sectionNarration(section.heading, section.chipQuote, section.bodyMarkdown, t('narration.chipSays'))}
                  label={t('narration.readSection')}
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
                    {t('narration.speaking')}
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

              {/* Visual diagram: stepper (junior) or Mermaid SVG, always with alt text */}
              {section.diagram && section.diagram.type === 'stepper' && section.diagram.steps && (
                <StepperDiagram
                  caption={section.diagram.caption}
                  alt={section.diagram.alt}
                  steps={section.diagram.steps}
                />
              )}
              {section.diagram && section.diagram.type !== 'stepper' && section.diagram.content && (
                <MermaidRenderer
                  chart={section.diagram.content}
                  caption={section.diagram.caption}
                  alt={section.diagram.alt}
                />
              )}

              {section.interactiveWidget && (
                <WidgetFrame
                  goal={section.interactiveWidget.goal}
                  scaffold={section.interactiveWidget.scaffold}
                  predictionPrompt={section.interactiveWidget.predictionPrompt}
                  hints={section.interactiveWidget.hints}
                  successMessage={section.interactiveWidget.successMessage}
                  allowFreePlay={section.interactiveWidget.allowFreePlay}
                  isJunior={isJunior}
                >
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

                  {/* Embedded Interactive Perceptron Playground */}
                {section.interactiveWidget && section.interactiveWidget.type === 'perceptron-sim' && (
                  <PerceptronWidget />
                )}

                  {/* Embedded Interactive Convolution Simulator */}
                {section.interactiveWidget && section.interactiveWidget.type === 'convolution-sim' && (
                  <ConvolutionWidget />
                )}

                  {/* Embedded Interactive Vector Math Simulator */}
                {section.interactiveWidget && section.interactiveWidget.type === 'vector-math-sim' && (
                  <VectorMathWidget />
                )}

                  {/* Embedded Interactive Bias Detective Simulator */}
                {section.interactiveWidget && section.interactiveWidget.type === 'bias-detective-sim' && (
                  <BiasDetectiveWidget />
                )}
                </WidgetFrame>
              )}

              {/* Where you'll see this (plain-english) */}
              {!isJunior && section.realWorld && (
                <p
                  data-testid="real-world"
                  className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 text-sm text-emerald-950 dark:text-emerald-100"
                >
                  <span className="font-bold">{t('adaptive.realWorld')}</span>
                  {section.realWorld}
                </p>
              )}

              {/* Jargon Buster List */}
              {section.jargonBuster && section.jargonBuster.length > 0 && (
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80">
                  <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-2.5">
                    💡 {t('adaptive.jargonBuster')}
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {section.jargonBuster.map((jb, jIdx) => (
                      <div
                        key={jIdx}
                        className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 text-xs shadow-2xs"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <strong className="text-slate-900 dark:text-white font-semibold text-sm">
                            {jb.term}
                          </strong>
                          <button
                            type="button"
                            onClick={() => speechService.speak(jb.term, { speechLang: contentSpeechLang })}
                            title={t('adaptive.hearPronunciation', { term: jb.term })}
                            className="p-1 rounded-md text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition-colors text-xs"
                            aria-label={t('adaptive.pronounce', { term: jb.term })}
                          >
                            🔊
                          </button>
                        </div>
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

      {/* Teach-it-back (SPEC-006 FR-REV-12) */}
      {payload.teachBack && (
        <ChoiceCard
          testId="teach-back"
          heading={t(isJunior ? 'adaptive.teachBackJunior' : 'adaptive.teachBack')}
          emoji="🗣️"
          question={payload.teachBack}
        />
      )}

      {/* Mini-Quiz Section */}
      {payload.miniQuiz && payload.miniQuiz.length > 0 && (
        <section className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-blue-50/60 via-indigo-50/40 to-white dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 border-2 border-blue-300 dark:border-blue-800 shadow-lg">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-3xl">🎯</span>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white leading-none">
                {t('adaptive.checkTitle')}
              </h2>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {t('adaptive.checkSubtitle')}
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
                        ? q.praise || q.explanation || t('adaptive.praise')
                        : q.explanation || t('adaptive.tryAgain')}
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
