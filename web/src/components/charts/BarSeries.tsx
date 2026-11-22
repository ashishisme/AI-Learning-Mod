import React, { useState } from 'react'

export const BarSeries: React.FC<{ title: string; bars: { label: string; value: number }[] }> = ({ title, bars }) => {
  const [table, setTable] = useState(false)
  const max = Math.max(1, ...bars.map((b) => b.value))
  return <section aria-label={title}>
    <button type="button" className="min-h-11 px-3 rounded border border-slate-500 mb-3 focus-visible:ring-2 focus-visible:ring-blue-600" onClick={() => setTable((v) => !v)}>
      {table ? 'Show chart' : 'Show table'}
    </button>
    {table ? <table className="w-full text-sm"><caption className="text-left font-semibold">{title}</caption><thead><tr><th scope="col" className="text-left">Date</th><th scope="col" className="text-right">Count</th></tr></thead><tbody>{bars.map((b) => <tr key={b.label}><th scope="row" className="text-left font-normal">{b.label}</th><td className="text-right">{b.value}</td></tr>)}</tbody></table>
      : <svg role="img" aria-label={title} viewBox={`0 0 ${Math.max(1, bars.length) * 28} 140`} className="w-full h-40 text-blue-800 dark:text-blue-300">
        {bars.map((b, i) => <g key={b.label}><rect x={i * 28 + 3} y={112 - b.value / max * 105} width="21" height={Math.max(1, b.value / max * 105)} fill="currentColor"><title>{b.label}: {b.value}</title></rect><text x={i * 28 + 13} y="133" textAnchor="middle" fill="currentColor" fontSize="8">{b.label.slice(5)}</text></g>)}
      </svg>}
  </section>
}
