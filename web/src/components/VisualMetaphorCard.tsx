// SPEC: FR-UI-08, SPEC-011 FR-007, FR-008
import React from 'react'
import { useT } from '../i18n'
import { KidVisual } from './KidVisual'

interface Props {
  metaphorName: string
  description: string
  isJunior?: boolean
}

export const VisualMetaphorCard: React.FC<Props> = ({ metaphorName, description, isJunior = true }) => {
  const t = useT()

  // Illustration slot with text alternative (never emoji as only meaning)
  const renderIllustration = () => {
    const lower = metaphorName.toLowerCase()

    let conceptAsset: { id: string; altKey: string } | null = null
    if (lower.includes('martian puppy') || lower.includes('puppy')) {
      conceptAsset = { id: 'concept-martian-puppy', altKey: 'brand.conceptPuppyAlt' }
    } else if (lower.includes('chess') || lower.includes('maze') || lower.includes('wizard')) {
      conceptAsset = { id: 'concept-symbolic-maze', altKey: 'brand.conceptMazeAlt' }
    } else if (lower.includes('calculator') || lower.includes('voting') || lower.includes('neuron') || lower.includes('apprentice')) {
      conceptAsset = { id: 'concept-neuron-switch', altKey: 'brand.conceptNeuronAlt' }
    } else if (lower.includes('pixel') || lower.includes('cookie') || lower.includes('photo') || lower.includes('rulebook')) {
      conceptAsset = { id: 'concept-pixel-grid', altKey: 'brand.conceptPixelAlt' }
    } else if (lower.includes('fruit') || lower.includes('word') || lower.includes('salad')) {
      conceptAsset = { id: 'concept-word-vectors', altKey: 'brand.conceptVectorsAlt' }
    } else if (lower.includes('judge') || lower.includes('fair') || lower.includes('scale')) {
      conceptAsset = { id: 'concept-fairness-scale', altKey: 'brand.conceptFairnessAlt' }
    }

    if (conceptAsset) {
      return (
        <KidVisual
          assetId={conceptAsset.id}
          altKey={conceptAsset.altKey}
          width={64}
          height={64}
          className="flex-shrink-0"
        />
      )
    }

    let iconLabel = t('widget.funMetaphor')
    let symbols = '✨💡'
    if (lower.includes('martian puppy') || lower.includes('puppy')) {
      iconLabel = 'Puppy illustration'
      symbols = '🛸🐶'
    } else if (lower.includes('chess') || lower.includes('wizard')) {
      iconLabel = 'Chess wizard illustration'
      symbols = '🧙‍♂️♟️'
    } else if (lower.includes('calculator') || lower.includes('apprentice')) {
      iconLabel = 'Chef apprentice illustration'
      symbols = '📟👨‍🍳'
    } else if (lower.includes('rulebook') || lower.includes('photo')) {
      iconLabel = 'Photo rulebook illustration'
      symbols = '📚📸'
    }

    return (
      <div
        role="img"
        aria-label={iconLabel}
        className={isJunior
          ? "kids-tile w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 bg-indigo-100 dark:bg-indigo-950/80 flex items-center justify-center text-2xl sm:text-3xl shadow-inner border border-indigo-200 dark:border-indigo-800"
          : "w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 bg-indigo-100 dark:bg-indigo-950/80 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl shadow-inner border border-indigo-200 dark:border-indigo-800"
        }
      >
        <span aria-hidden="true">{symbols}</span>
      </div>
    )
  }

  return (
    <div
      className={isJunior
        ? "kids-card my-5 p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5"
        : "my-5 p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-indigo-50/80 via-blue-50/50 to-white dark:from-indigo-950/40 dark:via-slate-900 dark:to-slate-900 border-2 border-indigo-200/90 dark:border-indigo-800/60 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5"
      }
    >
      {renderIllustration()}
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-200/80 dark:bg-indigo-900/80 text-indigo-900 dark:text-indigo-200">
            {t(isJunior ? 'widget.funMetaphor' : 'widget.everydayAnalogy')}
          </span>
          <h4 className={isJunior ? "kids-heading text-base sm:text-lg font-bold" : "text-sm sm:text-base font-bold text-slate-900 dark:text-white"}>
            {t('widget.metaphorTitle', { name: metaphorName })}
          </h4>
        </div>
        <p className={isJunior ? "kids-ink text-sm sm:text-base leading-relaxed" : "text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium"}>
          {description}
        </p>
      </div>
    </div>
  )
}
