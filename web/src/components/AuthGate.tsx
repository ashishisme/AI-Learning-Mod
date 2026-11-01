// SPEC-008 US1: shows sign-in instead of the app when the server requires it. Invite and admin routes pass through.
import React, { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { SignIn } from '../pages/SignIn'
import { logout, refreshAuthSession } from '../api'
import { useAuthStore, useRuntimeStore } from '../store'

export const AuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { pathname } = useLocation()
  const loaded = useRuntimeStore((s) => s.loaded)
  const authRequired = useRuntimeStore((s) => s.authRequired)
  const status = useAuthStore((s) => s.status)

  useEffect(() => {
    if (loaded && authRequired) void refreshAuthSession()
  }, [loaded, authRequired])

  if (pathname.startsWith('/invite/') || pathname.startsWith('/admin')) return <>{children}</>
  if (!loaded || (authRequired && status === 'loading')) {
    return (
      <div role="status" aria-live="polite" data-testid="auth-loading" className="p-10 text-center text-sm text-slate-700 dark:text-slate-300">
        Loading...
      </div>
    )
  }
  if (authRequired && status !== 'authenticated') return <SignIn />
  return <>{children}</>
}

export const SignOutControl: React.FC = () => {
  const authRequired = useRuntimeStore((s) => s.authRequired)
  const { status, betaId } = useAuthStore()
  const [open, setOpen] = useState(false)
  const firstRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    firstRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  if (!authRequired || status !== 'authenticated') return null

  const signOut = async (clear: boolean) => {
    if (clear) {
      try {
        localStorage.removeItem('ai-foundations-progress')
      } catch {
        /* storage unavailable */
      }
    }
    try {
      await logout()
    } catch {
      /* the cookie may already be gone */
    }
    setOpen(false)
    useAuthStore.getState().clearSession()
  }

  const cls =
    'min-h-11 px-4 rounded-lg border border-slate-400 dark:border-slate-500 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600'
  return (
    <>
      <span data-testid="header-betaid" className="hidden sm:inline font-mono text-xs text-slate-700 dark:text-slate-300">
        {betaId}
      </span>
      <button type="button" data-testid="signout-btn" className={cls} onClick={() => setOpen(true)}>
        Sign out
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="signout-title" data-testid="signout-dialog" className="w-full max-w-sm rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-5 shadow-xl">
            <h2 id="signout-title" className="text-lg font-bold mb-3">
              Sign out?
            </h2>
            <div className="flex flex-col gap-2">
              <button ref={firstRef} type="button" data-testid="signout-confirm" className={cls} onClick={() => signOut(false)}>
                Sign out
              </button>
              <button type="button" data-testid="signout-clear" className={cls} onClick={() => signOut(true)}>
                Sign out and clear my progress on this device
              </button>
              <button type="button" className={cls} onClick={() => setOpen(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
