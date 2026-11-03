// SPEC: FR-UI-01, FR-UI-14, FR-UI-15, FR-ATT-01, NFR-LIC-01, AC-26, AC-34, AC-36, DC-01
import React, { useEffect } from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import { Home } from './pages/Home'
import { Lesson } from './pages/Lesson'
import { Quiz } from './pages/Quiz'
import { Invite } from './pages/Invite'
import { AdminLayout } from './pages/admin/AdminLayout'
import { ExpiryBanner } from './components/ExpiryBanner'
import { FeedbackButton } from './components/FeedbackButton'
import { LanguageSwitcher } from './components/LanguageSwitcher'
import { AuthGate, SignOutControl } from './components/AuthGate'
import { Attribution } from './components/Attribution'
import { SettingsModal } from './components/SettingsModal'
import { HelpModal } from './components/HelpModal'
import { useSettingsStore, useHelpStore, useThemeStore, useRuntimeStore, applyThemeClass, resolveTheme } from './store'
import { useApplyLanguage, useT } from './i18n'

export const App: React.FC = () => {
  const { setDrawerOpen, settings } = useSettingsStore()
  const { setHelpOpen } = useHelpStore()
  const { theme, setTheme } = useThemeStore()
  useApplyLanguage() // SPEC-009 FR-004: <html lang> and the chosen catalogue
  const t = useT()

  // Apply theme class on mount
  useEffect(() => {
    applyThemeClass(theme)
  }, [theme])

  useEffect(() => {
    void useRuntimeStore.getState().load()
  }, [])

  // Toggle from what is on screen: with theme "system" on a dark OS the page is already dark,
  // so the first click must go to light.
  const shownTheme = resolveTheme(theme)
  const toggleTheme = () => {
    setTheme(shownTheme === 'dark' ? 'light' : 'dark')
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
            <span className="font-semibold text-sm tracking-tight text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
              {t('nav.brand')}
            </span>
          </Link>

          <nav className="flex min-w-0 overflow-x-auto items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
            <Link
              to="/"
              className="hidden sm:inline-flex items-center flex-shrink-0 whitespace-nowrap px-2.5 py-1.5 rounded-md hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              {t('nav.curriculum')}
            </Link>

            <LanguageSwitcher />

            {/* FR-UI-15, AC-36: Quick Theme Toggle Button */}
            <button
              id="theme-toggle-btn"
              data-testid="theme-toggle-btn"
              onClick={toggleTheme}
              aria-label={t('nav.toggleTheme')}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title={t('nav.themeTitle', { theme })}
            >
              {shownTheme === 'dark' ? '🌙' : '☀️'}
            </button>

            {/* Help & Getting Started Trigger */}
            <button
              id="open-help-btn"
              data-testid="open-help-btn"
              onClick={() => setHelpOpen(true)}
              aria-label={t('nav.openHelp')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs transition"
            >
              <span className="text-sm">❓</span>
              <span className="font-semibold hidden sm:inline">{t('nav.help')}</span>
            </button>

            {/* FR-UI-14, AC-34: Global Settings Drawer Trigger */}
            <button
              id="open-settings-btn"
              data-testid="open-settings-btn"
              onClick={() => setDrawerOpen(true)}
              aria-label={t('nav.openSettings')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs transition"
            >
              <span className="text-sm">⚙️</span>
              <span className="font-semibold hidden sm:inline">{t('nav.settings')}</span>
              {settings.provider === 'local' ? (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title={t('nav.localActive')} />
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" title={t('nav.cloudActive')} />
              )}
            </button>
            <SignOutControl />
            <FeedbackButton />
          </nav>
        </div>
      </header>
      <ExpiryBanner />

      {/* Main Content Area */}
      <main className="flex-1">
        <AuthGate>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/lesson/:id" element={<Lesson />} />
            <Route path="/quiz/:id" element={<Quiz />} />
            <Route path="/invite/:token" element={<Invite />} />
            <Route path="/admin/*" element={<AdminLayout />} />
          </Routes>
        </AuthGate>
      </main>

      {/* Help & User Guide Modal */}
      <HelpModal />

      {/* Global Settings Modal Drawer (FR-SET-01, FR-SET-02) */}
      <SettingsModal />

      {/* FR-ATT-01, NFR-LIC-01, AC-26: Mandatory footer across all routes */}
      <Attribution />
    </div>
  )
}

export default App
