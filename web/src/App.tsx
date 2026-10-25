// SPEC: FR-UI-01, FR-UI-14, FR-UI-15, FR-ATT-01, NFR-LIC-01, AC-26, AC-34, AC-36, DC-01
import React, { useEffect } from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import { Home } from './pages/Home'
import { Lesson } from './pages/Lesson'
import { Quiz } from './pages/Quiz'
import { Attribution } from './components/Attribution'
import { SettingsModal } from './components/SettingsModal'
import { useSettingsStore, useThemeStore, applyThemeClass } from './store'

export const App: React.FC = () => {
  const { setDrawerOpen, settings } = useSettingsStore()
  const { theme, setTheme } = useThemeStore()

  // Apply theme class on mount
  useEffect(() => {
    applyThemeClass(theme)
  }, [theme])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-indigo-500 selection:text-white transition-colors duration-200">
      {/* Top Application Bar */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/90 dark:border-slate-800 shadow-xs transition-all">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2.5 group focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-md"
          >
            <div className="w-7 h-7 rounded-lg bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center font-bold text-xs shadow-sm shadow-blue-500/20 group-hover:bg-blue-700 transition">
              AI
            </div>
            <span className="font-semibold text-sm tracking-tight text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition flex items-center gap-1.5">
              <span>Foundations Coach</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-700">v2.0</span>
            </span>
          </Link>

          <nav className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
            <Link
              to="/"
              className="px-2.5 py-1.5 rounded-md hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Curriculum
            </Link>

            {/* FR-UI-15, AC-36: Quick Theme Toggle Button */}
            <button
              id="theme-toggle-btn"
              data-testid="theme-toggle-btn"
              onClick={toggleTheme}
              aria-label="Toggle dark/light theme"
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title={`Current theme: ${theme}. Click to toggle.`}
            >
              {theme === 'dark' ? '🌙' : '☀️'}
            </button>

            {/* FR-UI-14, AC-34: Global Settings Drawer Trigger */}
            <button
              id="open-settings-btn"
              data-testid="open-settings-btn"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open settings and AI configuration"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs transition"
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

      {/* Global Settings Modal Drawer (FR-SET-01, FR-SET-02, FR-SET-05) */}
      <SettingsModal />

      {/* FR-ATT-01, NFR-LIC-01, AC-26: Mandatory footer across all routes */}
      <Attribution />
    </div>
  )
}

export default App
