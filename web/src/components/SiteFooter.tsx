// SPEC: FR-ATT-01 (amended by SPEC-013 FR-012, FR-015): the course is ours, so the footer names only its maker.
import React from 'react'
import { useHelpStore } from '../store'
import { useT } from '../i18n'

export const SiteFooter: React.FC = () => {
  const { setHelpOpen } = useHelpStore()
  const t = useT()

  // The company name is styled, so the sentence is split around its placeholder.
  const byline = t('widget.byline').split('{company}')

  return (
    <footer
      data-testid="site-footer"
      className="mt-20 py-8 border-t border-slate-200/80 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 text-center text-xs text-slate-500 dark:text-slate-400"
    >
      <div className="max-w-5xl mx-auto px-4 space-y-2">
        <p className="font-medium text-slate-700 dark:text-slate-300">
          {byline[0]}<strong className="text-slate-900 dark:text-white">Qunisphere Pvt Limited</strong>{byline[1]}
        </p>
        <p>
          <button
            onClick={() => setHelpOpen(true)}
            className="font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 min-h-[44px]"
          >
            <span>❓</span>
            <span>{t('widget.helpGuide')}</span>
          </button>
        </p>
      </div>
    </footer>
  )
}
