// SPEC: SPEC-009 FR-012, FR-013, research R11
// Recorded narration: each language's manifest is fetched once, and a track's file is found by its key
// ("<lessonId>/<mode>/<trackId>" or "global/<trackId>") and persona. English has no recordings.
import { speechService, VOICE_PERSONAS } from './speechService'
import type { VoicePersonaId } from '../store'

interface Manifest {
  tracks?: Record<string, Record<string, { file: string }>>
}

const manifests = new Map<string, Promise<Manifest | null>>()

export async function recordingFor(code: string, key: string, persona: string): Promise<string | null> {
  if (code === 'en' || !/^[a-z]{2,3}$/.test(code)) return null
  let loading = manifests.get(code)
  if (!loading) {
    loading = fetch(`/api/audio/${code}/manifest.json`)
      .then((r) => (r.ok ? (r.json() as Promise<Manifest>) : null))
      .catch(() => null) // offline or not recorded yet: the device voice is used
    manifests.set(code, loading)
  }
  const file = (await loading)?.tracks?.[key]?.[persona]?.file
  return file ? `/api/audio/${code}/${file}` : null
}

export interface SpeakTrackOptions {
  text: string
  trackKey?: string
  speechLang: string
  persona: VoicePersonaId
  rate: number
  // Still the one meant to speak when the recording lookup returns (not stopped or replaced meanwhile).
  isCurrent: () => boolean
  onStart?: () => void
  onEnd?: () => void
  onError?: () => void
  onUnavailable?: () => void
  onSentenceStart?: (sentence: string) => void
}

// speakTrack reads text in the persona's recorded voice when the language has a recording for trackKey,
// and on the device voice otherwise (SPEC-009 FR-012). A recording that will not play falls back to the device.
export function speakTrack(o: SpeakTrackOptions): void {
  const voice = VOICE_PERSONAS[o.persona] || VOICE_PERSONAS.chip
  const onDevice = () =>
    speechService.speak(o.text, {
      personaId: o.persona,
      speechLang: o.speechLang,
      onUnavailable: o.onUnavailable,
      pitch: voice.pitch,
      rate: o.rate * voice.rate,
      onSentenceStart: o.onSentenceStart,
      onStart: o.onStart,
      onEnd: o.onEnd,
      onError: o.onError,
    })
  const code = o.speechLang.toLowerCase().split('-')[0]
  if (!o.trackKey || code === 'en') {
    onDevice()
    return
  }
  void recordingFor(code, o.trackKey, o.persona).then((url) => {
    if (!o.isCurrent()) return
    if (!url) {
      onDevice()
      return
    }
    speechService.playRecording(url, {
      rate: o.rate,
      text: o.text,
      onSentenceStart: o.onSentenceStart,
      onStart: o.onStart,
      onEnd: o.onEnd,
      onError: onDevice,
    })
  })
}
