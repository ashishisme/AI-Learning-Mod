// SPEC: SPEC-011 FR-007, FR-008 (accessible visual alternative & fallback), FR-015 (reserved layout size)
import React, { useState } from 'react'
import { useT } from '../i18n'

export interface KidVisualProps {
  assetId: string
  altKey?: string
  alt?: string
  decorative?: boolean
  width?: number
  height?: number
  className?: string
  priority?: boolean
}

export const KidVisual: React.FC<KidVisualProps> = ({
  assetId,
  altKey,
  alt,
  decorative = false,
  width = 96,
  height = 96,
  className = '',
  priority = false,
}) => {
  const [hasError, setHasError] = useState(false)
  const t = useT()

  const resolvedAlt = decorative ? '' : (altKey ? t(altKey) : alt || '')

  if (hasError) {
    // Clarification 3, Option B: Outlined placeholder box with concept icon and localized descriptive text
    return (
      <div
        data-testid={`kid-visual-fallback-${assetId}`}
        role={decorative ? 'presentation' : 'img'}
        aria-label={decorative ? undefined : resolvedAlt}
        className={`inline-flex flex-col items-center justify-center p-2 rounded-2xl border-2 border-dashed border-amber-300 dark:border-amber-700 bg-amber-50/60 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 text-center select-none ${className}`}
        style={{ width, height, minWidth: width, minHeight: height }}
      >
        <span className="text-xl" aria-hidden="true">
          🧩
        </span>
        {!decorative && resolvedAlt && (
          <span className="text-[11px] leading-tight font-medium mt-1 line-clamp-2 px-1">
            {resolvedAlt}
          </span>
        )}
      </div>
    )
  }

  return (
    <img
      src={`/brand/${assetId}.svg`}
      alt={resolvedAlt}
      aria-hidden={decorative ? 'true' : undefined}
      width={width}
      height={height}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setHasError(true)}
      data-testid={`kid-visual-${assetId}`}
      data-asset-id={assetId}
      className={`inline-block object-contain select-none ${className}`}
      style={{ width, height }}
    />
  )
}
