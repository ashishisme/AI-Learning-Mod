import React, { useState } from 'react';
import { speechService } from '../services/speechService';
import { useT } from '../i18n';

interface Candidate {
  id: number;
  name: string;
  avatar: string;
  background: 'Earth Base (Group A)' | 'Mars Colony (Group B)';
  shortGroup: 'Group A' | 'Group B';
  gpa: number;
  experienceYears: number;
  selectedRaw: boolean;
  selectedFair: boolean;
}

const APPLICANTS: Candidate[] = [
  { id: 1, name: 'Alex', avatar: '👨‍🚀', background: 'Earth Base (Group A)', shortGroup: 'Group A', gpa: 3.8, experienceYears: 4, selectedRaw: true, selectedFair: true },
  { id: 2, name: 'Taylor', avatar: '👩‍🚀', background: 'Mars Colony (Group B)', shortGroup: 'Group B', gpa: 3.9, experienceYears: 3, selectedRaw: false, selectedFair: true },
  { id: 3, name: 'Jordan', avatar: '🧑‍🚀', background: 'Earth Base (Group A)', shortGroup: 'Group A', gpa: 3.5, experienceYears: 5, selectedRaw: true, selectedFair: true },
  { id: 4, name: 'Morgan', avatar: '👩‍🔬', background: 'Mars Colony (Group B)', shortGroup: 'Group B', gpa: 3.7, experienceYears: 4, selectedRaw: false, selectedFair: true },
  { id: 5, name: 'Casey', avatar: '👨‍💻', background: 'Earth Base (Group A)', shortGroup: 'Group A', gpa: 3.4, experienceYears: 2, selectedRaw: true, selectedFair: true },
  { id: 6, name: 'Riley', avatar: '👩‍💻', background: 'Mars Colony (Group B)', shortGroup: 'Group B', gpa: 3.6, experienceYears: 3, selectedRaw: false, selectedFair: true },
  { id: 7, name: 'Sam', avatar: '👨‍🔬', background: 'Earth Base (Group A)', shortGroup: 'Group A', gpa: 3.9, experienceYears: 5, selectedRaw: true, selectedFair: true },
  { id: 8, name: 'Avery', avatar: '👩‍🏫', background: 'Mars Colony (Group B)', shortGroup: 'Group B', gpa: 3.8, experienceYears: 4, selectedRaw: false, selectedFair: true },
  { id: 9, name: 'Chris', avatar: '🧑‍💻', background: 'Earth Base (Group A)', shortGroup: 'Group A', gpa: 3.2, experienceYears: 1, selectedRaw: true, selectedFair: false },
  { id: 10, name: 'Quinn', avatar: '👩‍🎨', background: 'Mars Colony (Group B)', shortGroup: 'Group B', gpa: 3.5, experienceYears: 2, selectedRaw: false, selectedFair: false },
];

export const BiasDetectiveWidget: React.FC = () => {
  const t = useT();
  const [fairnessMode, setFairnessMode] = useState<'raw' | 'mitigated'>('raw');
  const [datasetSkew, setDatasetSkew] = useState<number>(80);

  const isMitigated = fairnessMode === 'mitigated';

  const handleModeChange = (mode: 'raw' | 'mitigated') => {
    setFairnessMode(mode);
    speechService.playChime(mode === 'mitigated' ? 'success' : 'click');
  };

  // Calculate selection stats
  const selectedCandidates = APPLICANTS.filter((c) => (isMitigated ? c.selectedFair : c.selectedRaw));
  const groupACount = APPLICANTS.filter((c) => c.shortGroup === 'Group A').length;
  const groupBCount = APPLICANTS.filter((c) => c.shortGroup === 'Group B').length;

  const groupASelected = selectedCandidates.filter((c) => c.shortGroup === 'Group A').length;
  const groupBSelected = selectedCandidates.filter((c) => c.shortGroup === 'Group B').length;

  const rateA = groupACount > 0 ? (groupASelected / groupACount) * 100 : 0;
  const rateB = groupBCount > 0 ? (groupBSelected / groupBCount) * 100 : 0;

  // Disparate impact ratio (four-fifths rule): the lower selection rate divided by the higher one
  const higherRate = Math.max(rateA, rateB);
  const disparateImpactRatio = higherRate > 0 ? (Math.min(rateA, rateB) / higherRate).toFixed(2) : '1.00';
  const isCompliant = parseFloat(disparateImpactRatio) >= 0.8;

  // See-saw tilt angle
  const seeSawRotation = isMitigated ? 0 : -14;

  return (
    <div
      className="my-8 rounded-3xl bg-slate-900 p-6 sm:p-8 text-white shadow-2xl border border-indigo-500/30 relative overflow-hidden"
      data-testid="bias-detective-widget"
    >
      {/* Background Ambient Glow */}
      <div className="absolute -top-24 -left-24 w-80 h-80 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4 relative z-10">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-2xl animate-bounce">🧭</span>
            <h3 className="text-lg sm:text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
              {t('widget.bias.title')}
            </h3>
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold border ${
                isCompliant
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
              }`}
            >
              {isCompliant ? t('widget.bias.fair') : t('widget.bias.skewed')}
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-300">
            {t('widget.bias.intro')}
          </p>
        </div>

        {/* Toggle Mode */}
        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 shadow-md">
          <button
            onClick={() => handleModeChange('raw')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              !isMitigated
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {t('widget.bias.raw')}
          </button>
          <button
            onClick={() => handleModeChange('mitigated')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              isMitigated
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {t('widget.bias.mitigated')}
          </button>
        </div>
      </div>

      {/* Animated Visual See-Saw Scale */}
      <div className="mt-6 p-5 rounded-2xl bg-slate-950 border border-slate-800 relative z-10 shadow-inner flex flex-col items-center justify-center">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
          {t('widget.bias.scale')}
        </span>
        <svg viewBox="0 0 400 120" className="w-full max-w-sm h-auto select-none">
          {/* Fulcrum Stand */}
          <polygon points="200,65 180,110 220,110" fill="#334155" stroke="#64748b" strokeWidth="2" />
          <circle cx="200" cy="65" r="5" fill="#38bdf8" />

          {/* Rotating Beam */}
          <g
            transform={`rotate(${seeSawRotation} 200 65)`}
            className="transition-transform duration-700 ease-out"
          >
            {/* Horizontal Bar */}
            <rect x="40" y="62" width="320" height="7" rx="3.5" fill="#475569" stroke="#94a3b8" strokeWidth="1" />

            {/* Left Pan (Group A / Earth) */}
            <line x1="70" y1="65" x2="70" y2="90" stroke="#94a3b8" strokeWidth="2" />
            <ellipse cx="70" cy="95" rx="35" ry="8" fill="#1e293b" stroke="#3b82f6" strokeWidth="2" />
            <text x="70" y="85" textAnchor="middle" fill="#93c5fd" fontSize="10" fontWeight="bold">
              {t('widget.bias.panA', { n: rateA.toFixed(0) })}
            </text>

            {/* Right Pan (Group B / Mars) */}
            <line x1="330" y1="65" x2="330" y2="90" stroke="#94a3b8" strokeWidth="2" />
            <ellipse cx="330" cy="95" rx="35" ry="8" fill="#1e293b" stroke={isCompliant ? '#10b981' : '#f43f5e'} strokeWidth="2" />
            <text x="330" y="85" textAnchor="middle" fill={isCompliant ? '#a7f3d0' : '#fca5a5'} fontSize="10" fontWeight="bold">
              {t('widget.bias.panB', { n: rateB.toFixed(0) })}
            </text>
          </g>
        </svg>

        <div className="mt-1 text-xs font-bold text-center">
          {isMitigated ? (
            <span className="text-emerald-300 flex items-center gap-1.5 justify-center">
              <span>✅</span>
              <span>{t('widget.bias.balanced')}</span>
            </span>
          ) : (
            <span className="text-rose-400 flex items-center gap-1.5 justify-center animate-pulse">
              <span>⚠️</span>
              <span>{t('widget.bias.unfair')}</span>
            </span>
          )}
        </div>
      </div>

      {/* Dataset Skew Slider */}
      <div className="mt-6 p-4 rounded-2xl bg-slate-950/70 border border-slate-800 relative z-10">
        <div className="flex items-center justify-between text-xs text-slate-200 mb-2 font-semibold">
          <span>{t('widget.bias.mix')}</span>
          <span className="font-mono text-cyan-300 font-bold">
            {t('widget.bias.mixValue', { a: datasetSkew, b: 100 - datasetSkew })}
          </span>
        </div>
        <input
          type="range"
          min="50"
          max="95"
          step="5"
          value={datasetSkew}
          onChange={(e) => {
            speechService.playChime('click');
            setDatasetSkew(Number(e.target.value));
          }}
          className="w-full accent-cyan-500 cursor-pointer"
        />
        <p className="mt-2 text-[11px] text-slate-400">
          {datasetSkew > 70
            ? t('widget.bias.imbalance')
            : t('widget.bias.balancedData')}
        </p>
      </div>

      {/* Scorecards */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
        {/* Metric 1 */}
        <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 text-center shadow-md">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 block mb-1">
            {t('widget.bias.rateA')}
          </span>
          <div className="text-2xl font-black font-mono text-blue-300">{rateA.toFixed(0)}%</div>
          <div className="text-[11px] text-slate-400 mt-1">{t('widget.bias.chosen', { n: groupASelected, total: groupACount })}</div>
        </div>

        {/* Metric 2 */}
        <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 text-center shadow-md">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 block mb-1">
            {t('widget.bias.rateB')}
          </span>
          <div
            className={`text-2xl font-black font-mono ${
              rateB >= 60 ? 'text-emerald-300' : 'text-rose-400'
            }`}
          >
            {rateB.toFixed(0)}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1">{t('widget.bias.chosen', { n: groupBSelected, total: groupBCount })}</div>
        </div>

        {/* Metric 3 */}
        <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 text-center shadow-md">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 block mb-1">
            {t('widget.bias.impact')}
          </span>
          <div
            className={`text-2xl font-black font-mono ${
              isCompliant ? 'text-emerald-300' : 'text-rose-400 animate-pulse'
            }`}
          >
            {disparateImpactRatio}
          </div>
          <div className="text-[11px] font-bold mt-1">
            {isCompliant ? t('widget.bias.meets') : t('widget.bias.violates')}
          </div>
        </div>
      </div>

      {/* Candidate Pool Cards */}
      <div className="mt-8 relative z-10">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-3">
          {t('widget.bias.pool', { n: selectedCandidates.length })}
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {APPLICANTS.map((c) => {
            const isChosen = isMitigated ? c.selectedFair : c.selectedRaw;
            return (
              <div
                key={c.id}
                className={`p-3.5 rounded-2xl border transition-all ${
                  isChosen
                    ? 'bg-slate-800 border-indigo-400/80 shadow-md ring-1 ring-indigo-400/50'
                    : 'bg-slate-950/50 border-slate-800 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{c.avatar}</span>
                  <span
                    className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                      isChosen ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {t(isChosen ? 'widget.bias.accepted' : 'widget.bias.rejected')}
                  </span>
                </div>
                <div className="mt-2 text-xs font-bold text-white">{c.name}</div>
                <div className="text-[10px] text-slate-400">{t(c.shortGroup === 'Group A' ? 'widget.bias.groupA' : 'widget.bias.groupB')}</div>
                <div className="mt-1 text-[10px] font-mono text-cyan-300">
                  {t('widget.bias.profile', { gpa: c.gpa, years: c.experienceYears })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
