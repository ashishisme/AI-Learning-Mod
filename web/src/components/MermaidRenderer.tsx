import React, { useEffect, useId, useRef, useState } from 'react'
import mermaid from 'mermaid'
import { useThemeStore } from '../store'

interface Props {
  chart: string
  caption?: string
  className?: string
}

export const MermaidRenderer: React.FC<Props> = ({ chart, caption, className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [svgContent, setSvgContent] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const uniqueId = useId().replace(/:/g, '_')
  const { theme } = useThemeStore()

  useEffect(() => {
    let isMounted = true

    const renderChart = async () => {
      try {
        const isDark =
          theme === 'dark' ||
          (theme === 'system' &&
            typeof window !== 'undefined' &&
            window.matchMedia('(prefers-color-scheme: dark)').matches)

        mermaid.initialize({
          startOnLoad: false,
          theme: isDark ? 'dark' : 'neutral',
          securityLevel: 'loose',
          fontFamily: 'Inter, system-ui, sans-serif',
          themeVariables: {
            fontSize: '13px',
            primaryColor: isDark ? '#1E293B' : '#EFF6FF',
            primaryTextColor: isDark ? '#F1F5F9' : '#1E3A8A',
            primaryBorderColor: isDark ? '#3B82F6' : '#93C5FD',
            lineColor: isDark ? '#94A3B8' : '#64748B',
          },
        })

        const id = `mermaid_${uniqueId}`
        const { svg } = await mermaid.render(id, chart)
        if (isMounted) {
          setSvgContent(svg)
          setError(null)
        }
      } catch (err) {
        if (isMounted) {
          console.warn('Mermaid render error:', err)
          setError('Could not render diagram preview')
        }
      }
    }

    renderChart()

    return () => {
      isMounted = false
    }
  }, [chart, theme, uniqueId])

  return (
    <figure className={`my-6 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm ${className}`}>
      {caption && (
        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            📊 {caption}
          </span>
          <span className="text-[11px] font-medium text-slate-400">Interactive Diagram</span>
        </div>
      )}

      <div className="p-4 sm:p-6 flex items-center justify-center overflow-x-auto min-h-[160px]">
        {error ? (
          <pre className="text-xs font-mono text-slate-500 bg-slate-50 dark:bg-slate-800 p-4 rounded-lg w-full overflow-x-auto">
            <code>{chart}</code>
          </pre>
        ) : svgContent ? (
          <div
            ref={containerRef}
            className="w-full flex justify-center [&_svg]:max-w-full [&_svg]:h-auto transition-all"
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        ) : (
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></span>
            Rendering visual diagram...
          </div>
        )}
      </div>
    </figure>
  )
}
