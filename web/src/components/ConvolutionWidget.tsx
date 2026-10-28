import React, { useState } from 'react';

type PresetType = 'vertical-edge' | 'horizontal-edge' | 'sharpen' | 'blur' | 'ridge';

interface FilterPreset {
  id: PresetType;
  name: string;
  badge: string;
  description: string;
  kernel: number[][];
  divisor?: number;
}

const PRESETS: FilterPreset[] = [
  {
    id: 'vertical-edge',
    name: 'Vertical Edges',
    badge: 'Sobel Vertical',
    description: 'Catches vertical lines, tree trunks, and wall boundaries.',
    kernel: [
      [-1, 0, 1],
      [-2, 0, 2],
      [-1, 0, 1],
    ],
  },
  {
    id: 'horizontal-edge',
    name: 'Horizontal Edges',
    badge: 'Sobel Horizontal',
    description: 'Catches horizontal lines, ground horizons, and table tops.',
    kernel: [
      [-1, -2, -1],
      [ 0,  0,  0],
      [ 1,  2,  1],
    ],
  },
  {
    id: 'sharpen',
    name: 'Crisp Sharpen',
    badge: 'Detail Booster',
    description: 'Boosts the center pixel while dampening neighbors to make details pop.',
    kernel: [
      [ 0, -1,  0],
      [-1,  5, -1],
      [ 0, -1,  0],
    ],
  },
  {
    id: 'blur',
    name: 'Gentle Blur',
    badge: 'Smoothing Filter',
    description: 'Averages neighboring pixels to smooth out camera grain and noise.',
    kernel: [
      [1, 1, 1],
      [1, 1, 1],
      [1, 1, 1],
    ],
    divisor: 9,
  },
  {
    id: 'ridge',
    name: 'Outline Ridge',
    badge: 'Contour Tracer',
    description: 'Detects sudden changes in all directions, creating an outline sketch.',
    kernel: [
      [-1, -1, -1],
      [-1,  8, -1],
      [-1, -1, -1],
    ],
  },
];

// 6x6 sample image representing a cross / corner pattern
const INITIAL_IMAGE = [
  [  0,   0, 255, 255,   0,   0],
  [  0,   0, 255, 255,   0,   0],
  [255, 255, 255, 255, 255, 255],
  [255, 255, 255, 255, 255, 255],
  [  0,   0, 255, 255,   0,   0],
  [  0,   0, 255, 255,   0,   0],
];

export const ConvolutionWidget: React.FC = () => {
  const [selectedPreset, setSelectedPreset] = useState<PresetType>('vertical-edge');
  const [activeWindow, setActiveWindow] = useState<{ r: number; c: number }>({ r: 1, c: 1 });
  const [image, setImage] = useState<number[][]>(INITIAL_IMAGE);

  const activePreset = PRESETS.find((p) => p.id === selectedPreset) || PRESETS[0];

  // Calculate 4x4 output grid from 6x6 input with 3x3 kernel (valid convolution, no padding)
  const computeOutput = () => {
    const out: number[][] = [];
    const divisor = activePreset.divisor || 1;

    for (let r = 0; r < 4; r++) {
      const row: number[] = [];
      for (let c = 0; c < 4; c++) {
        let sum = 0;
        for (let kr = 0; kr < 3; kr++) {
          for (let kc = 0; kc < 3; kc++) {
            sum += image[r + kr][c + kc] * activePreset.kernel[kr][kc];
          }
        }
        sum = sum / divisor;
        // Clamp and normalize
        const clamped = Math.min(255, Math.max(0, Math.round(Math.abs(sum))));
        row.push(clamped);
      }
      out.push(row);
    }
    return out;
  };

  const outputGrid = computeOutput();

  // Current window calculation for the selected cell
  const getWindowMath = () => {
    const r = activeWindow.r;
    const c = activeWindow.c;
    const steps: { inVal: number; weight: number; prod: number }[] = [];
    let total = 0;

    for (let kr = 0; kr < 3; kr++) {
      for (let kc = 0; kc < 3; kc++) {
        const inVal = image[r + kr][c + kc];
        const weight = activePreset.kernel[kr][kc];
        const prod = inVal * weight;
        total += prod;
        steps.push({ inVal, weight, prod });
      }
    }
    const divisor = activePreset.divisor || 1;
    const finalVal = Math.min(255, Math.max(0, Math.round(Math.abs(total / divisor))));

    return { steps, total, divisor, finalVal };
  };

  const mathDetails = getWindowMath();

  const togglePixel = (row: number, col: number) => {
    const updated = image.map((rArr, rIdx) =>
      rArr.map((val, cIdx) => (rIdx === row && cIdx === col ? (val === 255 ? 0 : 255) : val))
    );
    setImage(updated);
  };

  const resetImage = () => {
    setImage(INITIAL_IMAGE);
  };

  return (
    <div
      className="my-8 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white shadow-2xl border border-indigo-500/30"
      data-testid="convolution-widget"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-indigo-500/20 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">👁️</span>
            <h3 className="text-xl font-bold tracking-tight text-indigo-200">
              Interactive Convolution & Filter Lab
            </h3>
            <span className="rounded-full bg-indigo-500/20 px-2.5 py-0.5 text-xs font-semibold text-indigo-300 border border-indigo-500/30">
              Live CNN Kernel
            </span>
          </div>
          <p className="mt-1 text-xs text-indigo-300/80">
            See how AI cameras slide a 3×3 magnifying filter across pixels to detect edges and shapes!
          </p>
        </div>

        <button
          onClick={resetImage}
          className="text-xs px-3 py-1.5 rounded-lg bg-indigo-900/60 hover:bg-indigo-800 text-indigo-200 border border-indigo-700/50 transition-colors"
        >
          Reset Image Grid
        </button>
      </div>

      {/* Preset selector */}
      <div className="mt-6">
        <label className="text-xs font-semibold text-indigo-300 uppercase tracking-wider block mb-2">
          Select a 3×3 Filter Lens:
        </label>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => {
            const isSelected = selectedPreset === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => setSelectedPreset(preset.id)}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 ring-2 ring-indigo-400'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/80 border border-slate-700'
                }`}
              >
                <span>{preset.name}</span>
                <span className="text-[10px] opacity-75 bg-black/30 px-1.5 py-0.5 rounded">
                  {preset.badge}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-indigo-300/90 italic">
          💡 {activePreset.description}
        </p>
      </div>

      {/* Visual Canvas: Input Grid (6x6) -> 3x3 Kernel -> Output Grid (4x4) */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
        {/* 1. Input Image Grid (6x6) */}
        <div className="flex flex-col items-center bg-slate-950/60 p-4 rounded-xl border border-indigo-500/20">
          <div className="flex items-center justify-between w-full mb-2">
            <span className="text-xs font-bold text-indigo-300">1. Input Image (6×6)</span>
            <span className="text-[10px] text-slate-400">Click cells to toggle</span>
          </div>

          <div className="grid grid-cols-6 gap-1 bg-slate-900 p-2 rounded-lg border border-slate-700">
            {image.map((row, rIdx) =>
              row.map((val, cIdx) => {
                const inKernelWindow =
                  rIdx >= activeWindow.r &&
                  rIdx < activeWindow.r + 3 &&
                  cIdx >= activeWindow.c &&
                  cIdx < activeWindow.c + 3;

                return (
                  <button
                    key={`${rIdx}-${cIdx}`}
                    onClick={() => togglePixel(rIdx, cIdx)}
                    title={`Pixel (${rIdx},${cIdx}) = ${val}`}
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded text-[9px] font-mono flex items-center justify-center transition-all ${
                      val === 255
                        ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                        : 'bg-slate-800 text-slate-400'
                    } ${
                      inKernelWindow
                        ? 'ring-2 ring-cyan-400 scale-95 ring-offset-1 ring-offset-slate-950'
                        : ''
                    }`}
                  >
                    {val === 255 ? '255' : '0'}
                  </button>
                );
              })
            )}
          </div>
          <div className="mt-2 flex items-center gap-2 text-[11px] text-cyan-300">
            <span className="inline-block w-2.5 h-2.5 border-2 border-cyan-400 rounded-sm"></span>
            <span>Cyan outline = Active 3×3 Sliding Window</span>
          </div>
        </div>

        {/* 2. Kernel Matrix (3x3) & Math Step */}
        <div className="flex flex-col items-center bg-indigo-950/40 p-4 rounded-xl border border-indigo-500/30">
          <span className="text-xs font-bold text-cyan-300 mb-2">2. Kernel Weights (3×3)</span>

          <div className="grid grid-cols-3 gap-1 bg-slate-900/90 p-2.5 rounded-lg border border-cyan-500/40 shadow-inner">
            {activePreset.kernel.map((row, kr) =>
              row.map((weight, kc) => (
                <div
                  key={`${kr}-${kc}`}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded bg-cyan-950/80 border border-cyan-600/40 flex items-center justify-center text-xs font-mono font-bold text-cyan-200"
                >
                  {weight > 0 ? `+${weight}` : weight}
                </div>
              ))
            )}
          </div>

          <div className="mt-4 w-full bg-slate-900/90 p-3 rounded-lg border border-indigo-500/20 text-center">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 block mb-1">
              Convolution Calculation
            </span>
            <div className="text-xs font-mono text-indigo-200">
              Σ (Pixel × Weight) = <strong className="text-cyan-300">{mathDetails.total}</strong>
            </div>
            {activePreset.divisor && activePreset.divisor > 1 && (
              <div className="text-[10px] text-slate-400">Divided by {activePreset.divisor}</div>
            )}
            <div className="mt-1 text-sm font-bold text-amber-300">
              Output Pixel Value = {mathDetails.finalVal}
            </div>
          </div>
        </div>

        {/* 3. Output Feature Map (4x4) */}
        <div className="flex flex-col items-center bg-slate-950/60 p-4 rounded-xl border border-indigo-500/20">
          <div className="flex items-center justify-between w-full mb-2">
            <span className="text-xs font-bold text-indigo-300">3. Output Feature Map (4×4)</span>
            <span className="text-[10px] text-slate-400">Click to move window</span>
          </div>

          <div className="grid grid-cols-4 gap-1.5 bg-slate-900 p-2.5 rounded-lg border border-slate-700">
            {outputGrid.map((row, rIdx) =>
              row.map((val, cIdx) => {
                const isSelected = activeWindow.r === rIdx && activeWindow.c === cIdx;
                // Brightness background
                const intensity = val / 255;
                const bgColor = `rgba(59, 130, 246, ${Math.max(0.15, intensity)})`;

                return (
                  <button
                    key={`${rIdx}-${cIdx}`}
                    onClick={() => setActiveWindow({ r: rIdx, c: cIdx })}
                    title={`Output (${rIdx},${cIdx}) = ${val} - Click to inspect filter window`}
                    style={{ backgroundColor: bgColor }}
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded text-[10px] font-mono flex items-center justify-center transition-all border ${
                      isSelected
                        ? 'border-cyan-300 ring-2 ring-cyan-400 scale-105 font-bold text-white shadow-lg'
                        : 'border-slate-700 text-slate-200 hover:border-slate-500'
                    }`}
                  >
                    {val}
                  </button>
                );
              })
            )}
          </div>
          <div className="mt-2 text-[11px] text-slate-400 text-center">
            Brighter squares show strong edge features found by the AI!
          </div>
        </div>
      </div>
    </div>
  );
};
