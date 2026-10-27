import React from 'react'
import { ChipVectorAvatar } from './ChipVectorAvatar'

interface Props {
  greeting?: string
}

export const ChipMascotBanner: React.FC<Props> = ({
  greeting = "Hey there, Future Explorer! I'm Chip. Ever wonder how computers can spot your dog in a photo or beat grown-ups at chess? Let's crack the code together!",
}) => {
  return (
    <div className="relative overflow-hidden p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-amber-50 via-orange-50 to-amber-100/60 dark:from-amber-950/40 dark:via-orange-950/20 dark:to-slate-900 border-2 border-amber-300 dark:border-amber-700/60 shadow-lg mb-8">
      {/* Decorative background glow circle */}
      <div className="absolute -top-12 -right-12 w-40 h-40 bg-amber-300/20 rounded-full blur-2xl pointer-events-none" />

      <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5">
        {/* Animated Robot Vector Character */}
        <div className="relative flex-shrink-0 w-20 h-20 bg-white/90 dark:bg-slate-800/90 rounded-2xl border-2 border-amber-300 dark:border-amber-500 shadow-md flex items-center justify-center">
          <ChipVectorAvatar size={70} />
          <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white dark:border-slate-800"></span>
          </span>
        </div>

        {/* Speech Bubble */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="font-extrabold text-amber-900 dark:text-amber-200 text-sm tracking-wide">
              Chip the Robot
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-amber-200/90 dark:bg-amber-800 text-amber-900 dark:text-amber-100 shadow-xs">
              AI Guide
            </span>
            <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold hidden md:inline">
              ✨ Ready to explore
            </span>
          </div>
          <p className="text-sm sm:text-base text-slate-800 dark:text-slate-100 leading-relaxed font-medium">
            "{greeting}"
          </p>
        </div>
      </div>
    </div>
  )
}
