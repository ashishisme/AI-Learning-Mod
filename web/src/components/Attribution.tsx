// SPEC: FR-ATT-01, NFR-LIC-01, AC-26
import React from 'react'

export const Attribution: React.FC = () => {
  return (
    <footer data-testid="attribution-footer" className="mt-12 py-6 border-t border-slate-200 text-center text-sm text-slate-500">
      <p>
        Curriculum based on{' '}
        <a
          href="https://github.com/microsoft/AI-For-Beginners"
          target="_blank"
          rel="noreferrer"
          className="text-blue-600 hover:underline"
        >
          microsoft/AI-For-Beginners
        </a>{' '}
        (MIT License). Not affiliated with Microsoft.
      </p>
    </footer>
  )
}
