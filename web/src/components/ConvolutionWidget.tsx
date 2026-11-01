import React, { useState } from 'react';
import { speechService } from '../services/speechService';

type PresetType = 'vertical-edge' | 'horizontal-edge' | 'sharpen' | 'blur' | 'ridge';

interface FilterPreset {
  id: PresetType;
  name: string;
  emoji: string;
  badge: string;
  description: string;
  kernel: number[][];
  divisor?: number;
}

const PRESETS: FilterPreset[] = [
  {
    id: 'vertical-edge',
    name: 'Vertical Edges',
    emoji: '🕶️',
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
    emoji: '👓',
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
    emoji: '🔍',
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
    emoji: '🌫️',
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
    emoji: '✏️',
    badge: 'Contour Tracer',
    description: 'Detects sudden changes in all directions, creating an outline sketch.',
    kernel: [
      [-1, -1, -1],
      [-1,  8, -1],
      [-1, -1, -1],
    ],
  },
];

// Kid-Friendly Sample Drawings
const DRAWINGS: Record<string, { name: string; emoji: string; pixels: number[][] }> = {
  cross: {
    name: 'Cross Pattern',
    emoji: '➕',
    pixels: [
      [  0,   0, 255, 255,   0,   0],
      [  0,   0, 255, 255,   0,   0],
      [255, 255, 255, 255, 255, 255],
      [255, 255, 255, 255, 255, 255],
      [  0,   0, 255, 255,   0,   0],
      [  0,   0, 255, 255,   0,   0],
    ],
  },
  kitty: {
    name: 'Pixel Cat',
    emoji: '🐱',
    pixels: [
      [255,   0,   0,   0,   0, 255],
      [255, 255,   0,   0, 255, 255],
      [255, 255, 255, 255, 255, 255],
      [255,   0, 255, 255,   0, 255],
      [255, 255,   0,   0, 255, 255],
      [  0, 255, 255, 255, 255,   0],
    ],
  },
  rocket: {
    name: 'Space Rocket',
    emoji: '🚀',
    pixels: [
      [  0,   0, 255, 255,   0,   0],
      [  0, 255, 255, 255, 255,   0],
      [  0, 255,   0,   0, 255,   0],
      [  0, 255, 255, 255, 255,   0],
      [255, 255, 255, 255, 255, 255],
      [255,   0, 255, 255,   0, 255],
    ],
  },
};

export const ConvolutionWidget: React.FC = () => {
  const [selectedPreset, setSelectedPreset] = useState<PresetType>('vertical-edge');
  const [activeWindow, setActiveWindow] = useState<{ r: number; c: number }>({ r: 1, c: 1 });
  const [image, setImage] = useState<number[][]>(DRAWINGS.cross.pixels);

  const activePreset = PRESETS.find((p) => p.id === selectedPreset) || PRESETS[0];

  const handleSelectPreset = (id: PresetType) => {
    setSelectedPreset(id);
    speechService.playChime('click');
  };

  const handleSelectDrawing = (key: string) => {
    if (DRAWINGS[key]) {
      setImage(DRAWINGS[key].pixels);
      speechService.playChime('success');
    }
  };

  // Calculate 4x4 output grid from 6x6 input with 3x3 kernel (valid convolution)
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
    let total = 0;

    for (let kr = 0; kr < 3; kr++) {
      for (let kc = 0; kc < 3; kc++) {
        const inVal = image[r + kr][c + kc];
        const weight = activePreset.kernel[kr][kc];
        total += inVal * weight;
      }
    }
    const divisor = activePreset.divisor || 1;
    const finalVal = Math.min(255, Math.max(0, Math.round(Math.abs(total / divisor))));

    return { total, divisor, finalVal };
  };

  const mathDetails = getWindowMath();

  const togglePixel = (row: number, col: number) => {
    speechService.playChime('click');
    const updated = image.map((rArr, rIdx) =>
      rArr.map((val, cIdx) => (rIdx === row && cIdx === col ? (val === 255 ? 0 : 255) : val))
    );
    setImage(updated);
  };

  const resetImage = () => {
    speechService.playChime('click');
    setImage(DRAWINGS.cross.pixels);
  };

  return (
    <div
      className="my-8 rounded-3xl bg-slate-900 p-6 sm:p-8 text-white shadow-2xl border border-indigo-500/30 relative overflow-hidden"
      data-testid="convolution-widget"
    >
      {/* Background Glow */}
      <div className="absolute -top-24 -right-24 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4 relative z-10">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-2xl animate-bounce">👁️</span>
            <h3 className="text-lg sm:text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
              Interactive Convolution & Filter Lab
            </h3>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-300">
            See how AI cameras slide a 3×3 magnifying filter across pixels to detect edges and shapes!
          </p>
        </div>

        <button
          onClick={resetImage}
          className="text-xs px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all shadow-sm"
        >
          🔄 Reset Drawing
        </button>
      </div>

      {/* Kid Drawing Preset Chooser */}
      <div className="mt-5 p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 relative z-10 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-wider text-cyan-300">
          🎨 Choose a Pixel Drawing (or click pixels below to draw):
        </span>
        <div className="flex items-center gap-2">
          {Object.entries(DRAWINGS).map(([key, draw]) => (
            <button
              key={key}
              onClick={() => handleSelectDrawing(key)}
              className="px-3 py-1 rounded-xl bg-slate-900 border border-slate-700 hover:border-cyan-400 text-xs font-semibold text-slate-200 transition-all flex items-center gap-1.5 shadow-xs"
            >
              <span>{draw.emoji}</span>
              <span>{draw.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Preset Filter Lenses */}
      <div className="mt-6 relative z-10">
        <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2.5">
          Select a 3×3 Filter Lens:
        </label>
        <div className="flex flex-wrap gap-2.5">
          {PRESETS.map((preset) => {
            const isSelected = selectedPreset === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => handleSelectPreset(preset.id)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all transform hover:scale-[1.02] shadow-sm ${
                  isSelected
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20 ring-2 ring-cyan-400'
                    : 'bg-slate-800/90 text-slate-200 hover:bg-slate-700/90 border border-slate-700'
                }`}
              >
                <span className="text-sm">{preset.emoji}</span>
                <span>{preset.name}</span>
                <span className="text-[10px] opacity-80 bg-black/40 px-1.5 py-0.5 rounded-md font-mono">
                  {preset.badge}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-2.5 text-xs sm:text-sm text-cyan-200/90 italic flex items-center gap-1.5">
          <span>💡</span>
          <span>{activePreset.description}</span>
        </p>
      </div>

      {/* Visual Canvas: 1. Input Grid (6x6) -> 2. 3x3 Kernel -> 3. Output Grid (4x4) */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6 items-center relative z-10">
        {/* 1. Input Image Grid (6x6) */}
        <div className="flex flex-col items-center bg-slate-950/80 p-5 rounded-2xl border border-slate-800 shadow-md">
          <div className="flex items-center justify-between w-full mb-3">
            <span className="text-xs font-extrabold text-cyan-300">1. Input Image (6×6)</span>
            <span className="text-[11px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded-md">
              Tap square to toggle
            </span>
          </div>

          <div className="grid grid-cols-6 gap-1.5 bg-slate-900 p-2.5 rounded-xl border border-slate-700 shadow-inner">
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
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-[9px] font-mono flex items-center justify-center transition-all ${
                      val === 255
                        ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                        : 'bg-slate-800 text-slate-400'
                    } ${
                      inKernelWindow
                        ? 'ring-2 ring-cyan-400 scale-95 ring-offset-2 ring-offset-slate-950'
                        : ''
                    }`}
                  >
                    {val === 255 ? '255' : '0'}
                  </button>
                );
              })
            )}
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-cyan-300">
            <span className="inline-block w-3 h-3 border-2 border-cyan-400 rounded-sm"></span>
            <span>Cyan outline = Active 3×3 Robot Lens</span>
          </div>
        </div>

        {/* 2. Kernel Matrix (3x3) & Live Calculation */}
        <div data-math="true" className="flex flex-col items-center bg-slate-950/80 p-5 rounded-2xl border border-cyan-500/30 shadow-md">
          <span className="text-xs font-extrabold text-cyan-300 mb-3">2. Robot Lens Weights (3×3)</span>

          <div className="grid grid-cols-3 gap-1.5 bg-slate-900 p-2.5 rounded-xl border border-cyan-500/40 shadow-inner">
            {activePreset.kernel.map((row, kr) =>
              row.map((weight, kc) => (
                <div
                  key={`${kr}-${kc}`}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-cyan-950/80 border border-cyan-600/40 flex items-center justify-center text-xs font-mono font-black text-cyan-200"
                >
                  {weight > 0 ? `+${weight}` : weight}
                </div>
              ))
            )}
          </div>

          <div className="mt-4 w-full bg-slate-900 p-3.5 rounded-xl border border-slate-700/80 text-center">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1">
              Live Lens Math
            </span>
            <div className="text-xs font-mono text-cyan-200">
              Sum = <strong className="text-cyan-300">{mathDetails.total}</strong>
            </div>
            {activePreset.divisor && activePreset.divisor > 1 && (
              <div className="text-[10px] text-slate-400">Averaged by {activePreset.divisor}</div>
            )}
            <div className="mt-1.5 text-sm sm:text-base font-black text-amber-300">
              Output Pixel Value = {mathDetails.finalVal}
            </div>
          </div>
        </div>

        {/* 3. Output Feature Map (4x4) */}
        <div className="flex flex-col items-center bg-slate-950/80 p-5 rounded-2xl border border-slate-800 shadow-md">
          <div className="flex items-center justify-between w-full mb-3">
            <span className="text-xs font-extrabold text-indigo-300">3. Filtered Feature Map (4×4)</span>
            <span className="text-[11px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded-md">
              Click to slide lens
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2 bg-slate-900 p-2.5 rounded-xl border border-slate-700 shadow-inner">
            {outputGrid.map((row, rIdx) =>
              row.map((val, cIdx) => {
                const isSelected = activeWindow.r === rIdx && activeWindow.c === cIdx;
                const intensity = val / 255;
                const bgColor = `rgba(56, 189, 248, ${Math.max(0.12, intensity)})`;

                return (
                  <button
                    key={`${rIdx}-${cIdx}`}
                    onClick={() => {
                      speechService.playChime('click');
                      setActiveWindow({ r: rIdx, c: cIdx });
                    }}
                    title={`Output (${rIdx},${cIdx}) = ${val} - Click to slide lens here`}
                    style={{ backgroundColor: bgColor }}
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg text-[10px] font-mono flex items-center justify-center transition-all border ${
                      isSelected
                        ? 'border-cyan-300 ring-2 ring-cyan-400 scale-105 font-black text-white shadow-lg'
                        : 'border-slate-700 text-slate-200 hover:border-slate-500'
                    }`}
                  >
                    {val}
                  </button>
                );
              })
            )}
          </div>
          <div className="mt-3 text-[11px] text-slate-300 text-center">
            ✨ Glowing squares show where the lens spotted an edge!
          </div>
        </div>
      </div>
    </div>
  );
};
