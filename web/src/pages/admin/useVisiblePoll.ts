import { useEffect, useState } from 'react'

export function useVisiblePoll<T>(load: () => Promise<T>, dependencies: unknown[]) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let live = true
    const refresh = () => {
      if (document.visibilityState !== 'visible') return
      void load().then((value) => { if (live) { setData(value); setError('') } })
        .catch((e) => { if (live) setError(e instanceof Error ? e.message : 'Could not load data') })
    }
    refresh()
    document.addEventListener('visibilitychange', refresh)
    const timer = window.setInterval(refresh, 30_000)
    return () => { live = false; window.clearInterval(timer); document.removeEventListener('visibilitychange', refresh) }
    // The caller supplies dependencies for the request parameters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies)
  return { data, error }
}
