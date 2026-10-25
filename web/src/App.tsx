// SPEC: FR-UI-01, FR-ATT-01, NFR-LIC-01, AC-26, DC-01
import React from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import { Home } from './pages/Home'
import { Lesson } from './pages/Lesson'
import { Quiz } from './pages/Quiz'
import { Attribution } from './components/Attribution'

export const App: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900">
      {/* Top Application Bar */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 transition-all">
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

          <nav className="flex items-center gap-4 text-xs font-medium text-slate-600">
            <Link
              to="/"
              className="px-2.5 py-1.5 rounded-md hover:text-slate-900 hover:bg-slate-100 transition"
            >
              Curriculum
            </Link>
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

      {/* FR-ATT-01, NFR-LIC-01, AC-26: Mandatory footer across all routes */}
      <Attribution />
    </div>
  )
}

export default App
