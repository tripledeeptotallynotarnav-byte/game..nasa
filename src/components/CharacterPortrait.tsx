import React from 'react';

interface CharacterPortraitProps {
  speaker: 'maya' | 'leo';
}

export const CharacterPortrait: React.FC<CharacterPortraitProps> = ({ speaker }) => {
  const isMaya = speaker === 'maya';
  return (
    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-[#070B14] border border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
      <svg
        viewBox="0 0 80 80"
        role="img"
        aria-label={isMaya ? 'Commander Maya portrait' : 'Flight Director Leo portrait'}
        className="w-full h-full block"
      >
        <defs>
          <linearGradient id={`bg-${speaker}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={isMaya ? '#0E2A3A' : '#1E293B'} />
            <stop offset="100%" stopColor="#090F1D" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="80" height="80" fill={`url(#bg-${speaker})`} />
        <circle
          cx="40"
          cy="36"
          r="24"
          fill="none"
          stroke={isMaya ? '#22D3EE' : '#F59E0B'}
          strokeWidth="2"
          opacity="0.7"
        />
        <path d="M14 78 C16 58 64 58 66 78 Z" fill={isMaya ? '#0891B2' : '#334155'} />
        <ellipse cx="40" cy="60" rx="15" ry="4" fill="#94A3B8" />
        <circle cx="40" cy="36" r="14" fill={isMaya ? '#D99B78' : '#E8B898'} />
        {isMaya ? (
          <path d="M25 35 C25 18 55 18 55 35 C52 25 28 25 25 35 Z" fill="#1E1B4B" />
        ) : (
          <path d="M26 32 C27 19 53 19 54 32 C49 26 31 26 26 32 Z" fill="#475569" />
        )}
        <circle cx="35" cy="36" r="1.8" fill="#0F172A" />
        <circle cx="45" cy="36" r="1.8" fill="#0F172A" />
        <path
          d="M35 42 Q40 46 45 42"
          fill="none"
          stroke="#0F172A"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        {!isMaya && (
          <path
            d="M25 37 Q26 44 37 44"
            fill="none"
            stroke="#F59E0B"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        )}
      </svg>
    </div>
  );
};
