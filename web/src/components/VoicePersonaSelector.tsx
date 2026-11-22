import React, { useState } from 'react';
import { useAudienceModeStore, useAudioStore, VoicePersonaId } from '../store';
import { AgeBandPicker } from './AgeBandPicker';
import { speechService, VOICE_PERSONAS } from '../services/speechService';
import { useLanguage, useT } from '../i18n';

interface Props {
  compact?: boolean;
}

export const VoicePersonaSelector: React.FC<Props> = ({ compact = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const t = useT();
  const { language } = useLanguage();
  const { persona, setPersona, speechRate, setSpeechRate, isMuted, toggleMute, stopAudio } = useAudioStore();

  const audienceMode = useAudienceModeStore((s) => s.mode);
  const activePersona = VOICE_PERSONAS[persona] || VOICE_PERSONAS.chip;

  const handleSelectPersona = (pId: VoicePersonaId) => {
    setPersona(pId);
    stopAudio();
    speechService.playChime('click');

    // Quick friendly sample greeting
    const p = VOICE_PERSONAS[pId];
    const previewText = t(`narration.persona.${pId}.preview`);

    speechService.speak(previewText, {
      personaId: pId,
      speechLang: language.speechLang,
      rate: speechRate * p.rate,
      pitch: p.pitch,
    });
  };

  return (
    <div className="relative inline-block text-left">
      {/* Trigger Button */}
      {compact ? (
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-label={t('narration.studioLabel')}
          data-testid="voice-studio-trigger"
          title={`${t('narration.voice')} ${t(`narration.persona.${activePersona.id}.name`)}`}
          className="min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center rounded-xl text-base bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        >
          <span>🤖</span>
        </button>
      ) : (
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-label={t('narration.studioLabel')}
          data-testid="voice-studio-trigger"
          className="inline-flex items-center gap-2 min-h-[44px] px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        >
          <span className="text-sm">{activePersona.avatar}</span>
          <span className="hidden sm:inline text-slate-700 dark:text-slate-200 font-medium">
            {t('narration.voice')} <strong className="font-bold text-slate-900 dark:text-white">{t(`narration.persona.${activePersona.id}.name`)}</strong>
          </span>
          <span className="text-slate-400 text-xs">⚙️</span>
        </button>
      )}

      {/* Popover Menu */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div data-testid="voice-studio-menu" className="fixed inset-x-4 top-20 max-h-[calc(100dvh-6rem)] overflow-y-auto sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-80 sm:max-h-none sm:overflow-visible p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-50 animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {t('narration.studioTitle')}
              </span>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm"
              >
                ✕
              </button>
            </div>

            {/* SPEC FR-UI-16 (amended 2.11.0): Kids age band */}
            {audienceMode === 'junior' && (
              <div data-testid="voice-studio-age-band" className="mb-4">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  {t('ageBand.settingTitle')}
                </span>
                <AgeBandPicker />
              </div>
            )}

            {/* Persona Cards */}
            <div className="space-y-2 mb-4">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                {t('narration.selectPersona')}
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
                          {t(`narration.persona.${pId}.title`)}
                        </strong>
                        {isSelected && (
                          <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                            {t('narration.active')}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 leading-snug">
                        {t(`narration.persona.${pId}.description`)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Speed Slider */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-medium text-slate-700 dark:text-slate-300">
                <span>{t('narration.pace')}</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">{speechRate}x</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400">0.75x</span>
                <input
                  type="range"
                  min="0.75"
                  max="1.25"
                  step="0.05"
                  value={speechRate}
                  onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
                <span className="text-xs text-slate-400">1.25x</span>
              </div>
            </div>

            {/* Mute Toggle */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between mt-3">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                {t('narration.muteAll')}
              </span>
              <button
                onClick={() => {
                  if (!isMuted) {
                    speechService.stop(); // FR-UI-19: muting silences what is playing now
                    stopAudio();
                  }
                  toggleMute();
                }}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                  isMuted
                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {t(isMuted ? 'narration.muted' : 'narration.soundOn')}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
