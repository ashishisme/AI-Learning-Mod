import React, { useState } from 'react';
import { speechService } from '../services/speechService';

export const PerceptronWidget: React.FC = () => {
  // Input features: Sweetness (0-10) and Roundness (0-10)
  const [sweetness, setSweetness] = useState<number>(8);
  const [roundness, setRoundness] = useState<number>(7);

  // Neuron parameters: weights (w1, w2) and bias (b)
  const [weightSweet, setWeightSweet] = useState<number>(1.2);
  const [weightRound, setWeightRound] = useState<number>(0.8);
  const [bias, setBias] = useState<number>(-10.0);

  // Calculation
  const term1 = sweetness * weightSweet;
  const term2 = roundness * weightRound;
  const weightedSum = term1 + term2 + bias;
  const isFired = weightedSum >= 0;

  const handleFruitPreset = (type: 'apple' | 'lemon' | 'grape') => {
    speechService.playChime('click');
    if (type === 'apple') {
      setSweetness(9);
      setRoundness(8);
    } else if (type === 'lemon') {
      setSweetness(2);
      setRoundness(4);
    } else {
      setSweetness(7);
      setRoundness(3);
    }
  };

  const handleWeightChange = (setter: React.Dispatch<React.SetStateAction<number>>, val: number) => {
    setter(val);
    const newSum = (sweetness * (setter === setWeightSweet ? val : weightSweet)) +
                   (roundness * (setter === setWeightRound ? val : weightRound)) +
                   (setter === setBias ? val : bias);
    if ((newSum >= 0) !== isFired) {
      speechService.playChime(newSum >= 0 ? 'success' : 'click');
    }
  };

  return (
    <div className="my-8 p-6 sm:p-8 rounded-3xl bg-slate-900 text-white border border-emerald-500/30 shadow-2xl relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute -top-24 -right-24 w-80 h-80 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 relative z-10 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-2xl animate-bounce">⚡</span>
            <h4 className="text-lg sm:text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
              The Single Neuron Fruit Sorter
            </h4>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Meet <strong>Sparky the Brain Cell</strong>! Adjust his sensitivity dials to teach him how to tell apples from lemons!
          </p>
        </div>
        <span className="text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
          Interactive Perceptron
        </span>
      </div>

      {/* Preset Fruit Buttons (Conveyor Belt Selector) */}
      <div className="mb-6 p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 relative z-10">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-2.5">
          🛒 Step 1: Drop a Fruit onto the Conveyor Belt:
        </span>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => handleFruitPreset('apple')}
            className={`px-3.5 py-2 rounded-xl border text-xs sm:text-sm font-bold transition-all shadow-md flex items-center gap-2 transform hover:scale-105 ${
              sweetness === 9 && roundness === 8
                ? 'border-emerald-400 bg-emerald-500/30 text-white ring-2 ring-emerald-400'
                : 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
          >
            🍎 Sweet & Round Apple
          </button>
          <button
            onClick={() => handleFruitPreset('lemon')}
            className={`px-3.5 py-2 rounded-xl border text-xs sm:text-sm font-bold transition-all shadow-md flex items-center gap-2 transform hover:scale-105 ${
              sweetness === 2 && roundness === 4
                ? 'border-amber-400 bg-amber-500/30 text-white ring-2 ring-amber-400'
                : 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
          >
            🍋 Sour & Oblong Lemon
          </button>
          <button
            onClick={() => handleFruitPreset('grape')}
            className={`px-3.5 py-2 rounded-xl border text-xs sm:text-sm font-bold transition-all shadow-md flex items-center gap-2 transform hover:scale-105 ${
              sweetness === 7 && roundness === 3
                ? 'border-purple-400 bg-purple-500/30 text-white ring-2 ring-purple-400'
                : 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
          >
            🍇 Mystery Fruit
          </button>
        </div>
      </div>

      {/* Main Interactive Stage: Sparky the Neuron Canvas */}
      <div className="mb-6 rounded-2xl bg-slate-950 border border-slate-800 p-4 sm:p-6 relative overflow-hidden shadow-inner">
        <div className="flex flex-col items-center justify-center">
          <svg viewBox="0 0 480 200" className="w-full max-w-lg h-auto select-none filter drop-shadow-xl">
            {/* Left Input Dendrites */}
            {/* Dendrite 1: Sweetness */}
            <g transform="translate(40, 45)">
              <rect x="0" y="0" width="85" height="32" rx="10" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
              <text x="42" y="20" textAnchor="middle" fill="#38bdf8" fontSize="11" fontWeight="bold">
                🍬 Sugar: {sweetness}
              </text>
              {/* Wire leading to Sparky */}
              <path d="M 85,16 Q 140,16 175,80" fill="none" stroke="#38bdf8" strokeWidth={Math.max(1.5, weightSweet * 2.5)} strokeDasharray="4 2" />
            </g>

            {/* Dendrite 2: Roundness */}
            <g transform="translate(40, 125)">
              <rect x="0" y="0" width="85" height="32" rx="10" fill="#1e293b" stroke="#818cf8" strokeWidth="2" />
              <text x="42" y="20" textAnchor="middle" fill="#818cf8" fontSize="11" fontWeight="bold">
                ⚽ Round: {roundness}
              </text>
              {/* Wire leading to Sparky */}
              <path d="M 85,16 Q 140,16 175,110" fill="none" stroke="#818cf8" strokeWidth={Math.max(1.5, weightRound * 2.5)} strokeDasharray="4 2" />
            </g>

            {/* Central Sparky Neuron Character */}
            <g transform="translate(180, 50)">
              {/* Outer Energy Pulse Ring */}
              <circle
                cx="50"
                cy="50"
                r="46"
                fill={isFired ? '#059669' : '#1e293b'}
                opacity={isFired ? 0.3 : 0.6}
                className={isFired ? 'animate-ping' : ''}
              />
              {/* Sparky Main Body */}
              <circle
                cx="50"
                cy="50"
                r="42"
                fill={isFired ? '#10b981' : '#334155'}
                stroke={isFired ? '#34d399' : '#64748b'}
                strokeWidth="4"
                className="transition-colors duration-300"
              />

              {/* Sparky's Top Lightbulb */}
              <g transform="translate(42, -14)">
                <rect x="5" y="14" width="6" height="6" fill="#64748b" rx="1" />
                <circle
                  cx="8"
                  cy="7"
                  r="10"
                  fill={isFired ? '#facc15' : '#475569'}
                  stroke={isFired ? '#fef08a' : '#64748b'}
                  strokeWidth="2"
                  className={isFired ? 'animate-pulse' : ''}
                />
                {isFired && (
                  <text x="8" y="11" textAnchor="middle" fill="#78350f" fontSize="11" fontWeight="bold">
                    💡
                  </text>
                )}
              </g>

              {/* Sparky's Expressive Eyes */}
              {isFired ? (
                <>
                  <circle cx="36" cy="45" r="5" fill="#ffffff" />
                  <circle cx="36" cy="45" r="2.5" fill="#065f46" />
                  <circle cx="64" cy="45" r="5" fill="#ffffff" />
                  <circle cx="64" cy="45" r="2.5" fill="#065f46" />
                  {/* Big Happy Mouth */}
                  <path d="M 38,62 Q 50,75 62,62" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
                </>
              ) : (
                <>
                  {/* Pucker Eyes */}
                  <text x="36" y="48" textAnchor="middle" fill="#94a3b8" fontSize="13" fontWeight="bold">&gt;</text>
                  <text x="64" y="48" textAnchor="middle" fill="#94a3b8" fontSize="13" fontWeight="bold">&lt;</text>
                  {/* Sour Pucker Mouth */}
                  <circle cx="50" cy="62" r="3" fill="#94a3b8" />
                </>
              )}
            </g>

            {/* Right Output Axon Wire */}
            <path
              d="M 275,100 L 355,100"
              fill="none"
              stroke={isFired ? '#10b981' : '#f59e0b'}
              strokeWidth="5"
              strokeLinecap="round"
              className={isFired ? 'animate-pulse' : ''}
            />

            {/* Output Destination Box */}
            <g transform="translate(360, 65)">
              <rect
                x="0"
                y="0"
                width="100"
                height="70"
                rx="14"
                fill={isFired ? '#064e3b' : '#78350f'}
                stroke={isFired ? '#34d399' : '#fbbf24'}
                strokeWidth="2.5"
                className="transition-colors duration-300"
              />
              <text x="50" y="32" textAnchor="middle" fontSize="24">
                {isFired ? '🍎' : '🍋'}
              </text>
              <text
                x="50"
                y="54"
                textAnchor="middle"
                fill={isFired ? '#a7f3d0' : '#fef08a'}
                fontSize="11"
                fontWeight="extrabold"
              >
                {isFired ? 'APPLE' : 'LEMON'}
              </text>
            </g>
          </svg>
        </div>
      </div>

      {/* Dials & Controls (Split Screen) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 my-6">
        {/* Left: Sensitivity Tuning Knobs */}
        <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
              2. Sparky's Brain Sensitivity Dials
            </span>
            <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full font-mono">
              Weights (w) & Bias (b)
            </span>
          </div>

          {/* Dial 1: Sweetness Weight */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-200">🍬 How much does Sparky love sugar? (Weight w₁):</span>
              <span className="text-blue-400 font-bold">{weightSweet.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="-2.0"
              max="2.0"
              step="0.1"
              value={weightSweet}
              onChange={(e) => handleWeightChange(setWeightSweet, parseFloat(e.target.value))}
              className="w-full accent-blue-500 cursor-pointer"
            />
          </div>

          {/* Dial 2: Roundness Weight */}
          <div className="space-y-1.5 pt-2 border-t border-slate-700/60">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-200">⚽ How much does Sparky love roundness? (Weight w₂):</span>
              <span className="text-indigo-400 font-bold">{weightRound.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="-2.0"
              max="2.0"
              step="0.1"
              value={weightRound}
              onChange={(e) => handleWeightChange(setWeightRound, parseFloat(e.target.value))}
              className="w-full accent-indigo-500 cursor-pointer"
            />
          </div>

          {/* Dial 3: Bias / Pickiness */}
          <div className="space-y-1.5 pt-2 border-t border-slate-700/60">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-200">⚖️ How picky is Sparky? (Threshold Bias b):</span>
              <span className="text-purple-400 font-bold">{bias.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="-20.0"
              max="5.0"
              step="0.5"
              value={bias}
              onChange={(e) => handleWeightChange(setBias, parseFloat(e.target.value))}
              className="w-full accent-purple-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Right: Real-Time Activation Gauge & Decision */}
        <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-700/60 pb-2 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                3. Activation Score & Decision
              </span>
              <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full font-mono">
                Threshold = 0
              </span>
            </div>

            {/* Kid Explanation Score Bar */}
            <div data-math="true" className="p-3.5 rounded-xl bg-slate-900 border border-slate-700 text-xs space-y-1.5 font-sans">
              <div className="text-slate-400">Total Fruit Delight Score:</div>
              <div className="text-base sm:text-lg font-black flex items-center gap-2">
                <span className={isFired ? 'text-emerald-400' : 'text-rose-400'}>
                  {weightedSum >= 0 ? `+${weightedSum.toFixed(1)} (Above 0)` : `${weightedSum.toFixed(1)} (Below 0)`}
                </span>
              </div>
              <div className="text-[11px] text-slate-400">
                Formula: ({sweetness} × {weightSweet.toFixed(1)}) + ({roundness} × {weightRound.toFixed(1)}) + ({bias.toFixed(1)})
              </div>
            </div>

            {/* Threshold Progress Bar */}
            <div className="my-4">
              <div className="flex justify-between text-[11px] font-semibold text-slate-400 mb-1">
                <span>Sour Lemon (&lt; 0)</span>
                <span className="text-white font-bold">Goal Line: 0.0</span>
                <span>Sweet Apple (≥ 0)</span>
              </div>
              <div className="relative h-6 bg-slate-900 rounded-full overflow-hidden p-1 border border-slate-700">
                <div className="absolute inset-y-0 left-1/2 w-1 bg-white z-10 shadow-sm" />
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isFired ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-rose-500'
                  }`}
                  style={{
                    width: `${Math.min(100, Math.max(8, (weightedSum + 20) * 2.5))}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Final Classification Banner (Exact text match for Playwright tests) */}
          <div
            className={`p-4 rounded-xl border-2 transition-all flex items-center gap-3.5 ${
              isFired
                ? 'border-emerald-500 bg-emerald-500/20 text-emerald-100 ring-2 ring-emerald-500/30'
                : 'border-amber-500 bg-amber-500/20 text-amber-100 ring-2 ring-amber-500/30'
            }`}
          >
            <span className="text-3xl flex-shrink-0">{isFired ? '🍎' : '🍋'}</span>
            <div>
              <strong className="block text-sm sm:text-base font-extrabold">
                {isFired ? 'Neuron Fired! Classified as APPLE' : 'Neuron Dormant: Classified as LEMON'}
              </strong>
              <p className="text-xs font-medium opacity-90 mt-0.5">
                {isFired
                  ? 'Sparky reached his threshold and fired! The fruit goes straight to the Apple basket!'
                  : 'Not enough sweetness or roundness to trigger Sparky. Sorted into the Lemon crate!'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
