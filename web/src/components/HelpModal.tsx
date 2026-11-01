import React, { useState, useEffect } from 'react'
import { useHelpStore } from '../store'

export const HelpModal: React.FC = () => {
  const { isHelpOpen, setHelpOpen } = useHelpStore()
  const [activeTab, setActiveTab] = useState<'usage' | 'ollama' | 'about'>('usage')
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isHelpOpen) {
        setHelpOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isHelpOpen, setHelpOpen])

  if (!isHelpOpen) return null

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedCmd(id)
    setTimeout(() => setCopiedCmd(null), 2000)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn"
      onClick={() => setHelpOpen(false)}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-800 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">❓</span>
            <div>
              <h3 id="help-modal-title" className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                Help & Getting Started
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                AI Foundations Coach User Manual & Local AI Setup
              </p>
            </div>
          </div>
          <button
            onClick={() => setHelpOpen(false)}
            aria-label="Close help modal"
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 bg-slate-100/50 dark:bg-slate-900/50">
          <button
            onClick={() => setActiveTab('usage')}
            className={`py-3 px-3.5 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'usage'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span>📖</span>
            <span>How to Use the App</span>
          </button>
          <button
            onClick={() => setActiveTab('ollama')}
            className={`py-3 px-3.5 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'ollama'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span>🦙</span>
            <span>How to Use Local LLM</span>
          </button>
          <button
            onClick={() => setActiveTab('about')}
            className={`py-3 px-3.5 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'about'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span>🏢</span>
            <span>About & Freeware</span>
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs sm:text-sm">
          {/* TAB 1: How to Use the App */}
          {activeTab === 'usage' && (
            <div className="space-y-5 animate-fadeIn">
              <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40">
                <h4 className="font-bold text-blue-900 dark:text-blue-200 text-sm mb-1 flex items-center gap-1.5">
                  <span>🎚️</span> 3 Adaptive Learning Modes
                </h4>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-xs">
                  At the top of any lesson, switch between <strong>Standard</strong> (academic depth), <strong>Kids (8–14)</strong> with <strong>Chip the Robot 🤖</strong> (friendly metaphors & simplified text), or <strong>Plain English</strong> with <strong>Nova 🎙️</strong> (intuitive workplace analogies).
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">
                  🕹️ 6 Interactive Simulators
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                    <span className="font-bold text-slate-900 dark:text-white block">Module 1: The Turing Test</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Vote on mystery dialogues and slide open the curtain to spot the bot!
                    </span>
                  </div>
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                    <span className="font-bold text-slate-900 dark:text-white block">Module 2: Mars Rover Lab</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Sweep dust off solar panels and watch if-then rules fix the rover!
                    </span>
                  </div>
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                    <span className="font-bold text-slate-900 dark:text-white block">Module 3: Sparky Fruit Sorter</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Drop apples & lemons onto the scale to make the neuron fire!
                    </span>
                  </div>
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                    <span className="font-bold text-slate-900 dark:text-white block">Module 4: Robot Magic Lenses</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Draw pixel cats and rockets; slide 3×3 convolution filters live!
                    </span>
                  </div>
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                    <span className="font-bold text-slate-900 dark:text-white block">Module 5: Word Constellations</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Solve word vector equations in a glowing 2D galaxy space!
                    </span>
                  </div>
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                    <span className="font-bold text-slate-900 dark:text-white block">Module 6: AI Fairness See-Saw</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Balance applicant data and watch the scale level out!
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">
                  🎙️ Audio Studio & AI Teaching Assistant
                </h4>
                <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                  <li className="flex items-start gap-2">
                    <span>🔊</span>
                    <span><strong>Read Aloud:</strong> Tap any speaker icon or the floating audio bar to hear Chip, Nova, or Prof. Alan narrate with real-time glowing sentence tracking.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span>🎙️</span>
                    <span><strong>Talk to Chip (Voice Mic):</strong> Click the microphone icon at the bottom of any lesson to speak your question aloud using Speech-to-Text.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span>📚</span>
                    <span><strong>Grounded Answers:</strong> The AI tutor only answers with verified citations from the curriculum modules to prevent hallucinations.</span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 2: How to Use Local LLM (Ollama) */}
          {activeTab === 'ollama' && (
            <div className="space-y-5 animate-fadeIn">
              <div className="p-4 rounded-2xl bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-800/50">
                <h4 className="font-bold text-purple-900 dark:text-purple-200 text-sm mb-1 flex items-center gap-1.5">
                  <span>🔒</span> 100% Free, Private & Offline
                </h4>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-xs">
                  Running a local AI model means your questions and data never leave your computer. You don't need any API key, internet connection, or paid subscription!
                </p>
              </div>

              <div className="space-y-4">
                {/* Step 1 */}
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-5 h-5 rounded-full bg-purple-600 text-white font-bold text-xs flex items-center justify-center">1</span>
                    <strong className="text-slate-900 dark:text-white text-sm">Download & Install Ollama</strong>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                    Visit the official Ollama website to download the installer for macOS, Windows, or Linux:
                  </p>
                  <a
                    href="https://ollama.com/download"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition"
                  >
                    <span>Download Ollama (ollama.com)</span>
                    <span>↗</span>
                  </a>
                </div>

                {/* Step 2 */}
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-5 h-5 rounded-full bg-purple-600 text-white font-bold text-xs flex items-center justify-center">2</span>
                    <strong className="text-slate-900 dark:text-white text-sm">Start the Ollama Service</strong>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                    Open your terminal and start the background Ollama runner:
                  </p>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 text-purple-200 font-mono text-xs border border-slate-800">
                    <code>ollama serve</code>
                    <button
                      onClick={() => handleCopy('ollama serve', 'serve')}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white text-[10px] transition"
                    >
                      {copiedCmd === 'serve' ? 'Copied! ✓' : 'Copy'}
                    </button>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-5 h-5 rounded-full bg-purple-600 text-white font-bold text-xs flex items-center justify-center">3</span>
                    <strong className="text-slate-900 dark:text-white text-sm">Download a Recommended Model</strong>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                    In a second terminal window, pull any of these fast, lightweight models:
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 text-purple-200 font-mono text-xs border border-slate-800">
                      <div>
                        <code>ollama pull llama3.2:1b</code>
                        <span className="block text-[10px] text-slate-400 font-sans mt-0.5">🌟 Recommended (Super fast, ~1.3 GB)</span>
                      </div>
                      <button
                        onClick={() => handleCopy('ollama pull llama3.2:1b', 'llama')}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white text-[10px] transition"
                      >
                        {copiedCmd === 'llama' ? 'Copied! ✓' : 'Copy'}
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 text-purple-200 font-mono text-xs border border-slate-800">
                      <div>
                        <code>ollama pull deepseek-r1:1.5b</code>
                        <span className="block text-[10px] text-slate-400 font-sans mt-0.5">🧠 Reasoning specialist (~1.5 GB)</span>
                      </div>
                      <button
                        onClick={() => handleCopy('ollama pull deepseek-r1:1.5b', 'deepseek')}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white text-[10px] transition"
                      >
                        {copiedCmd === 'deepseek' ? 'Copied! ✓' : 'Copy'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-5 h-5 rounded-full bg-purple-600 text-white font-bold text-xs flex items-center justify-center">4</span>
                    <strong className="text-slate-900 dark:text-white text-sm">Connect in Settings</strong>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Click <strong>⚙️ Settings</strong> in the top navigation, select the <strong>Local Ollama</strong> preset button, and click <strong>Save Settings</strong>. You are now 100% self-hosted!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: About Qunisphere & Freeware License */}
          {activeTab === 'about' && (
            <div className="space-y-5 animate-fadeIn">
              <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/30 border border-emerald-200/80 dark:border-emerald-800/50">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center text-xl shadow-md">
                    🌐
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-900 dark:text-white text-base">
                      Qunisphere Pvt Limited
                    </h4>
                    <span className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold">
                      Bangalore, India
                    </span>
                  </div>
                </div>
                <p className="text-slate-700 dark:text-slate-200 leading-relaxed text-xs mt-3">
                  <strong>Developed and distributed as freeware by Qunisphere Pvt Limited, Bangalore.</strong>
                </p>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-xs mt-2">
                  Our mission is to democratize artificial intelligence education by creating tactile, visual, and multimodal learning experiences that empower kids, students, and professionals to build strong mental models of AI.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">
                  📜 License & Curriculum Attribution
                </h4>
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 text-xs space-y-2 text-slate-600 dark:text-slate-300">
                  <p>
                    • <strong>Application Code & Interactive Simulators:</strong> Released under the <strong>MIT License</strong>. Free to use, study, modify, and distribute.
                  </p>
                  <p>
                    • <strong>Curriculum Foundations:</strong> Derived from <a href="https://github.com/microsoft/AI-For-Beginners" target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 underline font-semibold">microsoft/AI-For-Beginners</a> under the MIT License.
                  </p>
                  <p className="text-[11px] text-slate-500">
                    * This software is an independent educational initiative and is not affiliated with, sponsored by, or endorsed by Microsoft.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-400 block">Version & Edition</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">v3.2.0 (Curriculum & Audio Studio Edition)</span>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold uppercase">
                  Freeware Release
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between text-xs text-slate-500">
          <span>Qunisphere Pvt Limited • Bangalore</span>
          <button
            onClick={() => setHelpOpen(false)}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition shadow-xs"
          >
            Got it, Let's Learn!
          </button>
        </div>
      </div>
    </div>
  )
}
