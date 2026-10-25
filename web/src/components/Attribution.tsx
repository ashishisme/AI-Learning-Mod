// SPEC: FR-ATT-01, NFR-LIC-01, AC-26
import React from 'react'

export const Attribution: React.FC = () => {
  return (
    <footer
      data-testid="attribution-footer"
      className="mt-20 py-8 border-t border-slate-200/80 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 text-center text-xs text-slate-500 dark:text-slate-400"
    >
      <div className="max-w-5xl mx-auto px-4">
        <p className="leading-relaxed">
          Curriculum based on{' '}
          <a
            href="https://github.com/microsoft/AI-For-Beginners"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 underline decoration-slate-300 dark:decoration-slate-600 hover:decoration-blue-600 underline-offset-2 transition-colors"
          >
            microsoft/AI-For-Beginners
          </a>{' '}
          (MIT License). Not affiliated with Microsoft.
        </p>
      </div>
    </footer>
  )
}
