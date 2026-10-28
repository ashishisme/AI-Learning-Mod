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
      if (!next.dustyPanels && !next.lowBattery && !next.dishMisaligned) {
        setTimeout(() => speechService.playChime('success'), 100);
      }
      return next;
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

  // Determine Final Diagnosis
  let diagnosis = "✅ All Systems Nominal: Mars Rover is exploring smoothly.";
  let recommendation = "Continue scheduled geologic soil sampling.";
  let statusTone = "border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100";

  if (rule4Fires) {
    diagnosis = "🚨 Critical Rover Emergency: Safe Mode + Communications Failure!";
    recommendation = "Command: Halt locomotion immediately. Re-aim antenna towards orbital relay.";
    statusTone = "border-rose-500 bg-rose-50/80 dark:bg-rose-950/40 text-rose-900 dark:text-rose-100";
  } else if (safeMode) {
    diagnosis = "⚠️ Warning: Low-Power Safe Mode Activated.";
    recommendation = "Command: Deploy robotic brush to clean solar arrays and conserve battery.";
    statusTone = "border-amber-500 bg-amber-50/80 dark:bg-amber-950/40 text-amber-900 dark:text-amber-100";
  } else if (commSignalLost) {
    diagnosis = "📡 Advisory: High Communication Signal Attenuation.";
    recommendation = "Command: Initiate dish realignment scan towards Earth station.";
    statusTone = "border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100";
  } else if (sensors.isNighttime && sensors.lowBattery) {
    diagnosis = "🌙 Martian Nightfall: Hibernation Cycle.";
    recommendation = "Command: Maintain warm electronics box until dawn.";
    statusTone = "border-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-100";
  }

  return (
    <div className="my-8 p-6 rounded-3xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-md">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div>
          <h4 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            🚀 Interactive Simulation: The Mars Rover Expert System
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            See how Symbolic AI uses a <strong>Knowledge Base</strong> and an <strong>Inference Engine</strong> to deduce facts!
          </p>
        </div>
        <span className="text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300">
          Forward Chaining Demo
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 my-6">
        {/* 1. Working Memory (Sensor Facts) */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-3">
            1. Working Memory (Active Facts)
          </span>
          <div className="space-y-2.5">
            <button
              onClick={() => toggleSensor('dustyPanels')}
              className={`w-full p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition-colors ${
                sensors.dustyPanels
                  ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
              }`}
            >
              <span>☀️ Solar Panels:</span>
              <span className="font-bold">{sensors.dustyPanels ? '🧹 Dusty (Blocked)' : '✨ Clean & Clear'}</span>
            </button>

            <button
              onClick={() => toggleSensor('lowBattery')}
              className={`w-full p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition-colors ${
                sensors.lowBattery
                  ? 'border-rose-400 bg-rose-50 dark:bg-rose-950/50 text-rose-900 dark:text-rose-200'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
              }`}
            >
              <span>🔋 Battery Voltage:</span>
              <span className="font-bold">{sensors.lowBattery ? '⚡ Low (<10V)' : '🔋 Normal (14V)'}</span>
            </button>

            <button
              onClick={() => toggleSensor('dishMisaligned')}
              className={`w-full p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition-colors ${
                sensors.dishMisaligned
                  ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-200'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
              }`}
            >
              <span>📡 Antenna Dish:</span>
              <span className="font-bold">{sensors.dishMisaligned ? '❌ Misaligned' : '🎯 Aligned to Orbiter'}</span>
            </button>

            <button
              onClick={() => toggleSensor('isNighttime')}
              className={`w-full p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition-colors ${
                sensors.isNighttime
                  ? 'border-purple-400 bg-purple-50 dark:bg-purple-950/50 text-purple-900 dark:text-purple-200'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
              }`}
            >
              <span>☀️ Environment:</span>
              <span className="font-bold">{sensors.isNighttime ? '🌙 Martian Night' : '☀️ Daytime Sun'}</span>
            </button>
          </div>
          <span className="text-[11px] text-slate-400 block mt-3 italic">
            👉 Tap any sensor switch above to change facts in working memory.
          </span>
        </div>

        {/* 2. Knowledge Base (Rules) */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-3">
            2. Knowledge Base (Production Rules)
          </span>
          <div className="space-y-2 text-xs">
            {/* Rule 1 */}
            <div
              className={`p-2.5 rounded-xl border transition-all ${
                rule1Fires
                  ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 font-medium ring-1 ring-emerald-400'
                  : 'border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold">Rule 1 (Solar Power):</span>
                {rule1Fires && <span className="text-[10px] font-bold text-emerald-600 uppercase">Fired 🔥</span>}
              </div>
              <code>IF Solar_Dusty AND Daytime THEN Power_Degraded</code>
            </div>

            {/* Rule 2 */}
            <div
              className={`p-2.5 rounded-xl border transition-all ${
                rule2Fires
                  ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 font-medium ring-1 ring-emerald-400'
                  : 'border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold">Rule 2 (Safety Lock):</span>
                {rule2Fires && <span className="text-[10px] font-bold text-emerald-600 uppercase">Fired 🔥</span>}
              </div>
              <code>IF Power_Degraded AND Low_Battery THEN Safe_Mode</code>
            </div>

            {/* Rule 3 */}
            <div
              className={`p-2.5 rounded-xl border transition-all ${
                rule3Fires
                  ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 font-medium ring-1 ring-emerald-400'
                  : 'border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold">Rule 3 (Telemetry):</span>
                {rule3Fires && <span className="text-[10px] font-bold text-emerald-600 uppercase">Fired 🔥</span>}
              </div>
              <code>IF Dish_Misaligned THEN Comm_Lost</code>
            </div>

            {/* Rule 4 */}
            <div
              className={`p-2.5 rounded-xl border transition-all ${
                rule4Fires
                  ? 'border-rose-500 bg-rose-50/70 dark:bg-rose-950/40 text-rose-900 dark:text-rose-100 font-medium ring-1 ring-rose-400'
                  : 'border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold">Rule 4 (Compound Emergency):</span>
                {rule4Fires && <span className="text-[10px] font-bold text-rose-600 uppercase">Fired 🔥</span>}
              </div>
              <code>IF Safe_Mode AND Comm_Lost THEN Emergency_Halt</code>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Inference Engine Deduction Result */}
      <div className={`p-4 rounded-2xl border-2 transition-all ${statusTone} animate-fadeIn`}>
        <div className="flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">⚙️</span>
          <div>
            <span className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">
              Inference Engine Diagnostic Conclusion:
            </span>
            <strong className="block text-sm sm:text-base mb-1">{diagnosis}</strong>
            <p className="text-xs sm:text-sm font-medium opacity-90">{recommendation}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
