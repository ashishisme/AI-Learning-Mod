// SPEC-008 US1 (FR-004): invite activation. Nothing is called on load; activation is a button-triggered POST.
import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { activateInvite, refreshAuthSession, ApiError } from '../api'

interface Creds {
  betaId: string
  password: string
  expiresAt: string
}

function errorText(err: unknown): string {
  if (err instanceof ApiError) {
    switch (err.code) {
      case 'invite_used':
        return 'This invite has already been used. Please sign in.'
      case 'invite_expired':
      case 'invite_revoked':
      case 'invite_invalid':
        return 'This invite link cannot be used any more. Please ask your teacher or admin for a new link.'
      case 'rate_limited':
        return 'Too many requests. Please try again shortly.'
    }
    return err.message
  }
  return 'Could not reach the server. Check your connection and try again.'
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

const btn =
  'min-h-11 min-w-11 px-4 rounded-lg border border-slate-400 dark:border-slate-500 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600'
const primary =
  'min-h-11 px-5 rounded-lg bg-blue-700 hover:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-600'

export const Invite: React.FC = () => {
  const { token = '' } = useParams()
  const navigate = useNavigate()
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
        ? `Beta ID: ${creds.betaId}\nPassword: ${creds.password}`
        : creds[key]
    await copyText(text)
    setCopied(key)
    if (key !== 'betaId') setSaved(true)
  }

  const download = () => {
    if (!creds) return
    const blob = new Blob([`Beta ID: ${creds.betaId}\nPassword: ${creds.password}\n`], { type: 'text/plain' })
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
    const date = exp.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'long', year: 'numeric' })
    const months = Math.max(1, Math.round((exp.getTime() - Date.now()) / (30.44 * 86400000)))
    const field = (label: string, value: string, key: 'betaId' | 'password') => (
      <div className="mb-4">
        <div className="text-sm font-semibold mb-1">{label}</div>
        <div className="flex flex-wrap items-center gap-2">
          <code data-testid={`invite-${key}`} className="flex-1 min-w-0 break-all px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-lg sm:text-xl font-mono">
            {value}
          </code>
          <button type="button" className={btn} onClick={() => copy(key)}>
            {copied === key || (key === 'password' && copied === 'both') ? 'Copied' : `Copy ${key === 'betaId' ? 'Beta ID' : 'password'}`}
          </button>
        </div>
      </div>
    )
    return (
      <div className="max-w-xl mx-auto px-4 py-10" data-testid="invite-credentials">
        <h1 className="text-2xl font-bold mb-4">Your account is ready</h1>
        {field('Beta ID', creds.betaId, 'betaId')}
        {field('Password', creds.password, 'password')}
        <p className="mb-4 text-sm">
          Your account is valid until <strong>{date} (IST)</strong> ({months} {months === 1 ? 'month' : 'months'} from today).
        </p>
        <p role="alert" className="mb-4 p-3 rounded-lg border border-amber-400 bg-amber-50 dark:bg-amber-950 text-amber-950 dark:text-amber-100 text-sm">
          This password is shown only once. It cannot be looked up again, so save it now before you leave this page.
        </p>
        <div className="flex flex-wrap gap-2 mb-4">
          <button type="button" className={btn} onClick={() => copy('both')}>
            {copied === 'both' ? 'Copied both' : 'Copy both'}
          </button>
          <button type="button" className={btn} onClick={download}>
            Download as text file
          </button>
        </div>
        <button type="button" data-testid="invite-saved" className={primary} disabled={!saved} onClick={done}>
          I&apos;ve saved it
        </button>
        {!saved && <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">Copy the password or download the file to continue.</p>}
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-3">Activate your beta account</h1>
      <p className="mb-6 text-sm">
        You have been invited to the Foundations Coach beta. Press the button to create your account. You will be shown a
        Beta ID and a password once, so have somewhere ready to save them.
      </p>
      {error && (
        <p role="alert" data-testid="invite-error" className="mb-4 text-sm font-medium text-red-800 dark:text-red-300">
          {error}{' '}
          <Link to="/" className="underline">
            Go to sign in
          </Link>
        </p>
      )}
      <button type="button" data-testid="invite-activate" className={primary} disabled={busy} onClick={activate}>
        {busy ? 'Activating...' : 'Activate my account'}
      </button>
    </div>
  )
}
