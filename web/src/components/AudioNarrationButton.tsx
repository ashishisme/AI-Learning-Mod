import React, { useEffect } from 'react';
import { useAudioStore, useAudienceModeStore } from '../store';
import { speechService } from '../services/speechService';

interface AudioNarrationButtonProps {
  id: string;
  textToRead: string;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'subtle' | 'pill' | 'chip';
}

export const AudioNarrationButton: React.FC<AudioNarrationButtonProps> = ({
  id,
  textToRead,
  label = 'Read aloud',
  size = 'sm',
  variant = 'subtle',
}) => {
  const { activeTrackId, isPlaying, isMuted, speechRate, setActiveTrack, stopAudio } = useAudioStore();
  const { mode: audienceMode } = useAudienceModeStore();

  const isCurrentActive = activeTrackId === id && isPlaying;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (isMuted) return;

    if (isCurrentActive) {
      speechService.stop();
      stopAudio();
      return;
    }

    // Set voice personality parameters based on mode
    let pitch = 1.0;
    let rate = speechRate;

    if (audienceMode === 'junior') {
      pitch = 1.35; // Cheerful robot voice
      rate = speechRate * 1.05;
      speechService.playChime('robot');
    } else if (audienceMode === 'plain-english') {
      pitch = 1.0;
      rate = speechRate * 0.95; // Measured, clear pace
      speechService.playChime('click');
    } else {
      speechService.playChime('click');
    }

    setActiveTrack(id, true);

    speechService.speak(textToRead, {
      pitch,
      rate,
      onStart: () => {
        setActiveTrack(id, true);
      },
      onEnd: () => {
        stopAudio();
      },
      onError: () => {
        stopAudio();
      },
    });
  };

  // Stop playback if component unmounts
  useEffect(() => {
    return () => {
      if (activeTrackId === id) {
        speechService.stop();
        stopAudio();
      }
    };
  }, [id, activeTrackId, stopAudio]);

  if (isMuted) {
    return null;
  }

  // Styles based on variant
  if (variant === 'chip') {
    return (
      <button
        onClick={handleToggle}
        aria-label={isCurrentActive ? `Stop listening to Chip` : `Listen to Chip`}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full font-bold text-xs shadow-sm transition-all duration-200 ${
          isCurrentActive
            ? 'bg-amber-500 text-white shadow-amber-500/40 animate-pulse ring-2 ring-amber-300'
            : 'bg-amber-100 hover:bg-amber-200 text-amber-800 dark:bg-amber-950/60 dark:hover:bg-amber-900/80 dark:text-amber-200'
        }`}
      >
        <span className="text-base">{isCurrentActive ? '⏹️' : '🔊'}</span>
        <span>{isCurrentActive ? 'Stop Chip' : label}</span>
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

  if (variant === 'pill') {
    return (
      <button
        onClick={handleToggle}
        aria-label={isCurrentActive ? `Stop reading section` : label}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
          isCurrentActive
            ? 'bg-blue-600 text-white ring-2 ring-blue-300'
            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200'
        }`}
      >
        <span>{isCurrentActive ? '⏹' : '🔊'}</span>
        <span>{isCurrentActive ? 'Stop' : label}</span>
      </button>
    );
  }

  // Default subtle variant
  return (
    <button
      onClick={handleToggle}
      aria-label={isCurrentActive ? `Stop reading section` : label}
      title={isCurrentActive ? `Stop audio` : label}
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
          <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">Playing</span>
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
};
