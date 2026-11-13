// SPEC: FR-UI-21 (SPEC-012 FR-010..FR-012). A bold Kids word that opens its Jargon Buster card in place.
// Everything is a <span> because the word sits inside a Markdown paragraph.
import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { JargonEntry } from '../api'
import { AudioNarrationButton } from './AudioNarrationButton'
import { useT } from '../i18n'

interface Props {
  entry: JargonEntry
  children: React.ReactNode
  open: boolean
  onOpen: () => void
  onClose: () => void
  speechLang?: string
}

const GUTTER = 8 // px kept between the card and the screen edge

export const WordCard: React.FC<Props> = ({ entry, children, open, onOpen, onClose, speechLang }) => {
  const t = useT()
  const wrap = useRef<HTMLSpanElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const card = useRef<HTMLSpanElement>(null)
  const [shift, setShift] = useState(0)
  const [imgFailed, setImgFailed] = useState(false)
  const id = `word-card-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}` // unique for any script, Hindi included

  const close = () => {
    onClose()
    trigger.current?.focus()
  }

  // Escape or a tap outside closes the card; focus goes back to the word.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        close()
      }
    }
    const onDown = (e: PointerEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) {
        onClose()
        // Return focus to the word unless the tap moved it somewhere else on purpose.
        requestAnimationFrame(() => {
          if (document.activeElement === document.body || !document.activeElement) trigger.current?.focus()
        })
      }
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
    }
  })

  // Keep the card inside the screen, down to 320 px wide.
  useLayoutEffect(() => {
    if (!open || !card.current) {
      setShift(0) // the next open measures from the card's natural place
      return
    }
    const r = card.current.getBoundingClientRect()
    const right = window.innerWidth - GUTTER
    if (r.right > right) setShift(right - r.right)
    else if (r.left < GUTTER) setShift(GUTTER - r.left)
  }, [open])

  return (
    <span ref={wrap} className="relative inline">
      <button
        ref={trigger}
        type="button"
        data-testid={`word-${entry.term}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => (open ? close() : onOpen())}
        className="inline-flex items-center min-h-[44px] min-w-[44px] px-1 -my-2 align-baseline font-bold text-blue-800 dark:text-sky-300 underline decoration-dotted decoration-2 underline-offset-4 rounded-md hover:bg-blue-50 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
      >
        {children}
      </button>
      {open && (
        <span
          ref={card}
          id={id}
          role="dialog"
          aria-label={entry.term}
          style={{ transform: `translateX(${shift}px)` }}
          className="absolute left-0 top-full z-30 mt-1 block w-[min(18rem,calc(100vw-16px))] p-4 rounded-2xl bg-white dark:bg-slate-900 border-2 border-amber-300 dark:border-amber-600 shadow-xl text-left not-prose"
        >
          <span className="flex items-start justify-between gap-2">
            <span className="block text-base font-bold text-slate-900 dark:text-white">{entry.term}</span>
            <button
              type="button"
              onClick={close}
              aria-label={t('adaptive.closeWord')}
              className="flex-shrink-0 min-h-[44px] min-w-[44px] -mt-2 -mr-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              ✕
            </button>
          </span>
          {entry.visual && !imgFailed && (
            <img
              src={`/brand/words/${entry.visual}.svg`}
              alt={t('adaptive.wordPicture', { term: entry.term })}
              width={240}
              height={140}
              onError={() => setImgFailed(true)}
              className="block w-full h-auto my-2 rounded-xl bg-amber-50 dark:bg-slate-800"
            />
          )}
          <span className="block text-sm leading-relaxed text-slate-800 dark:text-slate-100">{entry.simpleExplanation}</span>
          <span className="block mt-2">
            <AudioNarrationButton
              id={`${id}-listen`}
              textToRead={`${entry.term}. ${entry.simpleExplanation}`}
              speechLang={speechLang}
              variant="pill"
            />
          </span>
        </span>
      )}
    </span>
  )
}
