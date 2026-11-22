// SPEC-008 US1 (FR-004): invite activation. Nothing is called on load; activation is a button-triggered POST.
import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { activateInvite, refreshAuthSession, ApiError } from '../api'
import { formatDate, rich, t, useT } from '../i18n'

interface Creds {
  betaId: string
  password: string
  expiresAt: string
}

function errorText(err: unknown): string {
  if (err instanceof ApiError) {
    switch (err.code) {
      case 'invite_used':
        return t('invite.used')
      case 'invite_expired':
      case 'invite_revoked':
      case 'invite_invalid':
        return t('invite.invalid')
      case 'rate_limited':
        return t('invite.rateLimited')
    }
    return err.message
  }
  return t('auth.offline')
}

export async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
    return
  } catch {
    /* fall back below */
  }
  const ta = document.createElement('textarea')
  ta.value = text
  ta.setAttribute('readonly', '')
  ta.style.position = 'fixed'
  ta.style.opacity = '0'
  document.body.appendChild(ta)
  ta.select()
  document.execCommand('copy')
  document.body.removeChild(ta)
}

// The saved file and clipboard text carry the same labels the learner sees.
const credsText = (c: Creds) => `${t('auth.betaId')}: ${c.betaId}\n${t('auth.password')}: ${c.password}`

const btn =
  'min-h-11 min-w-11 px-4 rounded-lg border border-slate-400 dark:border-slate-500 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600'
const primary =
  'min-h-11 px-5 rounded-lg bg-blue-700 hover:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-600'

export const Invite: React.FC = () => {
  const { token = '' } = useParams()
  const navigate = useNavigate()
  const tr = useT()
  const [creds, setCreds] = useState<Creds | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState<string>('')
  const [saved, setSaved] = useState(false)

  // The password lives only in this component's state.
  useEffect(() => () => setCreds(null), [])

  const activate = async () => {
    setBusy(true)
    setError('')
    try {
      setCreds(await activateInvite(token))
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  const copy = async (key: 'betaId' | 'password' | 'both') => {
    if (!creds) return
    const text =
      key === 'both'
        ? credsText(creds)
        : creds[key]
    await copyText(text)
    setCopied(key)
    if (key !== 'betaId') setSaved(true)
  }

  const download = () => {
    if (!creds) return
    const blob = new Blob([credsText(creds) + '\n'], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'beta-login.txt'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setSaved(true)
  }

  const done = async () => {
    setCreds(null)
    await refreshAuthSession()
    navigate('/')
  }

  if (creds) {
    const exp = new Date(creds.expiresAt)
    const date = formatDate(exp, { day: 'numeric', month: 'long', year: 'numeric' })
    const months = Math.max(1, Math.round((exp.getTime() - Date.now()) / (30.44 * 86400000)))
    const field = (label: string, value: string, key: 'betaId' | 'password') => (
      <div className="mb-4">
        <div className="text-sm font-semibold mb-1">{label}</div>
        <div className="flex flex-wrap items-center gap-2">
          <code data-testid={`invite-${key}`} className="flex-1 min-w-0 break-all px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-lg sm:text-xl font-mono">
            {value}
          </code>
          <button type="button" className={btn} onClick={() => copy(key)}>
            {tr(copied === key || (key === 'password' && copied === 'both') ? 'invite.copied' : key === 'betaId' ? 'invite.copyBetaId' : 'invite.copyPassword')}
          </button>
        </div>
      </div>
    )
    return (
      <div className="max-w-xl mx-auto px-4 py-10" data-testid="invite-credentials">
        <h1 className="text-2xl font-bold mb-4">{tr('invite.ready')}</h1>
        {field(tr('auth.betaId'), creds.betaId, 'betaId')}
        {field(tr('auth.password'), creds.password, 'password')}
        <p className="mb-4 text-sm">
          {rich(tr('invite.validUntil', { date, months: tr('invite.months', { count: months }) }))}
        </p>
        <p role="alert" className="mb-4 p-3 rounded-lg border border-amber-400 bg-amber-50 dark:bg-amber-950 text-amber-950 dark:text-amber-100 text-sm">
          {tr('invite.onceWarning')}
        </p>
        <div className="flex flex-wrap gap-2 mb-4">
          <button type="button" className={btn} onClick={() => copy('both')}>
            {tr(copied === 'both' ? 'invite.copiedBoth' : 'invite.copyBoth')}
          </button>
          <button type="button" className={btn} onClick={download}>
            {tr('invite.download')}
          </button>
        </div>
        <button type="button" data-testid="invite-saved" className={primary} disabled={!saved} onClick={done}>
          {tr('invite.saved')}
        </button>
        {!saved && <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{tr('invite.savePrompt')}</p>}
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-3">{tr('invite.title')}</h1>
      <p className="mb-6 text-sm">
        {tr('invite.body')}
      </p>
      {error && (
        <p role="alert" data-testid="invite-error" className="mb-4 text-sm font-medium text-red-800 dark:text-red-300">
          {error}{' '}
          <Link to="/" className="underline">
            {tr('invite.goSignIn')}
          </Link>
        </p>
      )}
      <button type="button" data-testid="invite-activate" className={primary} disabled={busy} onClick={activate}>
        {tr(busy ? 'invite.activating' : 'invite.activate')}
      </button>
    </div>
  )
}
