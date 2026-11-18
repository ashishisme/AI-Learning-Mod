// SPEC: FR-UI-28, FR-CNT-13 (amended 2.17.0; SPEC-014 clarifications 2026-11-15), AC-80
// A video clip: the poster first, the video downloaded only on Play. Each cue's caption is read aloud, and the video
// holds the last frame of a cue until its caption has been read. Under reduced motion it never plays: Previous, Next
// and the cue targets show each cue's still frame and read its caption once.
import React, { useEffect, useId, useRef, useState } from 'react'
import { useT } from '../i18n'
import { useAudioStore } from '../store'
import { useClipStore } from '../stores/clipStore'
import { speechService } from '../services/speechService'
import { speakTrack } from '../services/narration'
import { holdMs, STEP_GAP_MS } from './ClipPlayer'

interface Props {
  clip: string
  caption?: string
  alt?: string
  steps: string[]
  // "<lessonId>/<mode>/section-<id>-clip-": the narration key of cue n is this plus n.
  trackPrefix: string
  speechLang: string
  cues?: number[] // cue start times in seconds, one per caption
}

const DEFAULT_CUES = [0.0, 3.5, 6.5, 9.8, 13.0]
const BOUNDARY = 0.05 // hold this far before the next cue, so its first frame never shows early
const SPEEDS = [1, 1.25, 0.75]

const control =
  'min-h-[44px] min-w-[44px] px-3.5 py-2 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 aria-disabled:opacity-40 aria-disabled:cursor-not-allowed'

export const VideoClipPlayer: React.FC<Props> = ({ clip, caption, alt, steps, trackPrefix, speechLang, cues = DEFAULT_CUES }) => {
  const t = useT()
  const descId = useId()
  const videoRef = useRef<HTMLVideoElement>(null)
  const figureRef = useRef<HTMLElement>(null)
  // Bumped by every control: speech or a timer started for an older action then does nothing.
  const gen = useRef(0)
  const stepRef = useRef(0)
  const playingRef = useRef(false)
  const segDone = useRef(false) // the video has reached the end of the current cue
  const voiceDone = useRef(false) // the current cue's caption has been read (or held for its reading time)

  const [step, setStepState] = useState(0)
  const [playing, setPlayingState] = useState(false)
  const [ended, setEnded] = useState(false)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [rate, setRate] = useState(1)
  const [failed, setFailed] = useState(false)

  const clipsMuted = useClipStore((s) => s.clipsMuted)
  const toggleClipsMuted = useClipStore((s) => s.toggleClipsMuted)
  const activeTrackId = useAudioStore((s) => s.activeTrackId)
  const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const owner = `video-clip:${trackPrefix}`
  const last = steps.length - 1
  const cueEnd = (n: number) => (n < last ? cues[n + 1] : Infinity)

  const setStep = (n: number) => {
    stepRef.current = n
    setStepState(n)
  }
  const setPlaying = (p: boolean) => {
    playingRef.current = p
    setPlayingState(p)
  }
  const mutedNow = () => useClipStore.getState().clipsMuted || useAudioStore.getState().isMuted

  // Let go of the shared audio state when this clip holds it.
  const release = () => {
    const audio = useAudioStore.getState()
    if (audio.activeTrackId?.startsWith(owner)) {
      speechService.stop()
      audio.stopAudio()
    }
  }

  // Read cue n aloud (or hold for its reading time when muted or when there is no speech); then call done.
  const voice = (n: number, done?: () => void) => {
    const my = gen.current
    const isCurrent = () => my === gen.current && !!useAudioStore.getState().activeTrackId?.startsWith(owner)
    const id = owner + (n + 1)
    useAudioStore.getState().setActiveTrack(id, true)
    const started = Date.now()
    let finished = false
    const finish = (ms: number) => {
      if (finished || !isCurrent()) return
      finished = true
      window.setTimeout(() => {
        if (!isCurrent()) return
        if (done) done()
        else if (useAudioStore.getState().activeTrackId === id) useAudioStore.getState().stopAudio()
      }, ms)
    }
    const hold = () => finish(Math.max(0, holdMs(steps[n]) - (Date.now() - started)))
    if (mutedNow()) {
      hold()
      return
    }
    // With no speech engine the service ends without starting: then the cue holds as if muted.
    let spoke = false
    const { persona, speechRate } = useAudioStore.getState()
    speakTrack({
      text: steps[n],
      trackKey: trackPrefix + (n + 1),
      speechLang,
      persona: persona || 'alan',
      rate: speechRate,
      isCurrent,
      onStart: () => {
        spoke = true
      },
      onEnd: () => (spoke ? finish(STEP_GAP_MS) : hold()),
      onError: hold,
      onUnavailable: hold,
    })
  }

  // Move on once the video has reached the cue's end and its caption has been read (FR-008).
  const tryAdvance = () => {
    if (!playingRef.current || !segDone.current || !voiceDone.current) return
    const v = videoRef.current
    if (stepRef.current < last && v) {
      const next = stepRef.current + 1
      setStep(next)
      v.currentTime = cues[next]
      startCue(next)
      void v.play().catch(() => {})
    } else {
      setPlaying(false)
      setEnded(true)
      release()
    }
  }

  const startCue = (n: number) => {
    segDone.current = false
    voiceDone.current = false
    voice(n, () => {
      voiceDone.current = true
      tryAdvance()
    })
  }

  const onTimeUpdate = () => {
    const v = videoRef.current
    if (!v) return
    setTime(v.currentTime)
    if (!playingRef.current || segDone.current) return
    const end = cueEnd(stepRef.current)
    if (v.currentTime >= end - BOUNDARY) {
      segDone.current = true
      v.pause()
      v.currentTime = end - BOUNDARY // hold the cue's last frame
      tryAdvance()
    }
  }

  const play = () => {
    const v = videoRef.current
    if (!v) return
    speechService.stop()
    gen.current++
    setEnded(false)
    setPlaying(true)
    v.playbackRate = rate
    if (v.currentTime < cues[stepRef.current] || v.currentTime >= cueEnd(stepRef.current) - BOUNDARY) v.currentTime = cues[stepRef.current]
    startCue(stepRef.current)
    void v.play().catch(() => {})
  }

  const pause = () => {
    gen.current++
    videoRef.current?.pause()
    setPlaying(false)
    release()
  }

  const replay = () => {
    setStep(0)
    if (videoRef.current) videoRef.current.currentTime = 0
    play()
  }

  // Previous, Next and the cue targets stop playing, show that cue's first frame and read it once.
  const go = (n: number) => {
    gen.current++
    const v = videoRef.current
    v?.pause()
    setPlaying(false)
    setEnded(false)
    speechService.stop()
    setStep(n)
    if (v) v.currentTime = cues[n] + BOUNDARY
    voice(n)
  }

  const cycleSpeed = () => {
    const next = SPEEDS[(SPEEDS.indexOf(rate) + 1) % SPEEDS.length]
    setRate(next)
    if (videoRef.current) videoRef.current.playbackRate = next // the picture only; the voice keeps its own speed
  }

  const toggleMute = () => {
    if (!mutedNow()) speechService.stop()
    toggleClipsMuted()
    // A playing cue switches between its voice and its muted hold.
    if (playingRef.current && !voiceDone.current) {
      gen.current++
      voice(stepRef.current, () => {
        voiceDone.current = true
        tryAdvance()
      })
    }
  }

  // One sound at a time: only another sound (Read section, the tutor, another clip) pauses this clip. The store
  // is read directly, because this clip claims it during the same render.
  useEffect(() => {
    if (playingRef.current && !useAudioStore.getState().activeTrackId?.startsWith(owner)) {
      gen.current++
      videoRef.current?.pause()
      setPlaying(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTrackId, owner])

  // Pause when the clip leaves the screen, and stop when it leaves the page.
  useEffect(() => {
    const el = figureRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const seen = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting && playingRef.current) pause()
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

  const total = duration || cues[last] + 4
  const poster = `/brand/videos/${clip}-poster.jpg`

  return (
    <figure
      ref={figureRef}
      data-testid="video-clip"
      aria-describedby={alt ? descId : undefined}
      className="my-8 rounded-3xl overflow-hidden border border-slate-700/60 dark:border-slate-800 bg-slate-950 text-slate-100 shadow-2xl"
    >
      {alt && (
        <p id={descId} className="sr-only" data-testid="video-description">
          {alt}
        </p>
      )}

      {caption && (
        <div className="px-5 py-3 bg-slate-900/90 border-b border-slate-800/80">
          <span className="text-xs font-bold tracking-wider uppercase text-cyan-300">{caption}</span>
        </div>
      )}

      <div className="relative bg-black aspect-video flex items-center justify-center overflow-hidden">
        {failed ? (
          <img src={poster} alt="" data-testid="video-fallback-poster" className="w-full h-full object-cover" />
        ) : (
          <video
            ref={videoRef}
            playsInline
            muted
            preload="none"
            poster={poster}
            data-testid="video-element"
            onTimeUpdate={onTimeUpdate}
            onLoadedMetadata={() => videoRef.current && setDuration(videoRef.current.duration || 0)}
            onEnded={() => {
              segDone.current = true
              tryAdvance()
            }}
            className="w-full h-full object-cover"
          >
            <source src={`/brand/videos/${clip}.webm`} type="video/webm" />
            {/* A source error fires on the <source>; the last one failing means the video cannot play. */}
            <source src={`/brand/videos/${clip}.mp4`} type="video/mp4" onError={() => setFailed(true)} />
          </video>
        )}

        {!playing && !failed && !reduceMotion && (
          <button
            type="button"
            data-testid="video-overlay"
            onClick={ended ? replay : play}
            aria-label={t(ended ? 'widget.stepRestart' : 'widget.stepPlay')}
            className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-cyan-400 hover:bg-cyan-300 text-slate-950 flex items-center justify-center shadow-lg focus:outline-none focus-visible:ring-4 focus-visible:ring-white z-10"
          >
            <svg aria-hidden="true" className="w-7 h-7 ml-1 fill-current" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
        )}

        {/* Cue targets: each at least 44 px tall, with a thin progress bar inside (FR-UI-28). */}
        <div className="absolute top-0 left-2 right-2 flex gap-1.5 z-20">
          {steps.map((_, i) => {
            const start = cues[i] ?? 0
            const end = i < last ? cues[i + 1] : total
            const fill = time >= end ? 100 : i === step && end > start ? Math.min(100, Math.max(0, ((time - start) / (end - start)) * 100)) : 0
            return (
              <button
                key={i}
                type="button"
                data-testid={`video-cue-${i + 1}`}
                onClick={() => go(i)}
                aria-label={t('clip.cue', { n: i + 1 })}
                aria-current={i === step ? 'step' : undefined}
                className="flex-1 min-h-[44px] flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 rounded"
              >
                <span className="block w-full h-1.5 rounded-full bg-slate-600/70 overflow-hidden">
                  <span className="block h-full bg-cyan-300" style={{ width: `${fill}%` }} />
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <figcaption className="p-5 sm:p-6 bg-slate-900/60 border-t border-slate-800/80">
        <span data-testid="video-step" className="inline-block mb-2 px-2 py-0.5 rounded-md text-xs font-bold bg-cyan-950 text-cyan-200 border border-cyan-800/60">
          {t('widget.stepOf', { n: step + 1, total: steps.length })}
        </span>
        <p aria-live="polite" data-testid="video-caption" className="text-base sm:text-lg text-slate-100 font-medium leading-relaxed">
          {steps[step]}
        </p>
        {failed && (
          <ol data-testid="video-fallback" className="mt-3 list-decimal list-inside space-y-1 text-sm text-slate-200">
            {steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        )}
      </figcaption>

      <div className="px-5 py-4 bg-slate-950 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {!reduceMotion && !failed && (
            <button
              type="button"
              data-testid="video-play"
              onClick={playing ? pause : ended ? replay : play}
              className={`${control} px-5 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold`}
            >
              {t(playing ? 'widget.stepPause' : ended ? 'widget.stepRestart' : 'widget.stepPlay')}
            </button>
          )}
          <button
            type="button"
            data-testid="video-prev"
            aria-disabled={step === 0}
            onClick={() => step > 0 && go(step - 1)}
            className={`${control} border border-slate-600 text-slate-100 hover:bg-slate-800`}
          >
            {t('clip.prev')}
          </button>
          <button
            type="button"
            data-testid="video-next"
            aria-disabled={step === last}
            onClick={() => step < last && go(step + 1)}
            className={`${control} border border-slate-600 text-slate-100 hover:bg-slate-800`}
          >
            {t('widget.stepNext')}
          </button>
        </div>
        <div className="flex items-center gap-2">
          {!reduceMotion && !failed && (
            <button
              type="button"
              data-testid="video-speed"
              onClick={cycleSpeed}
              aria-label={t('clip.speed', { rate })}
              className={`${control} border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 font-mono`}
            >
              {rate}×
            </button>
          )}
          <button
            type="button"
            data-testid="video-mute"
            aria-pressed={clipsMuted}
            onClick={toggleMute}
            className={`${control} border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200`}
          >
            {t('clip.mute')}
          </button>
        </div>
      </div>
    </figure>
  )
}
