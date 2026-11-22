import React, { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAuthStore, useRuntimeStore } from '../store'
import { FeedbackDialog, type WordingPlace } from './FeedbackDialog'
import { useT } from '../i18n'

// Shown only where feedback is on and the learner is signed in (FR-047; SPEC-016 FR-004).
const useFeedbackOn = () => {
  const enabled = useRuntimeStore((s) => s.feedbackEnabled)
  const signedIn = useAuthStore((s) => s.status === 'authenticated')
  return enabled && signedIn
}

const Opener: React.FC<{ label: string; className: string; place?: WordingPlace; testId?: string }> = ({ label, className, place, testId }) => {
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const close = () => { setOpen(false); requestAnimationFrame(() => trigger.current?.focus()) }
  return <><button ref={trigger} type="button" data-testid={testId} onClick={() => setOpen(true)} className={className}>{label}</button>{open && createPortal(<FeedbackDialog close={close} place={place} />, document.body)}</>
}

export const FeedbackButton: React.FC = () => {
  const t = useT()
  if (!useFeedbackOn()) return null
  return <Opener label={t('feedback.button')} className="min-h-11 px-3 rounded border border-slate-400 dark:border-slate-500 text-slate-800 dark:text-slate-100 focus-visible:ring-2 focus-visible:ring-blue-600" />
}

// "Report a wording problem" for one section, clip step or (Kids) the whole lesson. SPEC-016 FR-004, FR-005.
export const ReportWordingButton: React.FC<{ place: WordingPlace }> = ({ place }) => {
  const t = useT()
  if (!useFeedbackOn()) return null
  return <Opener label={t('feedback.report')} place={place} testId="report-wording"
    className="min-h-11 min-w-11 px-3 text-sm underline underline-offset-2 text-slate-700 dark:text-slate-200 hover:text-blue-800 dark:hover:text-blue-300 rounded focus-visible:ring-2 focus-visible:ring-blue-600 break-words text-left" />
}
