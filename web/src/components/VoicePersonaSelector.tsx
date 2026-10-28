import React, { useState } from 'react';
import { useAudioStore, VoicePersonaId } from '../store';
import { speechService, VOICE_PERSONAS } from '../services/speechService';

export const VoicePersonaSelector: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { persona, setPersona, speechRate, setSpeechRate, isMuted, toggleMute, stopAudio } = useAudioStore();

  const activePersona = VOICE_PERSONAS[persona] || VOICE_PERSONAS.chip;

  const handleSelectPersona = (pId: VoicePersonaId) => {
    setPersona(pId);
    stopAudio();
    speechService.playChime('click');

    // Quick friendly sample greeting
    const p = VOICE_PERSONAS[pId];
    const previewText = pId === 'chip'
      ? "Hi, I'm Chip! Let's explore AI together!"
      : pId === 'nova'
      ? "Hello, I'm Nova. I'll guide you through these concepts in plain English."
      : "Greetings. I am Professor Alan. Let us study the foundations of artificial intelligence.";

    speechService.speak(previewText, {
      personaId: pId,
      rate: speechRate * p.rate,
      pitch: p.pitch,
    });
  };

  return (
    <div className="relative inline-block text-left">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Voice Studio Settings"
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 shadow-xs transition-colors"
      >
        <span className="text-sm">{activePersona.avatar}</span>
        <span className="hidden sm:inline text-slate-700 dark:text-slate-200 font-medium">
          Voice: <strong className="font-bold text-slate-900 dark:text-white">{activePersona.name}</strong>
        </span>
        <span className="text-slate-400 text-[10px]">⚙️</span>
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-80 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-50 animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                🎙️ Audio Studio Settings
              </span>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm"
              >
                ✕
              </button>
            </div>

            {/* Persona Cards */}
            <div className="space-y-2 mb-4">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                Select Narrator Persona:
              </span>
              {(Object.keys(VOICE_PERSONAS) as VoicePersonaId[]).map((pId) => {
                const p = VOICE_PERSONAS[pId];
                const isSelected = persona === pId;
                return (
                  <button
                    key={pId}
                    onClick={() => handleSelectPersona(pId)}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-start gap-3 ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 shadow-xs ring-1 ring-blue-400'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <span className="text-2xl p-1 rounded-lg bg-white dark:bg-slate-800 shadow-2xs">
                      {p.avatar}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <strong className="text-xs font-bold text-slate-900 dark:text-white">
                          {p.title}
                        </strong>
                        {isSelected && (
                          <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 leading-snug">
                        {p.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Speed Slider */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-medium text-slate-700 dark:text-slate-300">
                <span>Reading Pace:</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">{speechRate}x</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-slate-400">0.75x</span>
                <input
                  type="range"
                  min="0.75"
                  max="1.25"
                  step="0.05"
                  value={speechRate}
                  onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
                <span className="text-[10px] text-slate-400">1.25x</span>
              </div>
            </div>

            {/* Mute Toggle */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between mt-3">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Mute All Audio:
              </span>
              <button
                onClick={toggleMute}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                  isMuted
                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {isMuted ? '🔇 Muted' : '🔊 Sound On'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
