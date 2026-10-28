import React, { useState } from 'react';

interface Candidate {
  id: number;
  name: string;
  avatar: string;
  background: 'Group A' | 'Group B';
  gpa: number;
  experienceYears: number;
  selectedRaw: boolean;
  selectedFair: boolean;
}

const APPLICANTS: Candidate[] = [
  { id: 1, name: 'Alex', avatar: '👨‍💼', background: 'Group A', gpa: 3.8, experienceYears: 4, selectedRaw: true, selectedFair: true },
  { id: 2, name: 'Taylor', avatar: '👩‍💼', background: 'Group B', gpa: 3.9, experienceYears: 3, selectedRaw: false, selectedFair: true },
  { id: 3, name: 'Jordan', avatar: '🧑‍💼', background: 'Group A', gpa: 3.5, experienceYears: 5, selectedRaw: true, selectedFair: true },
  { id: 4, name: 'Morgan', avatar: '👩‍🔬', background: 'Group B', gpa: 3.7, experienceYears: 4, selectedRaw: false, selectedFair: true },
  { id: 5, name: 'Casey', avatar: '👨‍💻', background: 'Group A', gpa: 3.4, experienceYears: 2, selectedRaw: true, selectedFair: false },
  { id: 6, name: 'Riley', avatar: '👩‍💻', background: 'Group B', gpa: 3.6, experienceYears: 3, selectedRaw: false, selectedFair: true },
  { id: 7, name: 'Sam', avatar: '👨‍🔬', background: 'Group A', gpa: 3.9, experienceYears: 5, selectedRaw: true, selectedFair: true },
  { id: 8, name: 'Avery', avatar: '👩‍🏫', background: 'Group B', gpa: 3.8, experienceYears: 4, selectedRaw: false, selectedFair: true },
  { id: 9, name: 'Chris', avatar: '🧑‍💻', background: 'Group A', gpa: 3.2, experienceYears: 1, selectedRaw: true, selectedFair: false },
  { id: 10, name: 'Quinn', avatar: '👩‍🎨', background: 'Group B', gpa: 3.5, experienceYears: 2, selectedRaw: false, selectedFair: false },
];

export const BiasDetectiveWidget: React.FC = () => {
  const [fairnessMode, setFairnessMode] = useState<'raw' | 'mitigated'>('raw');
  const [datasetSkew, setDatasetSkew] = useState<number>(80); // % Group A in historical training data

  const isMitigated = fairnessMode === 'mitigated';

  // Calculate selection stats
  const selectedCandidates = APPLICANTS.filter((c) => (isMitigated ? c.selectedFair : c.selectedRaw));
  const groupACount = APPLICANTS.filter((c) => c.background === 'Group A').length;
  const groupBCount = APPLICANTS.filter((c) => c.background === 'Group B').length;

  const groupASelected = selectedCandidates.filter((c) => c.background === 'Group A').length;
  const groupBSelected = selectedCandidates.filter((c) => c.background === 'Group B').length;

  const rateA = groupACount > 0 ? (groupASelected / groupACount) * 100 : 0;
  const rateB = groupBCount > 0 ? (groupBSelected / groupBCount) * 100 : 0;

  // Disparate Impact Ratio (Rate of disadvantaged group / Rate of advantaged group)
  const disparateImpactRatio = rateA > 0 ? (rateB / rateA).toFixed(2) : '1.00';
  const isCompliant = parseFloat(disparateImpactRatio) >= 0.8;

  return (
    <div
      className="my-8 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white shadow-2xl border border-indigo-500/30"
      data-testid="bias-detective-widget"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-indigo-500/20 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🧭</span>
            <h3 className="text-xl font-bold tracking-tight text-indigo-200">
              Interactive Bias Detective: AI Fairness Auditor
            </h3>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                isCompliant
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
              }`}
            >
              {isCompliant ? '🟢 Fair & Balanced' : '🔴 Skewed Disparity'}
            </span>
          </div>
          <p className="mt-1 text-xs text-indigo-300/80">
            See how past data prejudices can accidentally train unfair models—and how ethical AI audits fix them!
          </p>
        </div>

        {/* Toggle Mode */}
        <div className="flex items-center gap-2 bg-slate-950/80 p-1.5 rounded-xl border border-indigo-500/30">
          <button
            onClick={() => setFairnessMode('raw')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              !isMitigated
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Raw Historical Model
          </button>
          <button
            onClick={() => setFairnessMode('mitigated')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              isMitigated
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Audited & Mitigated
          </button>
        </div>
      </div>

      {/* Dataset Skew Slider */}
      <div className="mt-6 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
        <div className="flex items-center justify-between text-xs text-slate-300 mb-2">
          <span>Historical Training Data Mix:</span>
          <span className="font-mono text-indigo-300 font-bold">
            {datasetSkew}% Group A vs {100 - datasetSkew}% Group B
          </span>
        </div>
        <input
          type="range"
          min="50"
          max="95"
          step="5"
          value={datasetSkew}
          onChange={(e) => setDatasetSkew(Number(e.target.value))}
          className="w-full accent-indigo-500 cursor-pointer"
        />
        <p className="mt-2 text-[11px] text-slate-400">
          {datasetSkew > 70
            ? '⚠️ High dataset imbalance: The algorithm was fed 4x more historical records from Group A, reinforcing historical bias.'
            : '✅ Balanced dataset: Training data evenly represents different applicant backgrounds.'}
        </p>
      </div>

      {/* Scorecards */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Metric 1 */}
        <div className="bg-slate-950/80 p-4 rounded-xl border border-indigo-500/20 text-center">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 block mb-1">
            Group A Selection Rate
          </span>
          <div className="text-2xl font-bold font-mono text-indigo-300">{rateA.toFixed(0)}%</div>
          <div className="text-[10px] text-slate-400 mt-1">({groupASelected} of {groupACount} chosen)</div>
        </div>

        {/* Metric 2 */}
        <div className="bg-slate-950/80 p-4 rounded-xl border border-indigo-500/20 text-center">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 block mb-1">
            Group B Selection Rate
          </span>
          <div
            className={`text-2xl font-bold font-mono ${
              rateB >= 60 ? 'text-emerald-300' : 'text-rose-400'
            }`}
          >
            {rateB.toFixed(0)}%
          </div>
          <div className="text-[10px] text-slate-400 mt-1">({groupBSelected} of {groupBCount} chosen)</div>
        </div>

        {/* Metric 3 */}
        <div className="bg-slate-950/80 p-4 rounded-xl border border-indigo-500/20 text-center">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 block mb-1">
            Disparate Impact Ratio
          </span>
          <div
            className={`text-2xl font-bold font-mono ${
              isCompliant ? 'text-emerald-300' : 'text-rose-400 animate-pulse'
            }`}
          >
            {disparateImpactRatio}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {isCompliant ? '✅ Meets EEOC 80% Rule' : '❌ Violates 80% Rule (< 0.80)'}
          </div>
        </div>
      </div>

      {/* Candidate Pool Cards */}
      <div className="mt-8">
        <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider block mb-3">
          Applicant Pool Evaluation ({selectedCandidates.length} Selected):
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {APPLICANTS.map((c) => {
            const isChosen = isMitigated ? c.selectedFair : c.selectedRaw;
            return (
              <div
                key={c.id}
                className={`p-3 rounded-xl border transition-all ${
                  isChosen
                    ? 'bg-indigo-950/60 border-indigo-400/60 shadow-md ring-1 ring-indigo-400/40'
                    : 'bg-slate-950/40 border-slate-800 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{c.avatar}</span>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                      isChosen ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {isChosen ? 'ACCEPTED' : 'REJECTED'}
                  </span>
                </div>
                <div className="mt-2 text-xs font-bold text-white">{c.name}</div>
                <div className="text-[10px] text-slate-400">{c.background}</div>
                <div className="mt-1 text-[10px] font-mono text-indigo-300">
                  GPA: {c.gpa} • {c.experienceYears}y exp
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
