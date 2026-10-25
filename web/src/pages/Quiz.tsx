// SPEC: FR-UI-05, AC-25
import React from 'react'
import { useParams, Link } from 'react-router-dom'

export const Quiz: React.FC = () => {
  const { id } = useParams<{ id: string }>()

  return (
    <div className="max-w-xl mx-auto py-20 px-4 text-center">
      <div
        data-testid="quiz-placeholder"
        className="bg-white border border-slate-200 rounded-3xl p-10 shadow-sm"
      >
        <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl font-bold">
          ?
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 mb-2">Quiz: {id}</h1>
        <p className="text-slate-600 text-sm mb-8 leading-relaxed max-w-sm mx-auto">
          Quizzes are not yet available in this release. Please review the lesson material and check back soon!
        </p>
        <Link
          to="/"
          data-testid="quiz-home-link"
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
        >
          <span>&larr;</span>
          <span>Back to Curriculum</span>
        </Link>
      </div>
    </div>
  )
}
