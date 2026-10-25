// SPEC: FR-UI-01, FR-UI-14, FR-ATT-01, NFR-LIC-01, AC-26, AC-34, DC-01
import React from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import { Home } from './pages/Home'
import { Lesson } from './pages/Lesson'
import { Quiz } from './pages/Quiz'
import { Attribution } from './components/Attribution'
import { SettingsModal } from './components/SettingsModal'
import { useSettingsStore } from './store'

export const App: React.FC = () => {
  const { setDrawerOpen, settings } = useSettingsStore()

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 selection:bg-indigo-500 selection:text-white">
      {/* Top Application Bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs transition-all">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2.5 group focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-md"
          >
            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-sm shadow-blue-500/20 group-hover:bg-blue-700 transition">
              AI
            </div>
            <span className="font-semibold text-sm tracking-tight text-slate-900 group-hover:text-blue-600 transition">
              Foundations Coach
            </span>
          </Link>

          <nav className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <Link
              to="/"
              className="px-2.5 py-1.5 rounded-md hover:text-slate-900 hover:bg-slate-100 transition"
            >
              Curriculum
            </Link>

            {/* FR-UI-14, AC-34: Global Settings Drawer Trigger */}
            <button
              id="open-settings-btn"
              data-testid="open-settings-btn"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open settings and AI configuration"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 shadow-xs transition"
            >
              <span className="text-sm">⚙️</span>
              <span className="font-semibold hidden sm:inline">Settings</span>
              {settings.provider === 'local' ? (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Local Ollama Active" />
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" title="Cloud AI Active" />
              )}
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/lesson/:id" element={<Lesson />} />
          <Route path="/quiz/:id" element={<Quiz />} />
        </Routes>
      </main>

      {/* Global Settings Modal Drawer (FR-SET-01, FR-SET-02) */}
      <SettingsModal />

      {/* FR-ATT-01, NFR-LIC-01, AC-26: Mandatory footer across all routes */}
      <Attribution />
    </div>
  )
}

export default App
