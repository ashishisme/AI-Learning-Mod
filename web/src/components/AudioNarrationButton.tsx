import React, { useEffect, useState } from 'react';
import { useAudioStore, useAudienceModeStore, VoicePersonaId } from '../store';
import { speechService } from '../services/speechService';
import { useLanguage, useT } from '../i18n';
import { speakTrack } from '../services/narration';

interface AudioNarrationButtonProps {
  id: string;
  textToRead: string;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'subtle' | 'pill' | 'chip';
  // The language of textToRead, when it may differ from the chosen one (English fallback content).
  speechLang?: string;
  // SPEC-009 FR-012: the recorded narration's key, "<lessonId>/<mode>/<id>" or "global/<id>".
  trackKey?: string;
}

export const AudioNarrationButton: React.FC<AudioNarrationButtonProps> = ({
  id,
  textToRead,
  label: givenLabel,
  size = 'sm',
  variant = 'subtle',
  speechLang,
  trackKey,
}) => {
  const t = useT();
  const label = givenLabel ?? t('narration.readAloud');
  const { language } = useLanguage();
  // SPEC-009 FR-013: shown when this device has no voice for the learner's language.
  const [unavailable, setUnavailable] = useState(false);
  const {
    activeTrackId,
    isPlaying,
    isMuted,
    toggleMute,
    speechRate,
    persona,
    setActiveTrack,
    setCurrentSentence,
    stopAudio,
  } = useAudioStore();

  const { mode: audienceMode } = useAudienceModeStore();

  const isCurrentActive = activeTrackId === id && isPlaying;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (isMuted) return;
    setUnavailable(false);

    if (isCurrentActive) {
      speechService.stop();
      stopAudio();
      return;
    }

    // Determine voice persona: explicit override or mode default
    let effectivePersona: VoicePersonaId = persona || 'chip';
    if (!persona) {
      if (audienceMode === 'junior') effectivePersona = 'chip';
      else if (audienceMode === 'plain-english') effectivePersona = 'nova';
      else effectivePersona = 'alan';
    }

    if (effectivePersona === 'chip') {
      speechService.playChime('robot');
    } else {
      speechService.playChime('click');
    }

    setActiveTrack(id, true);

    speakTrack({
      text: textToRead,
      trackKey,
      speechLang: speechLang ?? language.speechLang,
      persona: effectivePersona,
      rate: speechRate,
      isCurrent: () => useAudioStore.getState().activeTrackId === id, // stopped or replaced meanwhile
      onUnavailable: () => {
        stopAudio();
        setUnavailable(true);
      },
      onSentenceStart: (sentence) => setCurrentSentence(sentence),
      onStart: () => setActiveTrack(id, true),
      onEnd: () => stopAudio(),
      onError: () => stopAudio(),
    });
  };

  // Stop playback only when this button unmounts while its own track is playing. Reading the
  // store at that moment (not a render-time closure) keeps a track change from stopping the
  // track that was just started.
  useEffect(() => {
    return () => {
      const audio = useAudioStore.getState();
      if (audio.activeTrackId === id) {
        speechService.stop();
        audio.stopAudio();
      }
    };
  }, [id]);

  // FR-UI-19: muted controls stay on the page, say that sound is off, and turn it back on in one tap
  // (without starting playback, since the learner may have muted on purpose).
  if (isMuted) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          toggleMute();
        }}
        data-testid="narration-muted"
        className="inline-flex flex-shrink-0 items-center gap-1.5 min-h-[44px] px-3 py-1.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 hover:bg-rose-200 dark:bg-rose-950/60 dark:text-rose-200 dark:hover:bg-rose-900/70"
      >
        {t('narration.soundOffTapToTurnOn')}
      </button>
    );
  }

  let button: React.ReactElement;
  // Styles based on variant
  if (variant === 'chip') {
    button = (
      <button
        onClick={handleToggle}
        aria-label={t(isCurrentActive ? 'narration.stopListeningChip' : 'narration.listenToChip')}
        className={`inline-flex flex-shrink-0 items-center gap-2 px-3.5 py-1.5 rounded-full font-bold text-xs shadow-sm transition-all duration-200 ${
          isCurrentActive
            ? 'bg-amber-500 text-white shadow-amber-500/40 animate-pulse ring-2 ring-amber-300'
            : 'bg-amber-100 hover:bg-amber-200 text-amber-900 dark:bg-amber-950/60 dark:hover:bg-amber-900/80 dark:text-amber-200'
        }`}
      >
        <span className="text-base">{isCurrentActive ? '⏹️' : '🔊'}</span>
        <span>{isCurrentActive ? t('narration.stopChip') : label}</span>
        {isCurrentActive && (
          <span className="flex gap-0.5 items-center">
            <span className="w-1 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1 h-4 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </span>
        )}
      </button>
    );
  }

  else if (variant === 'pill') {
    button = (
      <button
        onClick={handleToggle}
        aria-label={isCurrentActive ? t('narration.stopSection') : label}
        className={`inline-flex flex-shrink-0 items-center gap-1.5 px-3 py-1.5 rounded-full whitespace-nowrap text-xs font-semibold transition-colors ${
          isCurrentActive
            ? 'bg-blue-600 text-white ring-2 ring-blue-300 shadow-sm'
            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200'
        }`}
      >
        <span>{isCurrentActive ? '⏹' : '🔊'}</span>
        <span>{isCurrentActive ? t('narration.stop') : label}</span>
        {isCurrentActive && (
          <span className="flex gap-0.5 items-center ml-1">
            <span className="w-0.5 h-2.5 bg-white rounded-full animate-pulse" />
            <span className="w-0.5 h-3 bg-white rounded-full animate-pulse" style={{ animationDelay: '100ms' }} />
          </span>
        )}
      </button>
    );
  }

  // Default subtle variant
  else button = (
    <button
      onClick={handleToggle}
      aria-label={isCurrentActive ? t('narration.stopSection') : label}
      title={isCurrentActive ? t('narration.stopAudio') : label}
      className={`p-1.5 rounded-md transition-colors ${
        size === 'sm' ? 'text-xs' : 'text-sm'
      } ${
        isCurrentActive
          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 ring-1 ring-blue-400'
          : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800'
      }`}
    >
      {isCurrentActive ? (
        <span className="flex items-center gap-1">
          <svg className="w-4 h-4 text-blue-600 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
          </svg>
          <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">{t('narration.playing')}</span>
        </span>
      ) : (
        <span className="flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          </svg>
          <span className="text-[11px] hidden sm:inline">{label}</span>
        </span>
      )}
    </button>
  );

  if (!unavailable) return button;
  return (
    <span className="inline-flex flex-col items-start gap-1">
      {button}
      <span role="status" className="text-xs text-amber-800 dark:text-amber-300">{t('narration.unavailable')}</span>
    </span>
  );
};
