// SPEC-008 US1: sign-in screen and public landing notice. No signup: accounts come from invite links.
import React, { useState } from 'react'
import { login, ApiError, AuthSessionResponse } from '../api'
import { useAuthStore, AuthSessionInfo } from '../store'
import { t, useT } from '../i18n'

function messageFor(err: unknown): string {
  if (err instanceof ApiError) {
    switch (err.code) {
      case 'locked':
        return t('auth.locked')
      case 'rate_limited':
        return t('auth.rateLimited')
      case 'bad_credentials':
      case 'account_expired':
      case 'account_revoked':
        return err.message
    }
    return err.message
  }
  return t('auth.offline')
}

const inputCls =
  'w-full min-h-11 px-3 rounded-lg border border-slate-400 dark:border-slate-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600'

export const SignIn: React.FC = () => {
  const notice = useAuthStore((s) => s.message)
  const tr = useT()
  const [betaId, setBetaId] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const s: AuthSessionResponse = await login(betaId.trim(), password)
      useAuthStore.getState().setSession(s as AuthSessionInfo)
    } catch (err) {
      setError(messageFor(err))
      setBusy(false)
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight mb-2">{tr('auth.signInTitle')}</h1>
      <p
        data-testid="invite-only-notice"
        className="mb-6 p-3 rounded-lg border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950 text-blue-950 dark:text-blue-100 text-sm"
      >
        {tr('auth.inviteOnly')}
      </p>
      {notice && (
        <p role="status" data-testid="signin-message" className="mb-4 p-3 rounded-lg border border-amber-400 bg-amber-50 dark:bg-amber-950 text-amber-950 dark:text-amber-100 text-sm">
          {notice}
        </p>
      )}
      <form data-testid="signin-form" onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="signin-betaid" className="block text-sm font-semibold mb-1">
            {tr('auth.betaId')}
          </label>
          <input
            id="signin-betaid"
            data-testid="signin-betaid"
            className={inputCls}
            type="text"
            autoComplete="username"
            autoCapitalize="characters"
            spellCheck={false}
            required
            value={betaId}
            onChange={(e) => setBetaId(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="signin-password" className="block text-sm font-semibold mb-1">
            {tr('auth.password')}
          </label>
          <div className="flex gap-2">
            <input
              id="signin-password"
              data-testid="signin-password"
              className={inputCls}
              type={show ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShow(!show)}
              aria-pressed={show}
              className="min-h-11 min-w-11 px-3 rounded-lg border border-slate-400 dark:border-slate-500 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              {tr(show ? 'auth.hide' : 'auth.show')}
            </button>
          </div>
        </div>
        {error && (
          <p role="alert" data-testid="signin-error" className="text-sm font-medium text-red-800 dark:text-red-300">
            {error}
          </p>
        )}
        <button
          type="submit"
          data-testid="signin-submit"
          disabled={busy}
          className="w-full min-h-11 rounded-lg bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-600"
        >
          {tr(busy ? 'auth.signingIn' : 'auth.signIn')}
        </button>
      </form>
    </div>
  )
}
