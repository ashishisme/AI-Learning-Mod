// SPEC: SPEC-011 FR-007, FR-008, FR-009, FR-015
import React from 'react'
import { KidVisual } from '../KidVisual'

const STOP_ASSETS = [
  { id: 'stop-1-intro', altKey: 'brand.stop1Alt' },
  { id: 'stop-2-symbolic', altKey: 'brand.stop2Alt' },
  { id: 'stop-3-neuralnetworks', altKey: 'brand.stop3Alt' },
  { id: 'stop-4-computervision', altKey: 'brand.stop4Alt' },
  { id: 'stop-5-nlp', altKey: 'brand.stop5Alt' },
  { id: 'stop-7-ethics', altKey: 'brand.stop7Alt' },
]

interface Props {
  index: number // 0-based position on the trail
  size?: 'sm' | 'lg'
}

export const StopArt: React.FC<Props> = ({ index, size = 'sm' }) => {
  const asset = STOP_ASSETS[index % STOP_ASSETS.length]
  const dim = size === 'lg' ? 96 : 64

  return (
    <KidVisual
      assetId={asset.id}
      altKey={asset.altKey}
      width={dim}
      height={dim}
      priority={index === 0}
      className="flex-shrink-0"
    />
  )
}
