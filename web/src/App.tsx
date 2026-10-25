// SPEC: FR-UI-01, FR-ATT-01, NFR-LIC-01, AC-26, DC-01
import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { Home } from './pages/Home'
import { Lesson } from './pages/Lesson'
import { Quiz } from './pages/Quiz'
import { Attribution } from './components/Attribution'

export const App: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/lesson/:id" element={<Lesson />} />
          <Route path="/quiz/:id" element={<Quiz />} />
        </Routes>
      </main>
      <Attribution />
    </div>
  )
}

export default App
