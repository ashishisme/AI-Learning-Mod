// SPEC-008 US3 (FR-011): non-blocking reminder shown only when the learner's access ends within 7 days.
import React, { useState } from 'react'
import { useAuthStore } from '../store'
import { formatDate, useT } from '../i18n'

const KEY = 'expiry-banner-dismissed'

export const ExpiryBanner: React.FC = () => {
  const { status, expiringSoon, expiresAt, daysLeft } = useAuthStore()
  const t = useT()
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(KEY) === '1'
    } catch {
      return false
    }
  })
  if (status !== 'authenticated' || !expiringSoon || dismissed) return null
  const dismiss = () => {
    try {
      sessionStorage.setItem(KEY, '1')
    } catch {
      /* storage unavailable: dismissed for this view only */
    }
    setDismissed(true)
  }
  return (
    <div
      role="status"
      data-testid="expiry-banner"
      className="border-b border-amber-400 bg-amber-50 dark:bg-amber-950 text-amber-950 dark:text-amber-100"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-2 flex items-center justify-between gap-3 text-sm">
        <p>
          {t('expiry.notice', { date: expiresAt ? formatDate(expiresAt) : '', days: t('expiry.days', { count: daysLeft }) })}
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="min-h-11 min-w-11 px-3 rounded-lg border border-amber-700 dark:border-amber-300 font-semibold hover:bg-amber-100 dark:hover:bg-amber-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        >
          {t('expiry.dismiss')}
        </button>
      </div>
    </div>
  )
}
