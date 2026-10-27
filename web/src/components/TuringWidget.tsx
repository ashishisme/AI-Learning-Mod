import React, { useState } from 'react'

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

export const TuringWidget: React.FC<Props> = ({
  title = "🎮 Mini-Game: Can You Spot the Bot?",
  instruction = "Read the dialogue below and decide which participant is the AI!",
  scenario,
}) => {
  const [selected, setSelected] = useState<string | null>(null)

  const isRevealed = selected !== null
  const isCorrect = selected === scenario.correctAnswer

  const handleReset = () => {
    setSelected(null)
  }

  return (
    <div className="my-8 p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-md">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          {title}
        </h4>
        <span className="text-[11px] font-semibold uppercase px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
          Interactive Simulation
        </span>
      </div>

      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-5">
        {instruction}
      </p>

      {/* Simulated User Inquiry */}
      <div className="mb-6 p-3.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40">
        <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 block mb-1">
          Interrogator asks both terminals:
        </span>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 italic">
          "{scenario.userPrompt}"
        </p>
      </div>

      {/* Side-by-Side Terminals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Terminal A */}
        <div
          className={`p-4 rounded-xl border-2 transition-all flex flex-col justify-between ${
            isRevealed && scenario.correctAnswer === 'Terminal A'
              ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/30'
              : selected === 'Terminal A'
              ? 'border-blue-500 bg-white dark:bg-slate-800'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 hover:border-slate-300'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                📟 Terminal A
              </span>
              {isRevealed && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    scenario.correctAnswer === 'Terminal A'
                      ? 'bg-purple-100 dark:bg-purple-900/70 text-purple-700 dark:text-purple-300'
                      : 'bg-emerald-100 dark:bg-emerald-900/70 text-emerald-700 dark:text-emerald-300'
                  }`}
                >
                  {scenario.correctAnswer === 'Terminal A' ? '🤖 AI Machine' : '👤 Human'}
                </span>
              )}
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-mono">
              "{scenario.terminalA}"
            </p>
          </div>

          {!isRevealed && (
            <button
              onClick={() => setSelected('Terminal A')}
              className="mt-4 w-full py-2 px-3 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-blue-600 hover:text-white dark:bg-slate-700 dark:hover:bg-blue-600 text-slate-700 dark:text-slate-200 transition-colors shadow-sm"
            >
              👉 Vote: Terminal A is AI
            </button>
          )}
        </div>

        {/* Terminal B */}
        <div
          className={`p-4 rounded-xl border-2 transition-all flex flex-col justify-between ${
            isRevealed && scenario.correctAnswer === 'Terminal B'
              ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/30'
              : selected === 'Terminal B'
              ? 'border-blue-500 bg-white dark:bg-slate-800'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 hover:border-slate-300'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                📟 Terminal B
              </span>
              {isRevealed && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    scenario.correctAnswer === 'Terminal B'
                      ? 'bg-purple-100 dark:bg-purple-900/70 text-purple-700 dark:text-purple-300'
                      : 'bg-emerald-100 dark:bg-emerald-900/70 text-emerald-700 dark:text-emerald-300'
                  }`}
                >
                  {scenario.correctAnswer === 'Terminal B' ? '🤖 AI Machine' : '👤 Human'}
                </span>
              )}
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-mono">
              "{scenario.terminalB}"
            </p>
          </div>

          {!isRevealed && (
            <button
              onClick={() => setSelected('Terminal B')}
              className="mt-4 w-full py-2 px-3 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-blue-600 hover:text-white dark:bg-slate-700 dark:hover:bg-blue-600 text-slate-700 dark:text-slate-200 transition-colors shadow-sm"
            >
              👉 Vote: Terminal B is AI
            </button>
          )}
        </div>
      </div>

      {/* Reveal Card */}
      {isRevealed && (
        <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm animate-fadeIn">
          <div className="flex items-center justify-between mb-2">
            <span
              className={`text-sm font-bold flex items-center gap-1.5 ${
                isCorrect
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-amber-600 dark:text-amber-400'
              }`}
            >
              {isCorrect ? '🎉 Spot On!' : '🤖 Fooled by the Bot!'} You selected {selected}.
            </span>
            <button
              onClick={handleReset}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              🔄 Play Again
            </button>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            <strong className="text-slate-900 dark:text-white">Why:</strong> {scenario.explanation}
          </p>
        </div>
      )}
    </div>
  )
}
