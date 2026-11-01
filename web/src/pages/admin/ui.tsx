// Small shared pieces for the admin console.
import React, { useCallback, useEffect, useRef, useState } from 'react'

export const btn =
  'min-h-11 min-w-11 px-4 rounded-lg border border-slate-400 dark:border-slate-500 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600'
export const primary =
  'min-h-11 px-5 rounded-lg bg-blue-700 hover:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-600'
export const field =
  'min-h-11 px-3 rounded-lg border border-slate-400 dark:border-slate-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600'
export const th = 'px-3 py-2 text-left font-semibold border-b border-slate-300 dark:border-slate-700 whitespace-nowrap'
export const td = 'px-3 py-2 border-b border-slate-200 dark:border-slate-800 align-top'

export function useLoad<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fn, deps)
  useEffect(() => {
    let live = true
    setLoading(true)
    run()
      .then((d) => live && (setData(d), setError('')))
      .catch((e) => live && setError(e instanceof Error ? e.message : 'Something went wrong.'))
      .finally(() => live && setLoading(false))
    return () => {
      live = false
    }
  }, [run, tick])
  return { data, error, loading, reload: () => setTick((t) => t + 1) }
}

export const ListState: React.FC<{ loading: boolean; error: string; empty: boolean; emptyText: string; onRetry: () => void; children: React.ReactNode }> = ({
  loading, error, empty, emptyText, onRetry, children,
}) => {
  if (error) {
    return (
      <p role="alert" className="text-sm font-medium text-red-800 dark:text-red-300">
        {error} <button type="button" className={btn} onClick={onRetry}>Try again</button>
      </p>
    )
  }
  if (loading && empty) return <p role="status" className="text-sm text-slate-700 dark:text-slate-300">Loading...</p>
  if (empty) return <p className="text-sm text-slate-700 dark:text-slate-300">{emptyText}</p>
  return <>{children}</>
}

export const Dialog: React.FC<{ title: string; onClose: () => void; children: React.ReactNode; testId?: string }> = ({ title, onClose, children, testId }) => {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('select, input, button')?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="dlg-title" data-testid={testId} className="w-full max-w-md rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-5 shadow-xl">
        <h2 id="dlg-title" className="text-lg font-bold mb-3">{title}</h2>
        {children}
      </div>
    </div>
  )
}

export const StatusText: React.FC<{ status: string }> = ({ status }) => (
  <span className="inline-block px-2 py-0.5 rounded border border-slate-500 dark:border-slate-400 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-semibold capitalize">
    {status}
  </span>
)
