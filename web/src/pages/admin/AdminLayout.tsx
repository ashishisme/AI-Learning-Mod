// SPEC-008 US2: admin shell. GET /api/admin/me decides between organisation sign-in and the console.
import React, { useCallback, useEffect, useState } from 'react'
import { NavLink, Route, Routes, useNavigate, useSearchParams } from 'react-router-dom'
import { adminLogout, adminMe, fetchFeedback } from '../../adminApi'
import { ApiError } from '../../api'
import { UsersInvites } from './UsersInvites'
import { Audit } from './Audit'
import { Overview } from './Overview'
import { Usage } from './Usage'
import { Costs } from './Costs'
import { FeedbackInbox } from './FeedbackInbox'

const ERRORS: Record<string, string> = {
  state: 'The sign-in link expired. Please try again.',
  token: 'Sign-in could not be completed. Please try again.',
  not_allowed: 'This account is not on the admin list.',
  mfa_required: 'Your organisation requires multi-factor sign-in for admins.',
}

const TABS: Array<[string, string, boolean]> = [
  ['/admin', 'Overview', true],
  ['/admin/users', 'Users and Invites', false],
  ['/admin/usage', 'Usage', false],
  ['/admin/costs', 'Costs', false],
  ['/admin/feedback', 'Feedback', false],
  ['/admin/audit', 'Audit', false],
]

const tabCls = ({ isActive }: { isActive: boolean }) =>
  `inline-flex items-center min-h-11 px-4 text-sm font-semibold border-b-2 whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
    isActive
      ? 'border-blue-700 dark:border-blue-400 text-blue-800 dark:text-blue-300'
      : 'border-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
  }`

const Later: React.FC<{ title: string }> = ({ title }) => (
  <section aria-labelledby="later-h" className="rounded-lg border border-slate-300 dark:border-slate-700 p-6">
    <h2 id="later-h" className="text-lg font-bold mb-1">{title}</h2>
    <p data-testid="coming-later" className="text-sm text-slate-700 dark:text-slate-300">Coming in a later release.</p>
  </section>
)

export const AdminLayout: React.FC = () => {
  const [me, setMe] = useState<{ email: string } | null>(null)
  const [state, setState] = useState<'loading' | 'out' | 'in' | 'unavailable'>('loading')
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const errorKey = params.get('error')
  const [outError, setOutError] = useState('')
  const [feedbackUnread, setFeedbackUnread] = useState(0)

  useEffect(() => {
    const expired = () => { setMe(null); setState('out'); navigate('/admin', { replace: true }) }
    window.addEventListener('admin-session-expired', expired)
    return () => window.removeEventListener('admin-session-expired', expired)
  }, [navigate])

  useEffect(() => {
    if (state !== 'in') return
    let live = true
    const refresh = () => {
      if (document.visibilityState !== 'visible') return
      void fetchFeedback({ limit: 1 }).then((value) => {
        if (live) setFeedbackUnread((value as { unread: number }).unread)
      }).catch(() => {})
    }
    refresh()
    const timer = window.setInterval(refresh, 30_000)
    return () => { live = false; window.clearInterval(timer) }
  }, [state])

  useEffect(() => {
    adminMe()
      .then((m) => {
        setMe(m)
        setState('in')
      })
      .catch((e: unknown) => {
        const status = (e as { status?: number })?.status
        const isUnauthorized = e instanceof ApiError ? e.status === 401 : status === 401
        setState(isUnauthorized ? 'out' : 'unavailable')
      })
  }, [])

  const signOut = useCallback(async () => {
    try {
      await adminLogout()
    } catch {
      /* the cookie may already be gone */
    }
    setMe(null)
    setOutError('')
    setState('out')
    navigate('/admin', { replace: true })
  }, [navigate])

  if (state === 'loading') {
    return <div role="status" className="p-10 text-center text-sm text-slate-700 dark:text-slate-300">Loading...</div>
  }
  if (state === 'unavailable') {
    return (
      <div className="max-w-md mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold mb-2">Admin console</h1>
        <p role="alert" data-testid="admin-unavailable" className="text-sm font-medium text-red-800 dark:text-red-300">
          The admin console is not available right now.
        </p>
      </div>
    )
  }
  if (state === 'out') {
    const msg = outError || (errorKey ? ERRORS[errorKey] ?? ERRORS.token : '')
    return (
      <div className="max-w-md mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold tracking-tight mb-2">Admin sign-in</h1>
        <p className="mb-4 text-sm text-slate-700 dark:text-slate-300">Sign in with your organisation account to manage the beta.</p>
        {msg && (
          <p role="alert" data-testid="admin-signin-error" className="mb-4 p-3 rounded-lg border border-red-400 bg-red-50 dark:bg-red-950 text-red-900 dark:text-red-100 text-sm font-medium">
            {msg}
          </p>
        )}
        <a
          href="/api/auth/admin/login"
          data-testid="admin-signin-link"
          className="inline-flex items-center justify-center min-h-11 px-5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-600"
        >
          Sign in with your organisation
        </a>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="text-xl font-bold tracking-tight">Admin console</h1>
        <div className="flex items-center gap-3">
          <span data-testid="admin-email" className="text-sm text-slate-700 dark:text-slate-300">{me?.email}</span>
          <button
            type="button"
            data-testid="admin-signout"
            onClick={signOut}
            className="min-h-11 px-4 rounded-lg border border-slate-400 dark:border-slate-500 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            Sign out
          </button>
        </div>
      </div>
      <nav aria-label="Admin sections" className="mb-6 flex overflow-x-auto border-b border-slate-300 dark:border-slate-700">
        {TABS.map(([to, label, end]) => (
          <NavLink key={to} to={to} end={end} className={tabCls}>
            {label}{label === 'Feedback' && feedbackUnread > 0 ? ` (${feedbackUnread})` : ''}
          </NavLink>
        ))}
      </nav>
      <Routes>
        <Route index element={<Overview />} />
        <Route path="users" element={<UsersInvites />} />
        <Route path="usage" element={<Usage />} />
        <Route path="costs" element={<Costs />} />
        <Route path="feedback" element={<FeedbackInbox unreadChanged={setFeedbackUnread} />} />
        <Route path="audit" element={<Audit />} />
        <Route path="*" element={<Later title="Not found" />} />
      </Routes>
    </div>
  )
}
