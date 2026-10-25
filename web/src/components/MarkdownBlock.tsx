// SPEC: FR-UI-04, NFR-SEC-05, AC-21, AC-27, DC-01
import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import rehypeHighlight from 'rehype-highlight'
import { Block } from '../api'

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
    src: ['http', 'https', 'data'],
  },
}

interface MarkdownBlockProps {
  block: Block
}

export const MarkdownBlock: React.FC<MarkdownBlockProps> = ({ block }) => {
  if (block.type === 'markdown') {
    return (
      <div className="prose prose-slate dark:prose-invert max-w-none my-4">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema], rehypeHighlight]}
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
