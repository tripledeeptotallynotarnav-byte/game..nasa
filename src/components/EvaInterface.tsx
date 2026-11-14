import { Crosshair, Navigation, Radio, X } from 'lucide-react';
import { EvaTelemetry } from '../three/MarsOutpostScene';

interface EvaOpportunityProps {
  visible: boolean;
  sol: number;
  onAccept: () => void;
  onSkip: () => void;
}

export function EvaOpportunity({ visible, sol, onAccept, onSkip }: EvaOpportunityProps) {
  if (!visible) return null;

  return (
    <section
      aria-label="EVA opportunity"
      className="fixed z-30 top-36 right-3 w-[min(92vw,360px)] rounded-xl border border-orange-300/30 bg-[#101720]/95 p-3 shadow-[0_12px_36px_rgba(0,0,0,.4)] backdrop-blur-xl sm:right-5 sm:p-3.5"
    >
      <div className="flex items-start gap-2.5">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-orange-300/20 bg-orange-400/10 text-orange-200">
          <Navigation className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-orange-200/80">Field operation · Sol {sol}</div>
          <h2 className="mt-0.5 text-xs font-semibold text-white">Dust + subsurface ice anomaly</h2>
        </div>
        <button type="button" aria-label="Skip EVA opportunity" onClick={onSkip} className="rounded-lg p-1 text-slate-400 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-cyan-300">
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <span className="text-[9px] font-mono text-slate-500">OPTIONAL · NO SOL TIME COST</span>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onSkip} className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-slate-500 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-cyan-300">Skip</button>
          <button type="button" onClick={onAccept} className="rounded-lg bg-orange-300 px-3.5 py-2 text-xs font-bold text-slate-950 transition hover:bg-orange-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-200">Accept EVA</button>
        </div>
      </div>
    </section>
  );
}

interface EvaHelmetHudProps {
  lifeSupport: number;
  telemetry: EvaTelemetry;
  solarCleaned: boolean;
  sampleFound: boolean;
  onExit: () => void;
}

export function EvaHelmetHud({ lifeSupport, telemetry, solarCleaned, sampleFound, onExit }: EvaHelmetHudProps) {
  const compassPoints = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const cardinal = compassPoints[Math.round(telemetry.heading / 45) % compassPoints.length];

  return (
    <div className="pointer-events-none fixed inset-0 z-20 overflow-hidden" aria-label="Astronaut visor HUD">
      <div aria-hidden="true" className="absolute inset-0 rounded-[2rem] border-[10px] border-slate-200/[0.035] shadow-[inset_0_0_80px_rgba(185,220,255,.12)] sm:rounded-[3rem] sm:border-[18px]" />
      <div aria-hidden="true" className="absolute inset-x-[8%] top-[8%] h-24 rounded-[50%] bg-gradient-to-b from-white/[0.055] to-transparent blur-2xl" />
      <div className="absolute left-4 top-24 rounded-xl border border-cyan-100/15 bg-slate-950/45 px-3 py-2.5 font-mono text-[10px] text-cyan-100/90 backdrop-blur-md sm:left-8 sm:top-28 sm:px-4 sm:text-[11px]">
        <div className="flex items-center gap-2 text-cyan-200"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300" /> SUIT LINK · NOMINAL</div>
        <div className="mt-1.5 flex gap-3"><span>O₂ {Math.round(lifeSupport)}%</span><span>PRESS 0.98 ATM</span></div>
        <div className="mt-1 text-slate-300/75">CO₂ SCRUBBER · ACTIVE</div>
      </div>
      <div className="absolute left-1/2 top-[24%] -translate-x-1/2 text-center font-mono text-[10px] tracking-[0.16em] text-cyan-100/80">
        <div className="flex items-center justify-center gap-2">
          <span className="h-px w-8 bg-cyan-200/40" />
          <span>{String(telemetry.heading).padStart(3, '0')}° {cardinal}</span>
          <span className="h-px w-8 bg-cyan-200/40" />
        </div>
        <div className="mt-1 flex items-center justify-center gap-1 text-[9px] tracking-[0.12em] text-orange-100/80">
          <Navigation className="h-3 w-3" aria-hidden="true" style={{ transform: `rotate(${telemetry.relativeBearing}deg)` }} />
          <Radio className="h-3 w-3" aria-hidden="true" /> ICE ANOMALY · {telemetry.distance} M
        </div>
      </div>
      <div aria-hidden="true" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-cyan-100/70">
        <Crosshair className="h-5 w-5" strokeWidth={1.2} />
      </div>
      <div className="absolute bottom-5 left-4 right-4 flex items-end justify-between gap-3 sm:bottom-8 sm:left-8 sm:right-8">
        <div className="rounded-xl border border-cyan-100/15 bg-slate-950/50 px-3 py-2.5 font-mono text-[10px] text-slate-200/90 backdrop-blur-md sm:px-4">
          <div className="mb-1.5 flex items-center gap-2 text-cyan-100"><Navigation className="h-3.5 w-3.5" aria-hidden="true" /> FIELD OBJECTIVES</div>
          <div className={solarCleaned ? 'text-emerald-300' : 'text-slate-300'}>{solarCleaned ? '✓' : '○'} Solar array · {solarCleaned ? 'cleaned' : 'aim + hold E'}</div>
          <div className={sampleFound ? 'mt-1 text-emerald-300' : 'mt-1 text-slate-300'}>{sampleFound ? '✓' : '○'} Ice core · {sampleFound ? 'sample secured' : 'follow beacon · aim + hold E'}</div>
          <div className="mt-1.5 text-slate-400">WASD move · Mouse look · ESC return</div>
        </div>
        <button type="button" onClick={onExit} className="pointer-events-auto inline-flex shrink-0 items-center gap-2 rounded-xl border border-white/20 bg-slate-950/80 px-3 py-2.5 text-xs font-semibold text-white shadow-xl backdrop-blur-md transition hover:border-orange-200/50 hover:bg-slate-900 focus-visible:outline-2 focus-visible:outline-cyan-300 sm:px-4">
          <X className="h-4 w-4" aria-hidden="true" /> Return to base
        </button>
      </div>
      <div className="absolute right-4 top-24 hidden rounded-xl border border-orange-100/15 bg-slate-950/40 px-3 py-2 font-mono text-[9px] text-orange-100/75 backdrop-blur-md sm:block sm:right-8 sm:top-28">EXTERIOR CAM · EVA-01</div>
    </div>
  );
}
