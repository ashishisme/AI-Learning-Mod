import React from 'react'

interface Props {
  greeting?: string
}

export const ChipMascotBanner: React.FC<Props> = ({
  greeting = "Hey there, Future Explorer! I'm Chip. Ever wonder how computers can spot your dog in a photo or beat grown-ups at chess? Let's crack the code together!",
}) => {
  return (
    <div className="relative overflow-hidden p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 border-2 border-amber-200/80 dark:border-amber-800/40 shadow-sm mb-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {/* Animated Robot Avatar */}
        <div className="relative flex-shrink-0 w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl border-2 border-amber-300 dark:border-amber-600 shadow-md flex items-center justify-center text-3xl select-none">
          🤖
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-500"></span>
          </span>
        </div>

        {/* Speech Bubble */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-amber-900 dark:text-amber-200 text-sm">
              Chip the Robot
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-200/80 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">
              Your Guide
            </span>
          </div>
          <p className="text-sm sm:text-base text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
            "{greeting}"
          </p>
        </div>
      </div>
    </div>
  )
}
