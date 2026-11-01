import React, { useState } from 'react';
import { speechService } from '../services/speechService';

interface SensorFacts {
  dustyPanels: boolean;
  lowBattery: boolean;
  dishMisaligned: boolean;
  isNighttime: boolean;
}

export const ExpertSystemWidget: React.FC = () => {
  const [sensors, setSensors] = useState<SensorFacts>({
    dustyPanels: true,
    lowBattery: true,
    dishMisaligned: false,
    isNighttime: false,
  });

  const toggleSensor = (key: keyof SensorFacts) => {
    speechService.playChime('click');
    setSensors((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      // Check if diagnostic solved
      if (!next.dustyPanels && !next.lowBattery && !next.dishMisaligned && !next.isNighttime) {
        setTimeout(() => speechService.playChime('success'), 120);
      }
      return next;
    });
  };

  const handleFixAll = () => {
    speechService.playChime('success');
    setSensors({
      dustyPanels: false,
      lowBattery: false,
      dishMisaligned: false,
      isNighttime: false,
    });
  };

  // Inference Engine Rules Evaluation (Forward Chaining)
  const rule1Fires = sensors.dustyPanels && !sensors.isNighttime;
  const powerDegraded = rule1Fires;

  const rule2Fires = powerDegraded && sensors.lowBattery;
  const safeMode = rule2Fires;

  const rule3Fires = sensors.dishMisaligned;
  const commSignalLost = rule3Fires;

  const rule4Fires = safeMode && commSignalLost;

  // Determine Final Diagnosis & Rover Expressions
  let diagnosis = "✅ All Systems Nominal: Mars Rover is exploring smoothly.";
  let recommendation = "All systems operating at 100%! Geological drill and rock scanner active.";
  let statusTone = "border-emerald-500/80 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100 ring-2 ring-emerald-400/40";
  let roverMood: 'happy' | 'warning' | 'emergency' | 'night' = 'happy';
  let roverMouth = '( ^‿^ )';

  if (rule4Fires) {
    diagnosis = "🚨 Critical Rover Emergency: Safe Mode + Communications Failure!";
    recommendation = "Command: Emergency halt! Brush solar panels and re-aim antenna immediately!";
    statusTone = "border-rose-500/80 bg-rose-500/10 text-rose-900 dark:text-rose-100 ring-2 ring-rose-500/40 animate-pulse";
    roverMood = 'emergency';
    roverMouth = '( >_< 🚨 )';
  } else if (safeMode) {
    diagnosis = "⚠️ Warning: Low-Power Safe Mode Activated.";
    recommendation = "Command: Motors halted to conserve power. Solar arrays require cleaning.";
    statusTone = "border-amber-500/80 bg-amber-500/10 text-amber-900 dark:text-amber-100 ring-2 ring-amber-400/40";
    roverMood = 'warning';
    roverMouth = '( •_• )';
  } else if (commSignalLost) {
    diagnosis = "📡 Advisory: High Communication Signal Attenuation.";
    recommendation = "Command: Realign parabolic dish toward Mars Reconnaissance Orbiter.";
    statusTone = "border-blue-500/80 bg-blue-500/10 text-blue-900 dark:text-blue-100 ring-2 ring-blue-400/40";
    roverMood = 'warning';
    roverMouth = '( ⚆_⚆ )';
  } else if (sensors.isNighttime && sensors.lowBattery) {
    diagnosis = "🌙 Martian Nightfall: Hibernation Cycle.";
    recommendation = "Command: Night heaters on. Sleeping under Phobos until dawn.";
    statusTone = "border-indigo-500/80 bg-indigo-500/10 text-indigo-900 dark:text-indigo-100 ring-2 ring-indigo-400/40";
    roverMood = 'night';
    roverMouth = '( -_- )zzZ';
  }

  const isNominal = !sensors.dustyPanels && !sensors.lowBattery && !sensors.dishMisaligned && !sensors.isNighttime;

  return (
    <div className="my-8 p-6 sm:p-8 rounded-3xl bg-slate-900 text-white border border-indigo-500/30 shadow-2xl relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 relative z-10 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-2xl animate-bounce">🤖</span>
            <h4 className="text-lg sm:text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
              The Mars Rover Expert System: Live Lab
            </h4>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            See how Symbolic AI uses <strong>If-Then Rules</strong> like a robot brain to diagnose and fix rover problems in real time!
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isNominal ? (
            <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Rover 100% Operational
            </span>
          ) : (
            <button
              onClick={handleFixAll}
              className="text-xs font-bold px-3.5 py-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-md transition-all flex items-center gap-1.5 transform hover:scale-105"
            >
              🛠️ Quick Auto-Fix Rover
            </button>
          )}
        </div>
      </div>

      {/* 1. Interactive Animated Mars Rover Canvas */}
      <div className="mb-6 rounded-2xl bg-gradient-to-b from-slate-950 via-slate-900 to-amber-950/40 border border-slate-800 p-4 sm:p-6 relative overflow-hidden shadow-inner">
        {/* Martian Sky & Stars / Moons */}
        <div className="absolute inset-0 pointer-events-none">
          {sensors.isNighttime ? (
            <>
              {/* Starry Night Sky */}
              <div className="absolute top-3 left-12 w-1.5 h-1.5 bg-white rounded-full opacity-80" />
              <div className="absolute top-6 left-1/4 w-1 h-1 bg-white rounded-full opacity-60" />
              <div className="absolute top-4 right-1/3 w-1.5 h-1.5 bg-blue-200 rounded-full opacity-90 animate-pulse" />
              <div className="absolute top-8 right-16 w-2 h-2 bg-amber-100 rounded-full opacity-70" />
              {/* Phobos (Martian Moon) */}
              <div className="absolute top-4 right-8 w-8 h-8 rounded-full bg-slate-300 shadow-[0_0_15px_rgba(255,255,255,0.4)] flex items-center justify-center text-[10px] font-bold text-slate-800">
                🌕
              </div>
            </>
          ) : (
            <>
              {/* Daytime Martian Sun */}
              <div className="absolute top-3 right-8 w-10 h-10 rounded-full bg-amber-200/90 shadow-[0_0_25px_rgba(251,191,36,0.5)] animate-pulse" />
            </>
          )}

          {/* Distant Martian Crater Mountains */}
          <svg className="absolute bottom-12 w-full h-16 opacity-30 text-amber-800" preserveAspectRatio="none" viewBox="0 0 1000 100">
            <path d="M0,100 L0,40 Q150,10 300,50 T600,30 T900,60 L1000,45 L1000,100 Z" fill="currentColor" />
          </svg>
          {/* Ground Terrain */}
          <div className="absolute bottom-0 inset-x-0 h-12 bg-gradient-to-t from-red-950 via-amber-950 to-red-900/60 border-t border-amber-900/50" />
        </div>

        {/* Central Rover SVG Illustration */}
        <div className="relative z-10 flex flex-col items-center justify-center py-4">
          <svg viewBox="0 0 460 220" className="w-full max-w-md h-auto select-none filter drop-shadow-xl">
            {/* Rover Mast & Camera Head */}
            <g transform="translate(150, 40)">
              {/* Mast Pole */}
              <rect x="25" y="25" width="8" height="45" rx="3" fill="#64748b" />
              {/* Camera Swivel Head */}
              <rect x="12" y="8" width="34" height="22" rx="6" fill="#334155" stroke="#94a3b8" strokeWidth="2" />
              {/* Eyes */}
              <circle cx="21" cy="19" r="5" fill="#0284c7" />
              <circle cx="21" cy="19" r="2" fill="#38bdf8" />
              <circle cx="37" cy="19" r="5" fill="#0284c7" />
              <circle cx="37" cy="19" r="2" fill="#38bdf8" />

              {/* Siren Beacon (Alerts during Emergency) */}
              <g transform="translate(25, -2)">
                <circle
                  cx="4"
                  cy="4"
                  r="5"
                  fill={roverMood === 'emergency' ? '#f43f5e' : roverMood === 'warning' ? '#f59e0b' : '#10b981'}
                  className={roverMood === 'emergency' ? 'animate-ping' : ''}
                />
                <circle
                  cx="4"
                  cy="4"
                  r="3.5"
                  fill={roverMood === 'emergency' ? '#e11d48' : roverMood === 'warning' ? '#d97706' : '#059669'}
                />
              </g>
            </g>

            {/* Parabolic Antenna Dish (Rotates & Emits Waves) */}
            <g
              transform={`translate(90, 48) rotate(${sensors.dishMisaligned ? -35 : 15} 20 20)`}
              className="transition-transform duration-500 ease-out cursor-pointer"
              onClick={() => toggleSensor('dishMisaligned')}
            >
              {/* Mast Support */}
              <line x1="20" y1="20" x2="20" y2="45" stroke="#64748b" strokeWidth="4" />
              {/* Dish Arc */}
              <path
                d="M 5,5 Q 20,25 35,5"
                fill="none"
                stroke={sensors.dishMisaligned ? '#f43f5e' : '#38bdf8'}
                strokeWidth="4"
                strokeLinecap="round"
              />
              {/* Feed Horn */}
              <line x1="20" y1="15" x2="20" y2="5" stroke="#e2e8f0" strokeWidth="2" />
              <circle cx="20" cy="5" r="2.5" fill="#38bdf8" />

              {/* Radio Waves emitted toward Earth */}
              {!sensors.dishMisaligned ? (
                <g className="animate-pulse">
                  <path d="M 12,-4 A 10 10 0 0 1 28,-4" fill="none" stroke="#38bdf8" strokeWidth="2" />
                  <path d="M 8,-9 A 16 16 0 0 1 32,-9" fill="none" stroke="#38bdf8" strokeWidth="1.5" opacity="0.6" />
                </g>
              ) : (
                <g>
                  {/* Broken Red Waves */}
                  <text x="25" y="0" fill="#f43f5e" fontSize="11" fontWeight="bold">❌</text>
                </g>
              )}
            </g>

            {/* Rover Main Chassis Body */}
            <g transform="translate(100, 95)">
              {/* Main Body Hull */}
              <rect x="15" y="0" width="180" height="52" rx="12" fill="#1e293b" stroke="#475569" strokeWidth="2.5" />
              {/* Chassis Accent Stripe */}
              <rect x="15" y="22" width="180" height="4" fill="#3b82f6" opacity="0.8" />

              {/* Digital Face Display Screen */}
              <rect x="75" y="8" width="80" height="26" rx="6" fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
              <text
                x="115"
                y="26"
                textAnchor="middle"
                fill={roverMood === 'emergency' ? '#f43f5e' : roverMood === 'warning' ? '#fbbf24' : '#34d399'}
                fontSize="12"
                fontWeight="bold"
                fontFamily="monospace"
              >
                {roverMouth}
              </text>

              {/* Battery Indicator on Chassis */}
              <g transform="translate(30, 10)">
                <rect x="0" y="0" width="30" height="15" rx="3" fill="#0f172a" stroke="#64748b" strokeWidth="1" />
                <rect x="30" y="4" width="2" height="7" rx="1" fill="#64748b" />
                <rect
                  x="2"
                  y="2"
                  width={sensors.lowBattery ? 8 : 26}
                  height="11"
                  rx="2"
                  fill={sensors.lowBattery ? '#f43f5e' : '#10b981'}
                  className={sensors.lowBattery ? 'animate-pulse' : ''}
                />
              </g>

              {/* Solar Panels on Top of Chassis */}
              <g
                transform="translate(10, -18)"
                className="cursor-pointer group"
                onClick={() => toggleSensor('dustyPanels')}
              >
                {/* Solar Panel Frame */}
                <rect
                  x="0"
                  y="0"
                  width="190"
                  height="16"
                  rx="3"
                  fill={sensors.dustyPanels ? '#78350f' : '#0369a1'}
                  stroke={sensors.dustyPanels ? '#b45309' : '#38bdf8'}
                  strokeWidth="1.5"
                  className="transition-colors duration-300"
                />
                {/* Solar Cell Grid Lines */}
                <line x1="38" y1="0" x2="38" y2="16" stroke="#082f49" strokeWidth="1.5" />
                <line x1="76" y1="0" x2="76" y2="16" stroke="#082f49" strokeWidth="1.5" />
                <line x1="114" y1="0" x2="114" y2="16" stroke="#082f49" strokeWidth="1.5" />
                <line x1="152" y1="0" x2="152" y2="16" stroke="#082f49" strokeWidth="1.5" />

                {/* Dust Overlay when dusty */}
                {sensors.dustyPanels ? (
                  <g>
                    <rect x="0" y="0" width="190" height="16" rx="3" fill="#92400e" opacity="0.75" />
                    <circle cx="15" cy="8" r="3" fill="#b45309" />
                    <circle cx="50" cy="5" r="4" fill="#78350f" />
                    <circle cx="95" cy="10" r="3.5" fill="#b45309" />
                    <circle cx="140" cy="6" r="4" fill="#78350f" />
                    <circle cx="175" cy="9" r="3" fill="#b45309" />
                    <text x="95" y="12" textAnchor="middle" fill="#fef3c7" fontSize="9" fontWeight="bold">
                      🧹 DUSTY (CLICK TO CLEAN)
                    </text>
                  </g>
                ) : (
                  <g className="animate-pulse">
                    {/* Sparkles */}
                    <text x="10" y="12" fill="#38bdf8" fontSize="10">✨</text>
                    <text x="170" y="12" fill="#38bdf8" fontSize="10">✨</text>
                  </g>
                )}
              </g>

              {/* Rocker-Bogie Suspension Legs */}
              <path d="M 30,50 L 15,80 M 30,50 L 55,80 M 150,50 L 135,80 M 150,50 L 180,80" stroke="#475569" strokeWidth="5" strokeLinecap="round" />
            </g>

            {/* 6 Heavy-Duty Martian Wheels */}
            <g transform="translate(100, 165)">
              {/* Wheel 1 */}
              <circle cx="15" cy="15" r="14" fill="#0f172a" stroke="#64748b" strokeWidth="3" />
              <circle cx="15" cy="15" r="6" fill="#334155" />
              <line x1="15" y1="1" x2="15" y2="29" stroke="#475569" strokeWidth="2" />
              <line x1="1" y1="15" x2="29" y2="15" stroke="#475569" strokeWidth="2" />

              {/* Wheel 2 */}
              <circle cx="55" cy="15" r="14" fill="#0f172a" stroke="#64748b" strokeWidth="3" />
              <circle cx="55" cy="15" r="6" fill="#334155" />
              <line x1="55" y1="1" x2="55" y2="29" stroke="#475569" strokeWidth="2" />
              <line x1="41" y1="15" x2="69" y2="15" stroke="#475569" strokeWidth="2" />

              {/* Wheel 3 */}
              <circle cx="135" cy="15" r="14" fill="#0f172a" stroke="#64748b" strokeWidth="3" />
              <circle cx="135" cy="15" r="6" fill="#334155" />
              <line x1="135" y1="1" x2="135" y2="29" stroke="#475569" strokeWidth="2" />
              <line x1="121" y1="15" x2="149" y2="15" stroke="#475569" strokeWidth="2" />

              {/* Wheel 4 */}
              <circle cx="180" cy="15" r="14" fill="#0f172a" stroke="#64748b" strokeWidth="3" />
              <circle cx="180" cy="15" r="6" fill="#334155" />
              <line x1="180" y1="1" x2="180" y2="29" stroke="#475569" strokeWidth="2" />
              <line x1="166" y1="15" x2="194" y2="15" stroke="#475569" strokeWidth="2" />
            </g>
          </svg>

          {/* Quick Click Hint under the Rover */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-2 text-[11px] text-slate-400">
            <span>💡 <strong>Kid Tip:</strong> Click the Solar Panels or Dish directly on the rover, or use the toolbelt switches below!</span>
          </div>
        </div>
      </div>

      {/* 2. Side-by-Side: Astronaut Toolbelt & Production Rules */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 my-6">
        {/* Working Memory (Sensor Facts) */}
        <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-300 block">
              1. Working Memory (Active Sensor Facts)
            </span>
            <span className="text-[10px] bg-indigo-900/60 text-indigo-200 px-2 py-0.5 rounded-full font-mono">
              Sensors → Input
            </span>
          </div>

          <div className="space-y-3">
            {/* Solar Panels Switch */}
            <button
              onClick={() => toggleSensor('dustyPanels')}
              className={`w-full p-3 rounded-xl border text-xs sm:text-sm font-semibold flex items-center justify-between transition-all transform hover:scale-[1.01] ${
                sensors.dustyPanels
                  ? 'border-amber-500 bg-amber-500/20 text-amber-100 shadow-sm'
                  : 'border-slate-700 bg-slate-900/60 text-slate-300 hover:border-slate-600'
              }`}
            >
              <span className="flex items-center gap-2">
                <span>☀️</span>
                <span>Solar Panels:</span>
              </span>
              <span className={`font-bold px-2.5 py-1 rounded-lg ${sensors.dustyPanels ? 'bg-amber-500/30 text-amber-200' : 'bg-emerald-500/20 text-emerald-300'}`}>
                {sensors.dustyPanels ? '🧹 Dusty (Blocked)' : '✨ Clean & Clear'}
              </span>
            </button>

            {/* Battery Voltage Switch */}
            <button
              onClick={() => toggleSensor('lowBattery')}
              className={`w-full p-3 rounded-xl border text-xs sm:text-sm font-semibold flex items-center justify-between transition-all transform hover:scale-[1.01] ${
                sensors.lowBattery
                  ? 'border-rose-500 bg-rose-500/20 text-rose-100 shadow-sm'
                  : 'border-slate-700 bg-slate-900/60 text-slate-300 hover:border-slate-600'
              }`}
            >
              <span className="flex items-center gap-2">
                <span>🔋</span>
                <span>Battery Voltage:</span>
              </span>
              <span className={`font-bold px-2.5 py-1 rounded-lg ${sensors.lowBattery ? 'bg-rose-500/30 text-rose-200' : 'bg-emerald-500/20 text-emerald-300'}`}>
                {sensors.lowBattery ? '⚡ Low (<10V)' : '🔋 Normal (14V)'}
              </span>
            </button>

            {/* Antenna Dish Switch */}
            <button
              onClick={() => toggleSensor('dishMisaligned')}
              className={`w-full p-3 rounded-xl border text-xs sm:text-sm font-semibold flex items-center justify-between transition-all transform hover:scale-[1.01] ${
                sensors.dishMisaligned
                  ? 'border-indigo-500 bg-indigo-500/20 text-indigo-100 shadow-sm'
                  : 'border-slate-700 bg-slate-900/60 text-slate-300 hover:border-slate-600'
              }`}
            >
              <span className="flex items-center gap-2">
                <span>📡</span>
                <span>Antenna Dish:</span>
              </span>
              <span className={`font-bold px-2.5 py-1 rounded-lg ${sensors.dishMisaligned ? 'bg-indigo-500/30 text-indigo-200' : 'bg-emerald-500/20 text-emerald-300'}`}>
                {sensors.dishMisaligned ? '❌ Misaligned' : '🎯 Aligned to Orbiter'}
              </span>
            </button>

            {/* Daytime vs Night Switch */}
            <button
              onClick={() => toggleSensor('isNighttime')}
              className={`w-full p-3 rounded-xl border text-xs sm:text-sm font-semibold flex items-center justify-between transition-all transform hover:scale-[1.01] ${
                sensors.isNighttime
                  ? 'border-purple-500 bg-purple-500/20 text-purple-100 shadow-sm'
                  : 'border-slate-700 bg-slate-900/60 text-slate-300 hover:border-slate-600'
              }`}
            >
              <span className="flex items-center gap-2">
                <span>{sensors.isNighttime ? '🌙' : '☀️'}</span>
                <span>Environment:</span>
              </span>
              <span className={`font-bold px-2.5 py-1 rounded-lg ${sensors.isNighttime ? 'bg-purple-500/30 text-purple-200' : 'bg-amber-500/20 text-amber-200'}`}>
                {sensors.isNighttime ? '🌙 Martian Night' : '☀️ Daytime Sun'}
              </span>
            </button>
          </div>

          <span className="text-[11px] text-slate-400 block mt-3 italic">
            👉 Tap any sensor switch above to change facts in working memory.
          </span>
        </div>

        {/* Knowledge Base (Production Rules) */}
        <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-300 block">
              2. Knowledge Base (Production Rules)
            </span>
            <span className="text-[10px] bg-purple-900/60 text-purple-200 px-2 py-0.5 rounded-full font-mono">
              Inference Engine
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            {/* Rule 1 */}
            <div
              className={`p-3 rounded-xl border transition-all ${
                rule1Fires
                  ? 'border-emerald-500 bg-emerald-500/20 text-emerald-100 font-medium ring-1 ring-emerald-400/50'
                  : 'border-slate-800 bg-slate-900/40 text-slate-500'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold flex items-center gap-1.5">
                  <span>📜 Rule 1: Solar Power</span>
                </span>
                {rule1Fires && (
                  <span className="text-[10px] font-extrabold text-emerald-300 uppercase px-2 py-0.5 rounded-full bg-emerald-500/30 flex items-center gap-1">
                    Fired 🔥
                  </span>
                )}
              </div>
              <code className="text-[11px] font-mono block opacity-90">
                IF Solar_Dusty AND Daytime THEN Power_Degraded
              </code>
            </div>

            {/* Rule 2 */}
            <div
              className={`p-3 rounded-xl border transition-all ${
                rule2Fires
                  ? 'border-emerald-500 bg-emerald-500/20 text-emerald-100 font-medium ring-1 ring-emerald-400/50'
                  : 'border-slate-800 bg-slate-900/40 text-slate-500'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold flex items-center gap-1.5">
                  <span>📜 Rule 2: Safety Lock</span>
                </span>
                {rule2Fires && (
                  <span className="text-[10px] font-extrabold text-emerald-300 uppercase px-2 py-0.5 rounded-full bg-emerald-500/30 flex items-center gap-1">
                    Fired 🔥
                  </span>
                )}
              </div>
              <code className="text-[11px] font-mono block opacity-90">
                IF Power_Degraded AND Low_Battery THEN Safe_Mode
              </code>
            </div>

            {/* Rule 3 */}
            <div
              className={`p-3 rounded-xl border transition-all ${
                rule3Fires
                  ? 'border-emerald-500 bg-emerald-500/20 text-emerald-100 font-medium ring-1 ring-emerald-400/50'
                  : 'border-slate-800 bg-slate-900/40 text-slate-500'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold flex items-center gap-1.5">
                  <span>📜 Rule 3: Telemetry</span>
                </span>
                {rule3Fires && (
                  <span className="text-[10px] font-extrabold text-emerald-300 uppercase px-2 py-0.5 rounded-full bg-emerald-500/30 flex items-center gap-1">
                    Fired 🔥
                  </span>
                )}
              </div>
              <code className="text-[11px] font-mono block opacity-90">
                IF Dish_Misaligned THEN Comm_Lost
              </code>
            </div>

            {/* Rule 4 */}
            <div
              className={`p-3 rounded-xl border transition-all ${
                rule4Fires
                  ? 'border-rose-500 bg-rose-500/25 text-rose-100 font-medium ring-1 ring-rose-400/50'
                  : 'border-slate-800 bg-slate-900/40 text-slate-500'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold flex items-center gap-1.5">
                  <span>🚨 Rule 4: Compound Emergency</span>
                </span>
                {rule4Fires && (
                  <span className="text-[10px] font-extrabold text-rose-300 uppercase px-2 py-0.5 rounded-full bg-rose-500/40 flex items-center gap-1 animate-pulse">
                    EMERGENCY FIRED 💥
                  </span>
                )}
              </div>
              <code className="text-[11px] font-mono block opacity-90">
                IF Safe_Mode AND Comm_Lost THEN Emergency_Halt
              </code>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Inference Engine Deduction Result */}
      <div className={`p-5 rounded-2xl border-2 transition-all duration-300 ${statusTone} shadow-lg`}>
        <div className="flex items-start gap-3.5">
          <span className="text-3xl flex-shrink-0">
            {roverMood === 'happy' ? '🎉' : roverMood === 'warning' ? '⚠️' : '🚨'}
          </span>
          <div className="flex-1">
            <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
              Inference Engine Diagnostic Conclusion:
            </span>
            <strong className="block text-base sm:text-lg mb-1">{diagnosis}</strong>
            <p className="text-xs sm:text-sm font-medium opacity-90">{recommendation}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
