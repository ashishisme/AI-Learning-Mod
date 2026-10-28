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
    <div className="my-8 p-6 rounded-3xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-md">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div>
          <h4 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            ⚡ Interactive Simulation: The Single Neuron Fruit Sorter
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            A <strong>Perceptron</strong> multiplies each input by a weight, adds a bias, and fires if the sum passes zero!
          </p>
        </div>
        <span className="text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
          Perceptron Playground
        </span>
      </div>

      {/* Preset Buttons */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Test Fruit:</span>
        <button
          onClick={() => handleFruitPreset('apple')}
          className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors shadow-2xs"
        >
          🍎 Sweet & Round Apple
        </button>
        <button
          onClick={() => handleFruitPreset('lemon')}
          className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors shadow-2xs"
        >
          🍋 Sour & Oblong Lemon
        </button>
        <button
          onClick={() => handleFruitPreset('grape')}
          className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors shadow-2xs"
        >
          🍇 Mystery Fruit
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 my-6">
        {/* Left: Input Features & Perceptron Knobs */}
        <div className="space-y-4 p-5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
            1. Inputs & Synaptic Weights
          </span>

          {/* Input 1: Sweetness */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-700 dark:text-slate-200">Input x₁ (Sweetness):</span>
              <span className="text-blue-600 dark:text-blue-400">{sweetness} / 10</span>
            </div>
            <input
              type="range"
              min="0"
              max="10"
              step="1"
              value={sweetness}
              onChange={(e) => setSweetness(parseInt(e.target.value, 10))}
              className="w-full accent-blue-600 cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>Weight w₁ (Sweetness Value):</span>
              <span className="font-bold">{weightSweet.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="-2.0"
              max="2.0"
              step="0.1"
              value={weightSweet}
              onChange={(e) => handleWeightChange(setWeightSweet, parseFloat(e.target.value))}
              className="w-full accent-indigo-500 cursor-pointer"
            />
          </div>

          {/* Input 2: Roundness */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-700">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-700 dark:text-slate-200">Input x₂ (Roundness):</span>
              <span className="text-blue-600 dark:text-blue-400">{roundness} / 10</span>
            </div>
            <input
              type="range"
              min="0"
              max="10"
              step="1"
              value={roundness}
              onChange={(e) => setRoundness(parseInt(e.target.value, 10))}
              className="w-full accent-blue-600 cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>Weight w₂ (Roundness Value):</span>
              <span className="font-bold">{weightRound.toFixed(1)}</span>
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

          {/* Bias Slider */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-700">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-700 dark:text-slate-200">Threshold Bias (b):</span>
              <span className="text-purple-600 dark:text-purple-400">{bias.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="-20.0"
              max="5.0"
              step="0.5"
              value={bias}
              onChange={(e) => handleWeightChange(setBias, parseFloat(e.target.value))}
              className="w-full accent-purple-600 cursor-pointer"
            />
          </div>
        </div>

        {/* Right: The Neuron Cell & Real-Time Activation */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-3">
              2. Neuron Nucleus & Activation
            </span>

            {/* Live Formula Display */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-xs space-y-1">
              <div className="text-slate-400">Sum = (x₁ · w₁) + (x₂ · w₂) + b</div>
              <div className="text-slate-800 dark:text-slate-100 font-bold">
                Sum = ({sweetness} × {weightSweet.toFixed(1)}) + ({roundness} × {weightRound.toFixed(1)}) + ({bias.toFixed(1)})
              </div>
              <div className="text-blue-600 dark:text-blue-400 font-bold text-sm pt-1">
                Total Weighted Sum: <span className={weightedSum >= 0 ? 'text-emerald-500' : 'text-rose-500'}>{weightedSum.toFixed(2)}</span>
              </div>
            </div>

            {/* Threshold Visualizer Meter */}
            <div className="my-5">
              <div className="flex justify-between text-[11px] font-semibold text-slate-500 mb-1">
                <span>Dormant (&lt; 0)</span>
                <span className="font-bold text-slate-900 dark:text-white">Threshold (0.0)</span>
                <span>Fires (≥ 0)</span>
              </div>
              <div className="relative h-6 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden p-0.5">
                <div className="absolute inset-y-0 left-1/2 w-0.5 bg-slate-900 dark:bg-white z-10" />
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isFired ? 'bg-emerald-500' : 'bg-rose-400'
                  }`}
                  style={{
                    width: `${Math.min(100, Math.max(5, (weightedSum + 20) * 2.5))}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Classification Banner */}
          <div
            className={`p-4 rounded-2xl border-2 transition-all flex items-center gap-3.5 animate-fadeIn ${
              isFired
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 ring-2 ring-emerald-300'
                : 'border-amber-400 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-100'
            }`}
          >
            <span className="text-3xl flex-shrink-0">{isFired ? '🍎' : '🍋'}</span>
            <div>
              <strong className="block text-sm sm:text-base font-extrabold">
                {isFired ? 'Neuron Fired! Classified as APPLE' : 'Neuron Dormant: Classified as LEMON'}
              </strong>
              <p className="text-xs font-medium opacity-90">
                {isFired
                  ? 'The weighted sum exceeded the activation threshold, so the neuron signals: Sweet Apple!'
                  : 'The inputs did not provide enough activation energy, so the neuron outputs: Sour Lemon.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
