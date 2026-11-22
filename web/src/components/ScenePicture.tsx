// SPEC: FR-UI-27 (2.13.0) — a Kids card's scene picture: still first, plays once on tap, never under reduced motion.
import React, { useState } from 'react'
import { useT } from '../i18n'

export const ScenePicture: React.FC<{ name: string; plays?: boolean }> = ({ name, plays }) => {
  const t = useT()
  // Each tap remounts the image with "#play": the SVG starts its one-off animation on :target.
  const [run, setRun] = useState(0)
  const [failed, setFailed] = useState(false)
  const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  if (failed) return null

  return (
    <div className="relative my-4" data-testid="scene-picture">
      <img
        key={run}
        src={`/brand/scenes/${name}.svg${run ? '#play' : ''}`}
        alt=""
        width={320}
        height={180}
        onError={() => setFailed(true)}
        className="block w-full max-w-md h-auto mx-auto rounded-2xl"
      />
      {plays && !reduceMotion && (
        <button
          type="button"
          data-testid="scene-play"
          onClick={() => setRun((n) => n + 1)}
          className="absolute bottom-2 right-2 min-h-[44px] min-w-[44px] px-3 rounded-xl bg-white/90 dark:bg-slate-900/90 text-slate-800 dark:text-slate-100 text-sm font-semibold shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        >
          {t('adaptive.playPicture')}
        </button>
      )}
    </div>
  )
}
