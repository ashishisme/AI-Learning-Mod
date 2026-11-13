/**
 * Audio Studio 2.0 - High-Fidelity Speech & Sound Service
 * 
 * Provides:
 * 1. Asynchronous natural voice discovery & ranking (Apple Natural, Google US, MS Neural)
 * 2. Curated Voice Personas (Chip, Nova, Prof. Alan)
 * 3. Clause & punctuation prosody chunking (eliminating robotic monotone drone)
 * 4. Harmonic procedural chimes using Web Audio API (ADSR marimba/celesta timbre)
 * 
 * Strict Zero-Asset Bloat: 100% client-side zero external audio binary download.
 */

import { cleanForSpeech } from './narrationText';
import { useAudioStore } from '../store';

// FR-UI-19: every sound the app makes goes through this service, so mute is enforced here once.
const muted = () => useAudioStore.getState().isMuted;

export type VoicePersonaId = 'chip' | 'nova' | 'alan';

export interface VoicePersona {
  id: VoicePersonaId;
  name: string;
  title: string;
  description: string;
  avatar: string;
  pitch: number;
  rate: number;
  preferredKeywords: string[];
}

export const VOICE_PERSONAS: Record<VoicePersonaId, VoicePersona> = {
  chip: {
    id: 'chip',
    name: 'Chip',
    title: 'Chip the Companion',
    description: 'Warm, upbeat, and encouraging robot friend for young explorers',
    avatar: '🤖',
    pitch: 1.12, // Warm, pleasant lift without tinny or squeaky distortion
    rate: 1.02,
    preferredKeywords: ['Google US English', 'Samantha', 'Victoria', 'Karen', 'Zira', 'Natural',
      // Hindi device voices (SPEC-009 FR-013): Windows, macOS, Android
      'Kalpana', 'Google हिन्दी', 'Lekha'],
  },
  nova: {
    id: 'nova',
    name: 'Nova',
    title: 'Nova the Storyteller',
    description: 'Expressive, clear narrative voice with pleasant conversational pacing',
    avatar: '🎙️',
    pitch: 1.0,
    rate: 0.95, // Relaxed storytelling tempo
    preferredKeywords: ['Samantha', 'Google UK English Female', 'Serena', 'Natural', 'Fiona', 'Moira', 'Swara', 'Lekha', 'Google हिन्दी'],
  },
  alan: {
    id: 'alan',
    name: 'Prof. Alan',
    title: 'Prof. Alan',
    description: 'Calm, articulate, and insightful academic guide for deep focus',
    avatar: '🎓',
    pitch: 0.98,
    rate: 0.98,
    preferredKeywords: ['Daniel', 'Google UK English Male', 'Oliver', 'Alex', 'David', 'George', 'Madhur', 'Hemant', 'Rishi'],
  },
};

export interface SpeechOptions {
  personaId?: VoicePersonaId;
  pitch?: number;
  rate?: number;
  volume?: number;
  onSentenceStart?: (sentence: string, index: number, total: number) => void;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
  // SPEC-009 FR-013: the language of the text, such as 'hi-IN'. Without it, English voices are used as
  // before. A non-English text is never read by a voice of another language: when the device has none
  // for it, nothing is spoken and onUnavailable is called instead.
  speechLang?: string;
  onUnavailable?: () => void;
}

class SpeechService {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private audioCtx: AudioContext | null = null;
  // Bumped by every speak() and stop(). Events from an utterance that belongs to an older
  // generation (for example the "interrupted" event the browser fires after cancel()) are ignored,
  // so they can neither queue more speech nor report a stale end.
  private generation: number = 0;
  private activeChunkTimeout: any = null;
  // SPEC-009 FR-012: one player for recorded narration, stopped by stop() like device speech.
  private player: HTMLAudioElement | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.initVoices();
    }
  }

  private initVoices(): void {
    if (!this.synth) return;
    this.refreshVoices();

    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = () => {
        this.refreshVoices();
      };
    }
  }

  public refreshVoices(): void {
    if (!this.synth) return;
    const loaded = this.synth.getVoices();
    if (loaded && loaded.length > 0) {
      this.voices = loaded;
    }
  }

  public isSupported(): boolean {
    return this.synth !== null;
  }

  public isSpeaking(): boolean {
    if (this.player && !this.player.paused) return true;
    return this.currentUtterance !== null || (this.synth ? this.synth.speaking : false);
  }

  /**
   * Selects best ranked voice for given persona
   */
  public getBestVoiceForPersona(personaId: VoicePersonaId = 'chip', speechLang = 'en'): SpeechSynthesisVoice | null {
    if (this.voices.length === 0 && this.synth) {
      this.refreshVoices();
    }
    if (this.voices.length === 0) return null;

    const persona = VOICE_PERSONAS[personaId] || VOICE_PERSONAS.chip;
    const primary = speechLang.toLowerCase().split(/[-_]/)[0];
    const sameLanguage = this.voices.filter(v => v.lang.toLowerCase().split(/[-_]/)[0] === primary);
    // English keeps its old fallback to any voice; another language never borrows a voice.
    const candidates = sameLanguage.length > 0 ? sameLanguage : primary === 'en' ? this.voices : [];
    if (candidates.length === 0) return null;

    // Score and rank candidates
    let bestScore = -100;
    let bestVoice: SpeechSynthesisVoice | null = null;

    for (const voice of candidates) {
      let score = 0;
      const lowerName = voice.name.toLowerCase();

      // Preferred keywords match
      for (const kw of persona.preferredKeywords) {
        if (lowerName.includes(kw.toLowerCase())) {
          score += 15;
          break;
        }
      }

      // Quality indicator keywords
      if (lowerName.includes('natural') || lowerName.includes('neural') || lowerName.includes('premium') || lowerName.includes('enhanced')) {
        score += 10;
      }
      if (voice.default) score += 3;

      // Penalize legacy robotic or harsh voices
      if (lowerName.includes('fred') || lowerName.includes('albert') || lowerName.includes('bad') || lowerName.includes('whisper') || lowerName.includes('zarvox')) {
        score -= 20;
      }

      if (score > bestScore) {
        bestScore = score;
        bestVoice = voice;
      }
    }

    return bestVoice || candidates[0] || null;
  }

  /**
   * Clean and split text into natural punctuation-bounded sentences
   */
  private cleanAndChunkText(rawText: string): string[] {
    const cleaned = cleanForSpeech(rawText); // the shared rule, so recordings say the same

    if (!cleaned) return [];

    // Split on punctuation boundaries: ., !, ?, semicolons, or double newlines
    const rawChunks = cleaned.split(/(?<=[.!?;\n।॥])\s+/); // ।॥: Devanagari full stops
    const chunks: string[] = [];

    for (const chunk of rawChunks) {
      const trimmed = chunk.trim();
      if (!trimmed) continue;

      // If a sentence is unusually long (>180 chars), split on commas to allow breathing pauses
      if (trimmed.length > 180 && trimmed.includes(',')) {
        const subParts = trimmed.split(/(?<=,)\s+/);
        chunks.push(...subParts.map(p => p.trim()).filter(Boolean));
      } else {
        chunks.push(trimmed);
      }
    }

    return chunks;
  }

  /**
   * Speak text sequentially with natural breath pauses and sentence callbacks
   */
  public speak(text: string, options: SpeechOptions = {}): void {
    if (!this.synth || muted()) {
      if (options.onEnd) options.onEnd();
      return;
    }

    // Halt any active playback
    this.stop();
    const gen = ++this.generation;
    const isStale = () => gen !== this.generation;

    const chunks = this.cleanAndChunkText(text);
    if (chunks.length === 0) {
      if (options.onEnd) options.onEnd();
      return;
    }

    const personaId = options.personaId || 'chip';
    const persona = VOICE_PERSONAS[personaId] || VOICE_PERSONAS.chip;
    const speechLang = options.speechLang;
    const selectedVoice = this.getBestVoiceForPersona(personaId, speechLang || 'en');
    // Voices are loaded: none speaks this language, so say nothing rather than mispronounce it. While
    // the list is still empty (some Android browsers), utterance.lang below lets the device choose.
    if (speechLang && !selectedVoice && this.voices.length > 0) {
      if (options.onUnavailable) options.onUnavailable();
      return;
    }

    const pitch = options.pitch ?? persona.pitch;
    const rate = options.rate ?? persona.rate;
    const volume = options.volume ?? 1.0;

    if (options.onStart) {
      options.onStart();
    }

    let currentIndex = 0;

    const speakNextChunk = () => {
      // Stopped or replaced by a newer speak(): the newer owner reports its own state.
      if (isStale() || !this.synth) return;

      if (currentIndex >= chunks.length) {
        this.currentUtterance = null;
        if (options.onEnd) options.onEnd();
        return;
      }

      const chunkText = chunks[currentIndex];
      if (options.onSentenceStart) {
        options.onSentenceStart(chunkText, currentIndex, chunks.length);
      }

      const utterance = new SpeechSynthesisUtterance(chunkText);
      utterance.pitch = pitch;
      utterance.rate = rate;
      utterance.volume = volume;
      if (speechLang) utterance.lang = speechLang;

      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      utterance.onend = () => {
        if (isStale()) return;
        currentIndex++;
        // Natural human breath pause (50ms) between sentences
        this.activeChunkTimeout = setTimeout(() => {
          speakNextChunk();
        }, 55);
      };

      utterance.onerror = (e) => {
        if (isStale()) return;
        currentIndex++;
        if (currentIndex < chunks.length) {
          speakNextChunk();
        } else {
          this.currentUtterance = null;
          if (options.onError) options.onError(e);
          if (options.onEnd) options.onEnd();
        }
      };

      this.currentUtterance = utterance;
      this.synth.speak(utterance);
    };

    speakNextChunk();
  }

  /**
   * Play a recorded narration file (SPEC-009 FR-012). Stopping, or starting other speech, ends it.
   */
  // SPEC FR-UI-25 (SPEC-012, research R7): a recording has no sentence events, so the sentence being read
  // is estimated from playback progress against each sentence's share of the text's characters.
  public sentenceAt(text: string, fraction: number): { sentence: string; index: number; total: number } | null {
    return this.sentenceIn(this.cleanAndChunkText(text), fraction);
  }

  private sentenceIn(chunks: string[], fraction: number): { sentence: string; index: number; total: number } | null {
    if (chunks.length === 0) return null;
    const total = chunks.reduce((n, c) => n + c.length, 0);
    let reached = 0;
    for (let i = 0; i < chunks.length; i++) {
      reached += chunks[i].length;
      if (fraction * total < reached) return { sentence: chunks[i], index: i, total: chunks.length };
    }
    return { sentence: chunks[chunks.length - 1], index: chunks.length - 1, total: chunks.length };
  }

  public playRecording(url: string, options: { rate?: number; text?: string; onSentenceStart?: (sentence: string, index: number, total: number) => void; onStart?: () => void; onEnd?: () => void; onError?: (err: unknown) => void } = {}): void {
    this.stop();
    if (muted()) {
      options.onEnd?.();
      return;
    }
    const gen = ++this.generation;
    const player = this.player ?? (this.player = new Audio());
    player.src = url;
    player.playbackRate = options.rate ?? 1;
    player.onended = () => { if (gen === this.generation && options.onEnd) options.onEnd(); };
    player.onerror = (e) => { if (gen === this.generation && options.onError) options.onError(e); };
    let lastIndex = -1;
    const chunks = options.text && options.onSentenceStart ? this.cleanAndChunkText(options.text) : []; // once, not per tick
    player.ontimeupdate = () => {
      if (gen !== this.generation || !options.onSentenceStart || !(player.duration > 0)) return;
      const at = this.sentenceIn(chunks, player.currentTime / player.duration);
      if (at && at.index !== lastIndex) {
        lastIndex = at.index;
        options.onSentenceStart(at.sentence, at.index, at.total);
      }
    };
    player.play().then(
      () => { if (gen === this.generation && options.onStart) options.onStart(); },
      (err) => { if (gen === this.generation && options.onError) options.onError(err); },
    );
  }

  /**
   * Stop current speech and cancel pending sentence timeouts
   */
  public stop(): void {
    this.generation++;
    if (this.player) {
      this.player.pause();
      this.player.removeAttribute('src');
    }
    if (this.activeChunkTimeout) {
      clearTimeout(this.activeChunkTimeout);
      this.activeChunkTimeout = null;
    }
    if (this.synth) {
      this.synth.cancel();
      this.currentUtterance = null;
    }
  }

  public pause(): void {
    if (this.synth) {
      this.synth.pause();
    }
  }

  public resume(): void {
    if (this.synth) {
      this.synth.resume();
    }
  }

  /**
   * Warm procedural harmonic synthesizer using Web Audio API (ADSR envelope)
   */
  public playChime(type: 'success' | 'click' | 'turing' | 'robot'): void {
    if (typeof window === 'undefined' || muted()) return;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      if (!this.audioCtx) {
        this.audioCtx = new AudioContextClass();
      }

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const ctx = this.audioCtx;
      const now = ctx.currentTime;

      if (type === 'success') {
        // Pentatonic major chord: C5 (523Hz), E5 (659Hz), G5 (784Hz) with warm ADSR
        const chord = [523.25, 659.25, 783.99];
        chord.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'triangle'; // Warmer than harsh sine or buzzy square
          osc.frequency.setValueAtTime(freq, now + idx * 0.04);

          // Soft attack, warm decay
          gain.gain.setValueAtTime(0.001, now + idx * 0.04);
          gain.gain.linearRampToValueAtTime(0.12, now + idx * 0.04 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.38);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.04);
          osc.stop(now + idx * 0.04 + 0.4);
        });
      } else if (type === 'robot') {
        // Cheerful melodic robot chirp (ascending major triad arpeggio)
        const notes = [440, 554.37, 659.25, 880];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.06);

          gain.gain.setValueAtTime(0.08, now + idx * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.16);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.06);
          osc.stop(now + idx * 0.06 + 0.18);
        });
      } else if (type === 'turing') {
        // Sparkle shimmer
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.2); // A5

        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.28);
      } else {
        // Gentle soft acoustic tap
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(650, now);

        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.06);
      }
    } catch {
      // AudioContext could be blocked by browser autoplay policy before gesture
    }
  }
}

export const speechService = new SpeechService();
