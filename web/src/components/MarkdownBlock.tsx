// SPEC: FR-UI-04, NFR-SEC-05, AC-21, AC-27, DC-01
import React, { useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import rehypeHighlight from 'rehype-highlight'
import { Block } from '../api'
import { useT } from '../i18n'
import { headingSections } from '../services/narrationText'
import { AudioNarrationButton } from './AudioNarrationButton'

// NFR-SEC-05 conservative sanitize schema
const sanitizeSchema = {
  ...defaultSchema,
  tagNames: defaultSchema.tagNames?.filter(
    (tag) => !['script', 'iframe', 'object', 'embed', 'form'].includes(tag)
  ),
  attributes: {
    ...defaultSchema.attributes,
    '*': (defaultSchema.attributes?.['*'] || []).filter(
      (attr) => typeof attr === 'string' && !attr.toLowerCase().startsWith('on')
    ),
    img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
    a: ['href', 'title', 'target', 'rel'],
  },
  protocols: {
    ...defaultSchema.protocols,
    href: ['http', 'https', 'mailto'],
    src: ['http', 'https'],
  },
}

interface MarkdownBlockProps {
  block: Block
  // FR-UI-26: set on Standard lessons to give each level 1–3 heading a Read section button.
  narrateId?: string
  speechLang?: string
}

type HeadingProps = React.HTMLAttributes<HTMLHeadingElement> & { node?: { position?: { start: { line: number } } } }

export const MarkdownBlock: React.FC<MarkdownBlockProps> = ({ block, narrateId, speechLang }) => {
  const label = useT()('narration.readSection')
  // Built once per lesson: new component types on every render would remount the buttons, and a
  // remounting button stops its own playback.
  const components = useMemo(() => {
    if (!narrateId || block.type !== 'markdown') return undefined
    const sections = headingSections(block.content || '')
    const heading = (Tag: 'h1' | 'h2' | 'h3') => ({ node, children, ...props }: HeadingProps) => {
      const line = node?.position?.start.line
      const text = line ? sections.get(line) : undefined
      if (!text) return <Tag {...props}>{children}</Tag>
      return (
        <div className="flex items-start justify-between gap-3">
          <Tag {...props} className="flex-1">{children}</Tag>
          <div className="mt-[1.4em] flex-shrink-0" data-testid="standard-read-section">
            <AudioNarrationButton id={`${narrateId}-${line}`} textToRead={text} label={label} speechLang={speechLang} variant="pill" />
          </div>
        </div>
      )
    }
    return { h1: heading('h1'), h2: heading('h2'), h3: heading('h3') }
  }, [narrateId, block.type, block.content, label, speechLang])

  if (block.type === 'markdown') {
    return (
      <div className="prose prose-slate dark:prose-invert max-w-none my-4 [overflow-wrap:anywhere] [&_pre]:overflow-x-auto [&_pre]:max-w-full">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema], rehypeHighlight]}
          components={components}
        >
          {block.content || ''}
        </ReactMarkdown>
      </div>
    )
  }

  if (block.type === 'code') {
    return (
      <pre className="bg-slate-900 dark:bg-slate-950 text-slate-100 p-4 rounded-lg overflow-x-auto my-4 text-sm font-mono border border-slate-800">
        <code>{block.content}</code>
      </pre>
    )
  }

  if (block.type === 'image') {
    return (
      <figure className="my-4">
        <img
          src={block.src}
          alt={block.alt || ''}
          className="max-w-full h-auto rounded-lg shadow-sm border border-slate-150 dark:border-slate-800"
          loading="lazy"
        />
        {block.alt && <figcaption className="text-sm text-slate-500 dark:text-slate-400 mt-1">{block.alt}</figcaption>}
      </figure>
    )
  }

  if (block.type === 'notebook') {
    return (
      <div className="p-4 my-4 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-lg text-blue-900 dark:text-blue-200">
        <p className="font-semibold text-sm">Interactive Jupyter Notebook available</p>
      </div>
    )
  }

  // FR-UI-04: Unknown block types shall render a neutral placeholder, not throw
  return (
    <div
      data-testid="unknown-block"
      className="p-4 my-4 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded text-slate-500 dark:text-slate-400 text-sm italic"
    >
      Content block ({block.type}) cannot be displayed
    </div>
  )
}
