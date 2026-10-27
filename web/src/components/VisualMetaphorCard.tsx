import React from 'react'

interface Props {
  metaphorName: string
  description: string
  isJunior?: boolean
}

export const VisualMetaphorCard: React.FC<Props> = ({ metaphorName, description, isJunior = true }) => {
  // Render custom vector illustration accents based on metaphorName
  const renderIllustration = () => {
    if (metaphorName.toLowerCase().includes('martian puppy') || metaphorName.toLowerCase().includes('puppy')) {
      return (
        <div className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 bg-indigo-100 dark:bg-indigo-950/80 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl shadow-inner border border-indigo-200 dark:border-indigo-800">
          🛸🐶
        </div>
      )
    }

    if (metaphorName.toLowerCase().includes('chess') || metaphorName.toLowerCase().includes('wizard')) {
      return (
        <div className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 bg-purple-100 dark:bg-purple-950/80 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl shadow-inner border border-purple-200 dark:border-purple-800">
          🧙‍♂️♟️
        </div>
      )
    }

    if (metaphorName.toLowerCase().includes('calculator') || metaphorName.toLowerCase().includes('apprentice')) {
      return (
        <div className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 bg-blue-100 dark:bg-blue-950/80 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl shadow-inner border border-blue-200 dark:border-blue-800">
          📟👨‍🍳
        </div>
      )
    }

    if (metaphorName.toLowerCase().includes('rulebook') || metaphorName.toLowerCase().includes('photo')) {
      return (
        <div className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 bg-amber-100 dark:bg-amber-950/80 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl shadow-inner border border-amber-200 dark:border-amber-800">
          📚📸
        </div>
      )
    }

    return (
      <div className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 bg-blue-100 dark:bg-blue-950/80 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl shadow-inner">
        ✨💡
      </div>
    )
  }

  return (
    <div className="my-5 p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-indigo-50/80 via-blue-50/50 to-white dark:from-indigo-950/40 dark:via-slate-900 dark:to-slate-900 border-2 border-indigo-200/90 dark:border-indigo-800/60 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5">
      {renderIllustration()}
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-200/80 dark:bg-indigo-900/80 text-indigo-900 dark:text-indigo-200">
            {isJunior ? 'Fun Metaphor' : 'Everyday Analogy'}
          </span>
          <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
            Everyday Metaphor: {metaphorName}
          </h4>
        </div>
        <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
          {description}
        </p>
      </div>
    </div>
  )
}
