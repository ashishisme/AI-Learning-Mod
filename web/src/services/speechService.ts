/**
 * Audio & Speech Synthesis Service
 * Provides client-side zero-latency text-to-speech using Web Speech API
 * and procedural sound effect synthesis via HTML5 Web Audio API.
 * 
 * Strict Zero-Asset Bloat: Zero external MP3/WAV files required.
 */

export interface SpeechOptions {
  pitch?: number;
  rate?: number;
  volume?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
}

class SpeechService {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private audioCtx: AudioContext | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
    }
  }

  public isSupported(): boolean {
    return this.synth !== null;
  }

  public isSpeaking(): boolean {
    return this.currentUtterance !== null;
  }

  /**
   * Speak text with customized pitch, rate, and callbacks
   */
  public speak(text: string, options: SpeechOptions = {}): void {
    if (!this.synth) {
      if (options.onEnd) options.onEnd();
      return;
    }

    // Stop any ongoing speech
    this.stop();

    // Clean markdown symbols or HTML from text for clean natural speech
    const cleanText = text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // remove links
      .replace(/[*_#`~>]/g, '')                // remove markdown format characters
      .replace(/<\/?[^>]+(>|$)/g, '')          // remove HTML tags
      .trim();

    if (!cleanText) {
      if (options.onEnd) options.onEnd();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.pitch = options.pitch ?? 1.0;
    utterance.rate = options.rate ?? 1.0;
    utterance.volume = options.volume ?? 1.0;

    // Pick best English voice if available
    const voices = this.synth.getVoices();
    const englishVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.default));
    if (englishVoice) {
      utterance.voice = englishVoice;
    }

    utterance.onstart = () => {
      if (options.onStart) options.onStart();
    };

    utterance.onend = () => {
      this.currentUtterance = null;
      if (options.onEnd) options.onEnd();
    };

    utterance.onerror = (e) => {
      this.currentUtterance = null;
      if (options.onError) options.onError(e);
      if (options.onEnd) options.onEnd();
    };

    this.currentUtterance = utterance;
    this.synth.speak(utterance);
  }

  /**
   * Stop current speech playback
   */
  public stop(): void {
    if (this.synth) {
      this.synth.cancel();
      this.currentUtterance = null;
    }
  }

  /**
   * Pause speech
   */
  public pause(): void {
    if (this.synth) {
      this.synth.pause();
    }
  }

  /**
   * Resume paused speech
   */
  public resume(): void {
    if (this.synth) {
      this.synth.resume();
    }
  }

  /**
   * Generate procedural harmonic chimes using Web Audio API
   * Zero external mp3 assets required.
   */
  public playChime(type: 'success' | 'click' | 'turing' | 'robot'): void {
    if (typeof window === 'undefined') return;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      if (!this.audioCtx) {
        this.audioCtx = new AudioContextClass();
      }

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const now = this.audioCtx.currentTime;

      if (type === 'robot') {
        // Play playful 8-bit robot bleeps
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(880, now + 0.08);
        osc.frequency.setValueAtTime(660, now + 0.16);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'success' || type === 'turing') {
        // Melodic ascending chime (C5 -> E5 -> G5)
        const notes = [523.25, 659.25, 783.99];
        notes.forEach((freq, index) => {
          const osc = this.audioCtx!.createOscillator();
          const gain = this.audioCtx!.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + index * 0.1);

          gain.gain.setValueAtTime(0.15, now + index * 0.1);
          gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.1 + 0.35);

          osc.connect(gain);
          gain.connect(this.audioCtx!.destination);
          osc.start(now + index * 0.1);
          osc.stop(now + index * 0.1 + 0.4);
        });
      } else {
        // Subtle click
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.06);
      }
    } catch {
      // Audio context might be restricted before user gesture; gracefully ignore
    }
  }
}

export const speechService = new SpeechService();
