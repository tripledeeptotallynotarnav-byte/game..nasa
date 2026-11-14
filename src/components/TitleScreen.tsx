import React from 'react';
import { Rocket, Shield, Zap, Wind } from 'lucide-react';
import { CREW_ROSTER } from '../data/nasaTelemetry';
import { missionAudio } from '../utils/audio';

interface TitleScreenProps {
  onStart: () => void;
  nasaStatusNote: string;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({ onStart, nasaStatusNote }) => {
  return (
    <main className="min-h-screen bg-[#070B14] text-slate-100 flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Left Briefing Panel */}
        <section className="lg:col-span-7 bg-[#0F172A] border border-slate-800 rounded-2xl p-8 flex flex-col justify-between">
          <div>
            <p className="text-xs font-mono tracking-wider uppercase text-cyan-400 mb-3">
              Jezero Crater, Mars · 18.38° N, 77.58° E
            </p>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white leading-tight [text-wrap:balance]">
              OUTPOST COMMAND: Jezero Base
            </h1>
            <p className="mt-4 text-base text-slate-300 leading-relaxed max-w-xl">
              Lead a 4-person NASA crew through a 10-Sol Mars survival mission. Every decision trades
              battery power, breathable oxygen, and water-wall radiation shielding—with a real
              14-minute radio delay to Earth.
            </p>

            {/* 3 Core Systems Summary */}
            <div className="mt-7 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-[#0B1220] border border-slate-800 rounded-xl p-4">
                <Zap className="w-5 h-5 text-cyan-400 mb-2" aria-hidden="true" />
                <h2 className="text-sm font-semibold text-white">Power Grid</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Dust storms dim your solar arrays. Budget kWh wisely.
                </p>
              </div>
              <div className="bg-[#0B1220] border border-slate-800 rounded-xl p-4">
                <Wind className="w-5 h-5 text-emerald-400 mb-2" aria-hidden="true" />
                <h2 className="text-sm font-semibold text-white">Life Support</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Run MOXIE oxygen converters and hydroponic crops.
                </p>
              </div>
              <div className="bg-[#0B1220] border border-slate-800 rounded-xl p-4">
                <Shield className="w-5 h-5 text-amber-400 mb-2" aria-hidden="true" />
                <h2 className="text-sm font-semibold text-white">Radiation Shield</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Pump water-walls thick when NASA solar flares strike.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <button
              type="button"
              data-start="true"
              onClick={() => {
                missionAudio.playSolAdvance();
                onStart();
              }}
              className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-base transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-cyan-300 focus-visible:outline-offset-2"
            >
              <Rocket className="w-5 h-5" aria-hidden="true" />
              Launch Mission
            </button>
            <p className="text-xs font-mono text-slate-400">
              Press Enter or Space to start · {nasaStatusNote}
            </p>
          </div>
        </section>

        {/* Right Custom SVG Emblem & Crew Roster */}
        <aside className="lg:col-span-5 bg-[#0F172A] border border-slate-800 rounded-2xl p-6 flex flex-col justify-between gap-6">
          <div className="bg-[#070B14] border border-slate-800 rounded-xl p-4">
            <svg
              viewBox="0 0 360 190"
              role="img"
              aria-label="Jezero Crater Martian horizon and habitat dome emblem"
              className="w-full h-auto block"
            >
              <defs>
                <linearGradient id="titleSky" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#091121" />
                  <stop offset="100%" stopColor="#5D261B" />
                </linearGradient>
              </defs>
              <rect x="0" y="0" width="360" height="190" rx="10" fill="url(#titleSky)" />
              <circle cx="62" cy="42" r="1.5" fill="#F8FAFC" />
              <circle cx="132" cy="24" r="1.2" fill="#CBD5E1" />
              <circle cx="290" cy="44" r="14" fill="#FDE68A" opacity="0.82" />
              <path
                d="M0 135 L55 112 L130 128 L210 104 L295 126 L360 110 L360 190 L0 190 Z"
                fill="#471D15"
              />
              {/* Outpost Dome Silhouette */}
              <path
                d="M112 152 Q180 100 248 152 Z"
                fill="#0F172A"
                stroke="#22D3EE"
                strokeWidth="2.5"
              />
              <rect x="135" y="138" width="90" height="14" rx="4" fill="#1E293B" />
              <circle cx="155" cy="145" r="3" fill="#22D3EE" />
              <circle cx="180" cy="145" r="3" fill="#10B981" />
              <circle cx="205" cy="145" r="3" fill="#F59E0B" />
              <text
                x="180"
                y="175"
                textAnchor="middle"
                fill="#94A3B8"
                fontSize="11"
                fontFamily="JetBrains Mono, monospace"
              >
                10-SOL SURVIVAL PROTOCOL
              </text>
            </svg>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-slate-200 mb-3">
              Assigned Jezero Crew (4)
            </h2>
            <ul className="space-y-2.5">
              {CREW_ROSTER.map((member) => (
                <li
                  key={member.id}
                  className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-[#0B1220] border border-slate-800/80"
                >
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: member.avatarColor }}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-sm font-medium text-slate-100">{member.name}</p>
                      <span className="text-xs text-slate-400 shrink-0">{member.role}</span>
                    </div>
                    <p className="text-xs font-mono text-slate-400 mt-0.5">{member.specialty}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
};
