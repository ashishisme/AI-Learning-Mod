import React, { useState } from 'react'
import { speechService } from '../services/speechService'
import { useT } from '../i18n'

interface Scenario {
  userPrompt: string
  terminalA: string
  terminalB: string
  correctAnswer: string // e.g. "Terminal A" or "Terminal B"
  explanation: string
}

interface Props {
  title?: string
  instruction?: string
  scenario: Scenario
}

export const TuringWidget: React.FC<Props> = ({ title: givenTitle, instruction: givenInstruction, scenario }) => {
  const t = useT()
  const title = givenTitle ?? t('widget.turing.title')
  const instruction = givenInstruction ?? t('widget.turing.instruction')
  // 'Terminal A' / 'Terminal B' are content values; the learner sees the translated name.
  const terminalName = (value: string) => t('widget.turing.terminal', { x: value.slice(-1) })
  const [selected, setSelected] = useState<string | null>(null)

  const isRevealed = selected !== null
  const isCorrect = selected === scenario.correctAnswer

  const handleSelect = (choice: string) => {
    setSelected(choice)
    const isWon = choice === scenario.correctAnswer
    speechService.playChime(isWon ? 'success' : 'click')
  }

  const handleReset = () => {
    setSelected(null)
    speechService.playChime('click')
  }

  return (
    <div className="my-8 p-6 sm:p-8 rounded-3xl bg-slate-900 text-white border border-purple-500/30 shadow-2xl relative overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute -top-24 -left-24 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5 border-b border-slate-800 pb-4 relative z-10">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-2xl animate-bounce">🎭</span>
            <h4 className="text-lg sm:text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
              {title}
            </h4>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            {instruction}
          </p>
        </div>
        <span className="text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
          {t('widget.turing.stage')}
        </span>
      </div>

      {/* Interrogator Prompt Card */}
      <div className="mb-6 p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 relative z-10 shadow-md">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">🕵️‍♂️</span>
          <span className="text-xs font-bold uppercase tracking-wider text-purple-300">
            {t('widget.turing.interrogator')}
          </span>
        </div>
        <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-500/30 text-purple-100 text-sm sm:text-base font-medium italic">
          "{scenario.userPrompt}"
        </div>
      </div>

      {/* Side-by-Side Curtain Stages */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 relative z-10">
        {/* Terminal A */}
        <div
          className={`p-5 rounded-2xl border-2 transition-all flex flex-col justify-between relative overflow-hidden ${
            isRevealed && scenario.correctAnswer === 'Terminal A'
              ? 'border-purple-500 bg-purple-950/30 shadow-[0_0_20px_rgba(168,85,247,0.2)]'
              : selected === 'Terminal A'
              ? 'border-blue-500 bg-slate-800'
              : 'border-slate-800 bg-slate-800/90 hover:border-slate-700'
          }`}
        >
          {/* Top Curtain / Identity Bar */}
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-slate-700/60 pb-2">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                📟 {terminalName('Terminal A')}
              </span>
              {isRevealed ? (
                <span
                  className={`text-[11px] font-extrabold px-3 py-1 rounded-full flex items-center gap-1.5 animate-bounce ${
                    scenario.correctAnswer === 'Terminal A'
                      ? 'bg-purple-500/30 text-purple-200 border border-purple-500/50'
                      : 'bg-emerald-500/30 text-emerald-200 border border-emerald-500/50'
                  }`}
                >
                  {t(scenario.correctAnswer === 'Terminal A' ? 'widget.turing.ai' : 'widget.turing.human')}
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-700/70 text-slate-300 flex items-center gap-1">
                  {t('widget.turing.closed')}
                </span>
              )}
            </div>

            {/* Revealed Graphic Icon */}
            {isRevealed && (
              <div className="flex justify-center my-3">
                <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center text-3xl shadow-inner animate-scaleIn">
                  {scenario.correctAnswer === 'Terminal A' ? '🤖' : '🧑‍💻'}
                </div>
              </div>
            )}

            {/* Message Speech Bubble */}
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-700/70 text-slate-200 text-xs sm:text-sm leading-relaxed font-sans">
              "{scenario.terminalA}"
            </div>
          </div>

          {!isRevealed ? (
            <button
              onClick={() => handleSelect('Terminal A')}
              className="mt-5 w-full py-2.5 px-4 text-xs sm:text-sm font-bold rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md transition-all transform hover:scale-[1.02]"
            >
              👉 {t('widget.turing.vote', { terminal: terminalName('Terminal A') })}
            </button>
          ) : (
            <div className="mt-3 text-[11px] text-center font-medium text-slate-400">
              {t(scenario.correctAnswer === 'Terminal A' ? 'widget.turing.identifiedAi' : 'widget.turing.identifiedHuman')}
            </div>
          )}
        </div>

        {/* Terminal B */}
        <div
          className={`p-5 rounded-2xl border-2 transition-all flex flex-col justify-between relative overflow-hidden ${
            isRevealed && scenario.correctAnswer === 'Terminal B'
              ? 'border-purple-500 bg-purple-950/30 shadow-[0_0_20px_rgba(168,85,247,0.2)]'
              : selected === 'Terminal B'
              ? 'border-blue-500 bg-slate-800'
              : 'border-slate-800 bg-slate-800/90 hover:border-slate-700'
          }`}
        >
          {/* Top Curtain / Identity Bar */}
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-slate-700/60 pb-2">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                📟 {terminalName('Terminal B')}
              </span>
              {isRevealed ? (
                <span
                  className={`text-[11px] font-extrabold px-3 py-1 rounded-full flex items-center gap-1.5 animate-bounce ${
                    scenario.correctAnswer === 'Terminal B'
                      ? 'bg-purple-500/30 text-purple-200 border border-purple-500/50'
                      : 'bg-emerald-500/30 text-emerald-200 border border-emerald-500/50'
                  }`}
                >
                  {t(scenario.correctAnswer === 'Terminal B' ? 'widget.turing.ai' : 'widget.turing.human')}
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-700/70 text-slate-300 flex items-center gap-1">
                  {t('widget.turing.closed')}
                </span>
              )}
            </div>

            {/* Revealed Graphic Icon */}
            {isRevealed && (
              <div className="flex justify-center my-3">
                <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center text-3xl shadow-inner animate-scaleIn">
                  {scenario.correctAnswer === 'Terminal B' ? '🤖' : '🧑‍💻'}
                </div>
              </div>
            )}

            {/* Message Speech Bubble */}
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-700/70 text-slate-200 text-xs sm:text-sm leading-relaxed font-sans">
              "{scenario.terminalB}"
            </div>
          </div>

          {!isRevealed ? (
            <button
              onClick={() => handleSelect('Terminal B')}
              className="mt-5 w-full py-2.5 px-4 text-xs sm:text-sm font-bold rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-md transition-all transform hover:scale-[1.02]"
            >
              👉 {t('widget.turing.vote', { terminal: terminalName('Terminal B') })}
            </button>
          ) : (
            <div className="mt-3 text-[11px] text-center font-medium text-slate-400">
              {t(scenario.correctAnswer === 'Terminal B' ? 'widget.turing.identifiedAi' : 'widget.turing.identifiedHuman')}
            </div>
          )}
        </div>
      </div>

      {/* Reveal Mystery Card */}
      {isRevealed && (
        <div className={`p-5 rounded-2xl border-2 transition-all duration-300 relative z-10 shadow-lg ${
          isCorrect
            ? 'border-emerald-500/80 bg-emerald-500/15 text-emerald-100 ring-2 ring-emerald-500/30'
            : 'border-amber-500/80 bg-amber-500/15 text-amber-100 ring-2 ring-amber-500/30'
        }`}>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
            <span className="text-base sm:text-lg font-black flex items-center gap-2">
              {t(isCorrect ? 'widget.turing.spotOn' : 'widget.turing.fooled')} {t('widget.turing.youSelected', { choice: terminalName(selected ?? '') })}
            </span>
            <button
              onClick={handleReset}
              className="px-3.5 py-1.5 rounded-xl bg-white text-slate-900 hover:bg-slate-100 text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 transform hover:scale-105"
            >
              {t('widget.turing.playAgain')}
            </button>
          </div>
          <p className="text-xs sm:text-sm leading-relaxed opacity-95">
            <strong className="text-white">{t('widget.turing.why')}</strong> {scenario.explanation}
          </p>
        </div>
      )}
    </div>
  )
}
