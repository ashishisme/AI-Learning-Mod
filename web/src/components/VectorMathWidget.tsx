import React, { useState } from 'react';

interface WordPoint {
  word: string;
  emoji: string;
  category: 'royalty' | 'animals' | 'places' | 'tech';
  x: number; // 0 to 10
  y: number; // 0 to 10
}

interface VectorEquation {
  id: string;
  name: string;
  a: string;
  op1: '-' | '+';
  b: string;
  op2: '+';
  c: string;
  expected: string;
  explanation: string;
}

const VOCABULARY: WordPoint[] = [
  // Royalty & Gender
  { word: 'King', emoji: '👑', category: 'royalty', x: 8.5, y: 8.5 },
  { word: 'Queen', emoji: '👸', category: 'royalty', x: 8.5, y: 6.5 },
  { word: 'Man', emoji: '👨', category: 'royalty', x: 5.0, y: 8.5 },
  { word: 'Woman', emoji: '👩', category: 'royalty', x: 5.0, y: 6.5 },

  // Animals & Youth
  { word: 'Dog', emoji: '🐕', category: 'animals', x: 2.5, y: 8.5 },
  { word: 'Puppy', emoji: '🐶', category: 'animals', x: 2.5, y: 6.5 },
  { word: 'Cat', emoji: '🐈', category: 'animals', x: 1.5, y: 8.5 },
  { word: 'Kitten', emoji: '🐱', category: 'animals', x: 1.5, y: 6.5 },

  // Places & Capitals
  { word: 'France', emoji: '🇫🇷', category: 'places', x: 8.0, y: 2.5 },
  { word: 'Paris', emoji: '🗼', category: 'places', x: 8.0, y: 4.5 },
  { word: 'Japan', emoji: '🇯🇵', category: 'places', x: 3.5, y: 2.5 },
  { word: 'Tokyo', emoji: '🏯', category: 'places', x: 3.5, y: 4.5 },
];

const PRESETS: VectorEquation[] = [
  {
    id: 'royalty',
    name: 'Gender Analogies',
    a: 'King',
    op1: '-',
    b: 'Man',
    op2: '+',
    c: 'Woman',
    expected: 'Queen',
    explanation: 'Subtracting "male" from "King" leaves royalty. Adding "female" yields "Queen"!',
  },
  {
    id: 'animals',
    name: 'Pet Maturity',
    a: 'Puppy',
    op1: '-',
    b: 'Dog',
    op2: '+',
    c: 'Cat',
    expected: 'Kitten',
    explanation: 'The youth concept ("young animal") transfers from dogs to cats to find "Kitten"!',
  },
  {
    id: 'geography',
    name: 'World Capitals',
    a: 'Paris',
    op1: '-',
    b: 'France',
    op2: '+',
    c: 'Japan',
    expected: 'Tokyo',
    explanation: 'Removing France from Paris isolates the "Capital city" vector, and adding Japan points to Tokyo!',
  },
];

export const VectorMathWidget: React.FC = () => {
  const [selectedEquation, setSelectedEquation] = useState<VectorEquation>(PRESETS[0]);
  const [highlightedWord, setHighlightedWord] = useState<string | null>(null);

  // Compute calculated coordinate
  const getWord = (name: string) => VOCABULARY.find((v) => v.word.toLowerCase() === name.toLowerCase());

  const aPoint = getWord(selectedEquation.a);
  const bPoint = getWord(selectedEquation.b);
  const cPoint = getWord(selectedEquation.c);
  const expectedPoint = getWord(selectedEquation.expected);

  let calcX = 0;
  let calcY = 0;
  if (aPoint && bPoint && cPoint) {
    calcX = aPoint.x - bPoint.x + cPoint.x;
    calcY = aPoint.y - bPoint.y + cPoint.y;
  }

  // Find nearest neighbor word to calcX, calcY
  const getNearest = () => {
    let nearest = VOCABULARY[0];
    let minDist = Infinity;
    VOCABULARY.forEach((pt) => {
      const dist = Math.hypot(pt.x - calcX, pt.y - calcY);
      if (dist < minDist) {
        minDist = dist;
        nearest = pt;
      }
    });
    return { nearest, dist: minDist };
  };

  const { nearest, dist } = getNearest();
  const similarityScore = Math.max(0, Math.min(100, Math.round((1 - dist / 10) * 100)));

  return (
    <div
      className="my-8 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white shadow-2xl border border-indigo-500/30"
      data-testid="vector-math-widget"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-indigo-500/20 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">💬</span>
            <h3 className="text-xl font-bold tracking-tight text-indigo-200">
              Interactive Word Vector Space & Math Lab
            </h3>
            <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-300 border border-emerald-500/30">
              Semantic Embeddings
            </span>
          </div>
          <p className="mt-1 text-xs text-indigo-300/80">
            See how AI plots words as points in space so that math formulas unlock semantic meaning!
          </p>
        </div>
      </div>

      {/* Preset Buttons */}
      <div className="mt-6">
        <label className="text-xs font-semibold text-indigo-300 uppercase tracking-wider block mb-2">
          Choose a Word Math Formula:
        </label>
        <div className="flex flex-wrap gap-2.5">
          {PRESETS.map((p) => {
            const isSelected = selectedEquation.id === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setSelectedEquation(p)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 ring-2 ring-indigo-400'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/80 border border-slate-700'
                }`}
              >
                <span>{p.name}</span>
                <span className="text-[11px] opacity-80 font-mono bg-black/30 px-2 py-0.5 rounded">
                  {p.a} - {p.b} + {p.c}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Live Vector Formula Display */}
      <div className="mt-6 p-4 rounded-xl bg-slate-950/70 border border-indigo-500/20 flex flex-wrap items-center justify-center gap-3 text-sm sm:text-base font-mono">
        <span className="px-3 py-1.5 rounded-lg bg-indigo-900/60 border border-indigo-500/40 text-indigo-200 font-bold">
          {aPoint?.emoji} {selectedEquation.a}
        </span>
        <span className="text-rose-400 font-bold text-lg">-</span>
        <span className="px-3 py-1.5 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-200 font-bold">
          {bPoint?.emoji} {selectedEquation.b}
        </span>
        <span className="text-emerald-400 font-bold text-lg">+</span>
        <span className="px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 font-bold">
          {cPoint?.emoji} {selectedEquation.c}
        </span>
        <span className="text-slate-400 font-bold text-lg">=</span>
        <span className="px-4 py-1.5 rounded-lg bg-amber-500/20 border border-amber-400 text-amber-300 font-bold shadow-lg shadow-amber-500/20 animate-pulse">
          {expectedPoint?.emoji} {nearest.word} ({similarityScore}% match!)
        </span>
      </div>
      <p className="mt-2 text-center text-xs text-indigo-300/90 italic">
        💡 {selectedEquation.explanation}
      </p>

      {highlightedWord && (
        <div className="mt-3 p-2.5 rounded-lg bg-indigo-900/40 border border-indigo-400/30 text-center text-xs text-indigo-200">
          Selected Word: <strong className="text-white">{highlightedWord}</strong> (Coordinates in Vector Space: x={VOCABULARY.find(v => v.word === highlightedWord)?.x.toFixed(1)}, y={VOCABULARY.find(v => v.word === highlightedWord)?.y.toFixed(1)})
        </div>
      )}

      {/* 2D Embedding Scatter Map */}
      <div className="mt-8 relative w-full h-80 sm:h-96 rounded-xl bg-slate-950 p-4 border border-slate-800 overflow-hidden shadow-inner flex flex-col justify-between">
        {/* Subtle grid lines */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e1b4b15_1px,transparent_1px),linear-gradient(to_bottom,#1e1b4b15_1px,transparent_1px)] bg-[size:32px_32px]"></div>

        {/* Top/Axis Labels */}
        <div className="relative z-10 flex justify-between text-[11px] text-slate-500">
          <span>Y: Feminine / Youth / City →</span>
          <span>Semantic Map (Word2Vec Space)</span>
        </div>

        {/* Word nodes plotted in 2D space */}
        <div className="relative w-full h-full my-2">
          {VOCABULARY.map((item) => {
            const leftPct = (item.x / 10) * 88 + 6;
            // Invert Y for Cartesian plot
            const topPct = (1 - item.y / 10) * 82 + 8;

            const isA = item.word === selectedEquation.a;
            const isB = item.word === selectedEquation.b;
            const isC = item.word === selectedEquation.c;
            const isResult = item.word === nearest.word;

            let badgeClass = 'bg-slate-800/80 border-slate-700 text-slate-300 hover:border-slate-500';
            if (isA) badgeClass = 'bg-indigo-600/90 border-indigo-400 text-white shadow-lg ring-2 ring-indigo-400';
            if (isB) badgeClass = 'bg-rose-600/90 border-rose-400 text-white shadow-lg ring-2 ring-rose-400';
            if (isC) badgeClass = 'bg-emerald-600/90 border-emerald-400 text-white shadow-lg ring-2 ring-emerald-400';
            if (isResult)
              badgeClass =
                'bg-amber-500/90 border-amber-300 text-slate-950 font-bold shadow-xl ring-4 ring-amber-400/50 scale-110';

            return (
              <button
                key={item.word}
                style={{ left: `${leftPct}%`, top: `${topPct}%` }}
                onClick={() => setHighlightedWord(item.word)}
                className={`absolute -translate-x-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all duration-300 z-10 ${badgeClass}`}
              >
                <span>{item.emoji}</span>
                <span>{item.word}</span>
              </button>
            );
          })}

          {/* Calculated Vector Point Indicator */}
          <div
            style={{
              left: `${(calcX / 10) * 88 + 6}%`,
              top: `${(1 - calcY / 10) * 82 + 8}%`,
            }}
            className="absolute -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-dashed border-amber-400 bg-amber-400/30 animate-ping pointer-events-none"
          />
        </div>

        {/* Bottom Axis Label */}
        <div className="relative z-10 flex justify-between text-[11px] text-slate-500">
          <span>← Origin (0,0)</span>
          <span>X: Royalty / Animal / Nation →</span>
        </div>
      </div>
    </div>
  );
};
