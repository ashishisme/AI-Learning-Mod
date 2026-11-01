import React from 'react'
import { useHelpStore } from '../store'

export const Attribution: React.FC = () => {
  const { setHelpOpen } = useHelpStore()

  return (
    <footer
      data-testid="attribution-footer"
      className="mt-20 py-8 border-t border-slate-200/80 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 text-center text-xs text-slate-500 dark:text-slate-400"
    >
      <div className="max-w-5xl mx-auto px-4 space-y-2">
        <p className="font-medium text-slate-700 dark:text-slate-300">
          Developed and distributed as freeware by{' '}
          <strong className="text-slate-900 dark:text-white">Qunisphere Pvt Limited</strong>, Bangalore.
        </p>
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
          (MIT License). Not affiliated with Microsoft.{' '}
          <button
            onClick={() => setHelpOpen(true)}
            className="ml-2 font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
          >
            <span>❓</span>
            <span>Help & Setup Guide</span>
          </button>
        </p>
      </div>
    </footer>
  )
}
