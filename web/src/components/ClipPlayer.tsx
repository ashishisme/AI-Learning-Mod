// SPEC: FR-UI-28, FR-CNT-13 (SPEC-014 FR-005..FR-010, FR-012), AC-76, AC-78
// A step-by-step animated picture for a Detailed section. The drawing is shown as an image, one step at a
// time (`#sK`), so nothing from it runs in the page. Each step's caption is read aloud while the clip plays.
import React, { useEffect, useId, useRef, useState } from 'react'
import { useT } from '../i18n'
import { useAudioStore } from '../store'
import { useClipStore } from '../stores/clipStore'
import { speechService } from '../services/speechService'
import { speakTrack } from '../services/narration'

interface Props {
  clip: string
  caption?: string
  alt?: string
  steps: string[]
  // "<lessonId>/<mode>/section-<id>-clip-": the narration key of step n is this plus n.
  trackPrefix: string
  speechLang: string
}

export const STEP_MIN_MS = 2000 // a step's entrance animation lasts at most 2 s
export const STEP_GAP_MS = 600
// The muted hold: the time a caption takes to read, at 2.5 words a second, plus a second (FR-CNT-13).
export const holdMs = (text: string) => (text.split(/\s+/).filter(Boolean).length / 2.5 + 1) * 1000

const button =
  'min-h-[44px] min-w-[44px] px-4 py-2 rounded-xl text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 disabled:opacity-40'

export const ClipPlayer: React.FC<Props> = ({ clip, caption, alt, steps, trackPrefix, speechLang }) => {
  const t = useT()
  const descId = useId()
  const figureRef = useRef<HTMLElement>(null)
  // Bumped by every control: speech or a timer started for an older action then does nothing.
  const gen = useRef(0)
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [ended, setEnded] = useState(false)
  const [run, setRun] = useState(0)
  const [failed, setFailed] = useState(false)
  const clipsMuted = useClipStore((s) => s.clipsMuted)
  const toggleClipsMuted = useClipStore((s) => s.toggleClipsMuted)
  const narrationMuted = useAudioStore((s) => s.isMuted)
  const activeTrackId = useAudioStore((s) => s.activeTrackId)
  const muted = clipsMuted || narrationMuted
  const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const owner = `clip:${trackPrefix}` // the shared audio state's id for this clip, plus the step number
  const last = steps.length - 1

  // Let go of the shared audio state when this clip holds it.
  const release = () => {
    const audio = useAudioStore.getState()
    if (audio.activeTrackId?.startsWith(owner)) {
      speechService.stop()
      audio.stopAudio()
    }
  }

  // Read one step aloud (or not, when muted); call next when it has been read, or after the muted hold.
  const voice = (n: number, next?: () => void) => {
    const my = gen.current
    const isCurrent = () => my === gen.current && !!useAudioStore.getState().activeTrackId?.startsWith(owner)
    const id = owner + (n + 1)
    useAudioStore.getState().setActiveTrack(id, true)
    const started = Date.now()
    let moved = false
    const after = (ms: number) => {
      if (moved || !isCurrent()) return
      moved = true
      const wait = Math.max(ms, STEP_MIN_MS - (Date.now() - started))
      window.setTimeout(() => {
        if (!isCurrent()) return
        if (next) next()
        else if (useAudioStore.getState().activeTrackId === id) useAudioStore.getState().stopAudio()
      }, wait)
    }
    const hold = () => after(Math.max(0, holdMs(steps[n]) - (Date.now() - started)))
    if (muted) {
      hold()
      return
    }
    const { persona, speechRate } = useAudioStore.getState()
    speakTrack({
      text: steps[n],
      trackKey: trackPrefix + (n + 1),
      speechLang,
      persona: persona || 'alan',
      rate: speechRate,
      isCurrent,
      onEnd: () => after(STEP_GAP_MS),
      onError: hold,
      onUnavailable: hold,
    })
  }

  // Playing: read the current step, then move on (FR-UI-28).
  useEffect(() => {
    if (!playing) return
    const my = gen.current
    voice(step, () => {
      if (step < last) setStep(step + 1)
      else {
        setPlaying(false)
        setEnded(true)
        release()
      }
    })
    return () => {
      if (gen.current === my) gen.current++
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, step, muted])

  // One sound at a time: when Read section, the tutor or another clip takes over, pause here.
  // The store is read directly: this clip claims it inside the effect above, after this render.
  useEffect(() => {
    if (playing && !useAudioStore.getState().activeTrackId?.startsWith(owner)) setPlaying(false)
  }, [activeTrackId, playing, owner])

  // Pause when the clip leaves the screen, and stop when it leaves the page.
  useEffect(() => {
    const el = figureRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const seen = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting && useAudioStore.getState().activeTrackId?.startsWith(owner)) {
        gen.current++
        release()
        setPlaying(false)
      }
    })
    seen.observe(el)
    return () => seen.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(
    () => () => {
      gen.current++
      release()
    },
    [], // eslint-disable-line react-hooks/exhaustive-deps
  )

  const play = () => {
    speechService.stop()
    setEnded(false)
    setPlaying(true)
  }
  const pause = () => {
    gen.current++
    setPlaying(false)
    release()
  }
  const replay = () => {
    speechService.stop()
    setRun((r) => r + 1)
    setStep(0)
    setEnded(false)
    setPlaying(true)
  }
  // Previous and Next stop playing, show that step and read it once (FR-007).
  const go = (n: number) => {
    gen.current++
    setPlaying(false)
    speechService.stop()
    setEnded(false)
    setStep(n)
    setRun((r) => r + 1)
    voice(n)
  }
  const toggleMute = () => {
    if (!muted) speechService.stop()
    toggleClipsMuted()
  }

  return (
    <figure
      ref={figureRef}
      data-testid="clip"
      aria-describedby={alt ? descId : undefined}
      className="my-6 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm"
    >
      {alt && (
        <p id={descId} className="sr-only" data-testid="clip-description">
          {alt}
        </p>
      )}
      {failed ? (
        <ol className="p-4 sm:p-6 list-decimal list-inside space-y-2 text-sm text-slate-800 dark:text-slate-100" data-testid="clip-fallback">
          {steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
      ) : (
        <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-800/40">
          <img
            key={`${step}-${run}`}
            src={`/brand/clips/${clip}.svg#s${step + 1}`}
            alt=""
            width={320}
            height={180}
            loading="lazy"
            onError={() => setFailed(true)}
            data-testid="clip-image"
            className="block w-full max-w-xl h-auto mx-auto rounded-xl"
          />
        </div>
      )}
      <figcaption className="px-4 sm:px-6 pt-3">
        {caption && (
          <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            {caption}
          </span>
        )}
        <p aria-live="polite" data-testid="clip-caption" className="mt-2 text-sm sm:text-base text-slate-800 dark:text-slate-100 leading-snug">
          {steps[step]}
        </p>
      </figcaption>
      <div className="px-4 sm:px-6 py-3 flex flex-wrap items-center gap-2">
        {!reduceMotion &&
          (ended ? (
            <button type="button" data-testid="clip-replay" onClick={replay} className={`${button} bg-blue-700 hover:bg-blue-800 text-white`}>
              {t('widget.stepRestart')}
            </button>
          ) : (
            <button
              type="button"
              data-testid="clip-play"
              aria-pressed={playing}
              onClick={playing ? pause : play}
              className={`${button} bg-blue-700 hover:bg-blue-800 text-white`}
            >
              {t(playing ? 'widget.stepPause' : 'widget.stepPlay')}
            </button>
          ))}
        <button
          type="button"
          data-testid="clip-prev"
          disabled={step === 0}
          onClick={() => go(step - 1)}
          className={`${button} border-2 border-blue-700 text-blue-800 dark:border-sky-400 dark:text-sky-200 hover:bg-blue-50 dark:hover:bg-slate-800`}
        >
          {t('clip.prev')}
        </button>
        <button
          type="button"
          data-testid="clip-next"
          disabled={step === last}
          onClick={() => go(step + 1)}
          className={`${button} border-2 border-blue-700 text-blue-800 dark:border-sky-400 dark:text-sky-200 hover:bg-blue-50 dark:hover:bg-slate-800`}
        >
          {t('widget.stepNext')}
        </button>
        <button
          type="button"
          data-testid="clip-mute"
          aria-pressed={clipsMuted}
          onClick={toggleMute}
          className={`${button} text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800`}
        >
          {t('clip.mute')}
        </button>
        <span data-testid="clip-step" className="ml-auto text-xs text-slate-600 dark:text-slate-400">
          {t('widget.stepOf', { n: step + 1, total: steps.length })}
        </span>
      </div>
    </figure>
  )
}
