import React from 'react'

interface Props {
  size?: number
  className?: string
}

export const ChipVectorAvatar: React.FC<Props> = ({ size = 64, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`select-none filter drop-shadow-md ${className}`}
      aria-label="Chip the Robot Avatar"
    >
      <defs>
        <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#0284C7" />
        </linearGradient>
        <linearGradient id="screenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0F172A" />
          <stop offset="100%" stopColor="#1E293B" />
        </linearGradient>
        <linearGradient id="eyeGlow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22D3EE" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>
      </defs>

      {/* Antenna Pole */}
      <rect x="47" y="10" width="6" height="15" rx="3" fill="#64748B" />

      {/* Antenna Glowing Orb */}
      <circle cx="50" cy="9" r="6" fill="#F59E0B" className="animate-pulse" />
      <circle cx="50" cy="9" r="3" fill="#FDE68A" />

      {/* Robot Ears */}
      <rect x="14" y="42" width="6" height="16" rx="3" fill="#94A3B8" />
      <rect x="80" y="42" width="6" height="16" rx="3" fill="#94A3B8" />

      {/* Main Chassis Head */}
      <rect x="20" y="22" width="60" height="56" rx="16" fill="url(#bodyGrad)" stroke="#0284C7" strokeWidth="2" />
      
      {/* Glossy Head Highlight */}
      <path d="M26 28 C34 24 66 24 74 28" stroke="rgba(255,255,255,0.4)" strokeWidth="3" strokeLinecap="round" />

      {/* Dark CRT Screen */}
      <rect x="27" y="30" width="46" height="40" rx="10" fill="url(#screenGrad)" stroke="#0284C7" strokeWidth="1.5" />

      {/* Glowing Cyan Eyes with Blinking Animation */}
      <g className="animate-pulse">
        {/* Left Eye */}
        <circle cx="40" cy="46" r="6" fill="url(#eyeGlow)" />
        <circle cx="38" cy="44" r="2" fill="#FFFFFF" />

        {/* Right Eye */}
        <circle cx="60" cy="46" r="6" fill="url(#eyeGlow)" />
        <circle cx="58" cy="44" r="2" fill="#FFFFFF" />
      </g>

      {/* Cute Digital Smile */}
      <path
        d="M43 58 Q50 64 57 58"
        stroke="#22D3EE"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Cheek Rosy Blushes */}
      <ellipse cx="33" cy="56" rx="3" ry="1.5" fill="#F472B6" opacity="0.6" />
      <ellipse cx="67" cy="56" rx="3" ry="1.5" fill="#F472B6" opacity="0.6" />

      {/* Neck Joint */}
      <rect x="42" y="78" width="16" height="6" rx="2" fill="#64748B" />

      {/* Subtle Chest Preview */}
      <rect x="30" y="84" width="40" height="12" rx="4" fill="url(#bodyGrad)" />
      <circle cx="50" cy="90" r="3" fill="#38BDF8" />
    </svg>
  )
}
