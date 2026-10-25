// SPEC: FR-UI-05, AC-25
import React from 'react'
import { useParams, Link } from 'react-router-dom'

export const Quiz: React.FC = () => {
  const { id } = useParams<{ id: string }>()

  return (
    <div className="max-w-xl mx-auto py-16 px-4 text-center">
      <div
        data-testid="quiz-placeholder"
        className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm"
      >
        <span className="text-4xl block mb-4">📝</span>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Quiz: {id}</h1>
        <p className="text-slate-600 text-sm mb-6 leading-relaxed">
          Quizzes are not yet available in this release. Please review the lesson material and check back soon!
        </p>
        <Link
          to="/"
          data-testid="quiz-home-link"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition"
        >
          &larr; Back to Curriculum
        </Link>
      </div>
    </div>
  )
}
