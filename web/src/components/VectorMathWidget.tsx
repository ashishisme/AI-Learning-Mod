import React, { useState } from 'react';
import { speechService } from '../services/speechService';

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
  emoji: string;
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
    emoji: '👑',
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
    emoji: '🐾',
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
    emoji: '🌍',
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

  const handleSelectPreset = (p: VectorEquation) => {
    setSelectedEquation(p);
    speechService.playChime('click');
    setTimeout(() => speechService.playChime('success'), 150);
  };

  return (
    <div
      className="my-8 rounded-3xl bg-slate-900 p-6 sm:p-8 text-white shadow-2xl border border-indigo-500/30 relative overflow-hidden"
      data-testid="vector-math-widget"
    >
      {/* Galaxy Stars Glow */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4 relative z-10">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-2xl animate-bounce">✨</span>
            <h3 className="text-lg sm:text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
              Word Constellations: Calculating with Meaning
            </h3>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-300">
            AI turns words into points in space like stars in a galaxy. Watch arithmetic unlock word meanings!
          </p>
        </div>
        <span className="text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
          Word2Vec Space
        </span>
      </div>

      {/* Equation Presets */}
      <div className="mt-6 relative z-10">
        <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2.5">
          Pick a Word Math Puzzle:
        </label>
        <div className="flex flex-wrap gap-2.5">
          {PRESETS.map((p) => {
            const isSelected = selectedEquation.id === p.id;
            return (
              <button
                key={p.id}
                onClick={() => handleSelectPreset(p)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition-all transform hover:scale-[1.02] shadow-sm ${
                  isSelected
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/20 ring-2 ring-indigo-400'
                    : 'bg-slate-800/90 text-slate-200 hover:bg-slate-700/90 border border-slate-700'
                }`}
              >
                <span>{p.emoji}</span>
                <span>{p.name}</span>
                <span className="text-[11px] opacity-80 font-mono bg-black/40 px-2 py-0.5 rounded-md">
                  {p.a} - {p.b} + {p.c}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Live Vector Formula Display */}
      <div className="mt-6 p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3.5 text-sm sm:text-base font-mono relative z-10 shadow-md">
        <span className="px-3.5 py-2 rounded-xl bg-indigo-900/70 border border-indigo-500/50 text-indigo-100 font-bold flex items-center gap-1.5 shadow-sm">
          <span>{aPoint?.emoji}</span>
          <span>{selectedEquation.a}</span>
        </span>
        <span className="text-rose-400 font-black text-xl">-</span>
        <span className="px-3.5 py-2 rounded-xl bg-rose-950/70 border border-rose-500/50 text-rose-100 font-bold flex items-center gap-1.5 shadow-sm">
          <span>{bPoint?.emoji}</span>
          <span>{selectedEquation.b}</span>
        </span>
        <span className="text-emerald-400 font-black text-xl">+</span>
        <span className="px-3.5 py-2 rounded-xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-100 font-bold flex items-center gap-1.5 shadow-sm">
          <span>{cPoint?.emoji}</span>
          <span>{selectedEquation.c}</span>
        </span>
        <span className="text-slate-400 font-black text-xl">=</span>
        <span className="px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-400 text-amber-300 font-extrabold shadow-lg shadow-amber-500/20 animate-pulse flex items-center gap-1.5">
          <span>{expectedPoint?.emoji}</span>
          <span>{nearest.word}</span>
          <span className="text-xs font-mono opacity-90">({similarityScore}% match!)</span>
        </span>
      </div>

      <p className="mt-2.5 text-center text-xs sm:text-sm text-indigo-200/90 italic relative z-10">
        💡 {selectedEquation.explanation}
      </p>

      {highlightedWord && (
        <div className="mt-3 p-3 rounded-xl bg-indigo-900/40 border border-indigo-400/30 text-center text-xs text-indigo-200 relative z-10">
          Selected Star Node: <strong className="text-white">{highlightedWord}</strong> (Space Coordinates: x={VOCABULARY.find(v => v.word === highlightedWord)?.x.toFixed(1)}, y={VOCABULARY.find(v => v.word === highlightedWord)?.y.toFixed(1)})
        </div>
      )}

      {/* 2D Embedding Space Constellation Canvas */}
      <div className="mt-6 relative w-full h-84 sm:h-96 rounded-2xl bg-slate-950 p-4 border border-slate-800 overflow-hidden shadow-inner flex flex-col justify-between">
        {/* Deep Space Background Stars */}
        <div className="absolute inset-0 pointer-events-none opacity-40">
          <div className="absolute top-4 left-10 w-1 h-1 bg-white rounded-full animate-ping" />
          <div className="absolute top-12 left-1/3 w-1.5 h-1.5 bg-cyan-200 rounded-full opacity-60" />
          <div className="absolute bottom-8 left-20 w-1 h-1 bg-purple-200 rounded-full" />
          <div className="absolute top-1/2 right-1/4 w-1.5 h-1.5 bg-amber-200 rounded-full opacity-70" />
          <div className="absolute bottom-16 right-12 w-1 h-1 bg-white rounded-full" />
        </div>

        {/* Constellation Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#312e8115_1px,transparent_1px),linear-gradient(to_bottom,#312e8115_1px,transparent_1px)] bg-[size:36px_36px]"></div>

        {/* Axis Labels */}
        <div className="relative z-10 flex justify-between text-[11px] text-slate-400">
          <span>🌌 Y: Feminine / Youth / City Meaning →</span>
          <span>✨ Semantic Constellation Map</span>
        </div>

        {/* Word Star Nodes */}
        <div className="relative w-full h-full my-2">
          {VOCABULARY.map((item) => {
            const leftPct = (item.x / 10) * 88 + 6;
            const topPct = (1 - item.y / 10) * 82 + 8;

            const isA = item.word === selectedEquation.a;
            const isB = item.word === selectedEquation.b;
            const isC = item.word === selectedEquation.c;
            const isResult = item.word === nearest.word;

            let badgeClass = 'bg-slate-900/90 border-slate-700 text-slate-300 hover:border-slate-500';
            if (isA) badgeClass = 'bg-indigo-600 border-indigo-300 text-white shadow-lg ring-2 ring-indigo-400 scale-105';
            if (isB) badgeClass = 'bg-rose-600 border-rose-300 text-white shadow-lg ring-2 ring-rose-400 scale-105';
            if (isC) badgeClass = 'bg-emerald-600 border-emerald-300 text-white shadow-lg ring-2 ring-emerald-400 scale-105';
            if (isResult)
              badgeClass =
                'bg-amber-500 border-amber-200 text-slate-950 font-black shadow-xl ring-4 ring-amber-400/60 scale-110';

            return (
              <button
                key={item.word}
                style={{ left: `${leftPct}%`, top: `${topPct}%` }}
                onClick={() => {
                  speechService.playChime('click');
                  setHighlightedWord(item.word);
                }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all duration-300 z-10 shadow-sm ${badgeClass}`}
              >
                <span>{item.emoji}</span>
                <span>{item.word}</span>
              </button>
            );
          })}

          {/* Glowing Vector Landing Point */}
          <div
            style={{
              left: `${(calcX / 10) * 88 + 6}%`,
              top: `${(1 - calcY / 10) * 82 + 8}%`,
            }}
            className="absolute -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-2 border-dashed border-amber-300 bg-amber-400/30 animate-ping pointer-events-none"
          />
        </div>

        {/* Bottom Axis Label */}
        <div className="relative z-10 flex justify-between text-[11px] text-slate-400">
          <span>← Origin Point (0,0)</span>
          <span>X: Royalty / Animals / Nations →</span>
        </div>
      </div>
    </div>
  );
};
