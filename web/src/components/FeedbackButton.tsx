import React, { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAuthStore, useRuntimeStore } from '../store'
import { FeedbackDialog } from './FeedbackDialog'
import { useT } from '../i18n'

export const FeedbackButton: React.FC = () => {
  const enabled = useRuntimeStore((s) => s.feedbackEnabled)
  const signedIn = useAuthStore((s) => s.status === 'authenticated')
  const [open, setOpen] = useState(false)
  const t = useT()
  const trigger = useRef<HTMLButtonElement>(null)
  const close = () => { setOpen(false); requestAnimationFrame(() => trigger.current?.focus()) }
  if (!enabled || !signedIn) return null
  return <><button ref={trigger} type="button" onClick={() => setOpen(true)} className="min-h-11 px-3 rounded border border-slate-400 dark:border-slate-500 text-slate-800 dark:text-slate-100 focus-visible:ring-2 focus-visible:ring-blue-600">{t('feedback.button')}</button>{open && createPortal(<FeedbackDialog close={close} />, document.body)}</>
}
