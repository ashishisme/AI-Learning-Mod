import React, { useState } from 'react'

interface Props {
  term: string
  explanation: string
}

export const JargonBusterTooltip: React.FC<Props> = ({ term, explanation }) => {
  const [open, setOpen] = useState(false)

  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="font-semibold text-blue-600 dark:text-blue-400 border-b-2 border-dotted border-blue-400 dark:border-blue-500 cursor-help focus:outline-none focus:ring-1 focus:ring-blue-400 rounded px-0.5"
      >
        {term}
      </button>

      {open && (
        <span
          role="tooltip"
          className="absolute z-30 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-3 rounded-xl bg-slate-900 text-white text-xs shadow-xl leading-relaxed animate-fadeIn pointer-events-none"
        >
          <span className="block font-bold text-amber-300 mb-1">💡 Jargon Buster: {term}</span>
          <span className="block text-slate-200">{explanation}</span>
          <span className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-slate-900"></span>
        </span>
      )}
    </span>
  )
}
