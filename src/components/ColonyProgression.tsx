import { useEffect, useRef, useState } from 'react';
import { BatteryCharging, ChevronDown, ChevronUp, Cpu, FlaskConical, Leaf, Shield, Sun, Target, X, type LucideIcon } from 'lucide-react';
import { BuildingId, BuildingLevels, MAX_BUILDING_LEVEL } from '../game/simulation';

const BUILDINGS: Array<{ id: BuildingId; name: string; icon: LucideIcon; benefit: string }> = [
  { id: 'solar', name: 'Solar Array', icon: Sun, benefit: '+3 kWh overnight per tier' },
  { id: 'moxie', name: 'MOXIE Core', icon: Cpu, benefit: '+2% O₂ per activation' },
  { id: 'shelter', name: 'Storm Shelter', icon: Shield, benefit: '−2 kWh night draw per tier' },
  { id: 'biodome', name: 'Bio-Dome', icon: Leaf, benefit: '+1 science per harvest' },
];

interface ColonyProgressionProps {
  power: number;
  levels: BuildingLevels;
  calibratedThisSol: boolean;
  disabled: boolean;
  onUpgrade: (building: BuildingId) => void;
  onStartCalibration: () => void;
}

export function ColonyProgression({
  power,
  levels,
  calibratedThisSol,
  disabled,
  onUpgrade,
  onStartCalibration,
}: ColonyProgressionProps) {
  const [expanded, setExpanded] = useState(() => typeof window !== 'undefined' && window.innerHeight >= 620);
  useEffect(() => {
    const collapseForShortView = () => {
      if (window.innerHeight < 620) setExpanded(false);
    };
    window.addEventListener('resize', collapseForShortView);
    return () => window.removeEventListener('resize', collapseForShortView);
  }, []);

  return (
    <aside className="fixed z-30 left-2.5 sm:left-5 top-[156px] sm:top-[158px] w-[min(19rem,calc(100vw-1.25rem))] pointer-events-auto">
      <div className="overflow-hidden rounded-2xl border border-slate-700/90 bg-[#070B14]/90 shadow-2xl backdrop-blur-md">
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
          className="flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left hover:bg-white/5"
        >
          <span className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg border border-cyan-500/25 bg-cyan-500/10 text-cyan-300"><BatteryCharging className="h-4 w-4" aria-hidden="true" /></span>
            <span><span className="block text-xs font-semibold tracking-wide text-white">COLONY DEVELOPMENT</span><span className="mt-0.5 block text-[10px] font-mono text-slate-400">POWER {power} kWh · TIER UPGRADES</span></span>
          </span>
          {expanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
        </button>

        {expanded && <div className="max-h-[min(52vh,calc(100vh-180px))] space-y-1.5 overflow-y-auto border-t border-slate-800/90 p-2.5">
          <p className="px-1 pb-1 text-[10px] font-mono uppercase tracking-[0.14em] text-slate-500">Choose what to invest in</p>
          {BUILDINGS.map(({ id, name, icon: Icon, benefit }) => {
            const level = levels[id];
            const cost = 18 + (level - 1) * 12;
            const capped = level >= MAX_BUILDING_LEVEL;
            return <div key={id} className="flex items-center gap-2 rounded-xl border border-slate-800 bg-[#0B1220] px-2.5 py-2">
              <Icon className="h-4 w-4 shrink-0 text-cyan-300" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-100"><span className="truncate">{name}</span><span className="shrink-0 rounded bg-slate-800 px-1 py-0.5 font-mono text-[9px] text-cyan-200">T{level}</span></div>
                <div className="truncate text-[9px] text-slate-500">{benefit}</div>
              </div>
              <button type="button" disabled={disabled || capped || power < cost} onClick={() => onUpgrade(id)} aria-label={capped ? `${name} fully upgraded` : `Upgrade ${name} for ${cost} kilowatt-hours`} className="shrink-0 rounded-lg border border-cyan-500/25 bg-cyan-500/10 px-2 py-1.5 text-[9px] font-mono font-semibold text-cyan-200 transition-colors hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:border-slate-800 disabled:bg-slate-900 disabled:text-slate-600">
                {capped ? 'MAX' : `${cost} kWh`}
              </button>
            </div>;
          })}
          <div className="border-t border-slate-800/80 pt-2">
            <button type="button" disabled={disabled || calibratedThisSol} onClick={onStartCalibration} className="flex w-full items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-left transition-colors hover:bg-amber-500/15 disabled:cursor-not-allowed disabled:opacity-50">
              <span className="flex items-center gap-2"><Target className="h-4 w-4 text-amber-300" aria-hidden="true" /><span><span className="block text-[11px] font-semibold text-amber-100">Solar Pulse Calibration</span><span className="block text-[9px] text-amber-200/60">3 timing locks · once per Sol</span></span></span>
              <span className="text-[9px] font-mono text-amber-300">{calibratedThisSol ? 'DONE' : 'PLAY'}</span>
            </button>
          </div>
        </div>}
      </div>
    </aside>
  );
}

interface CalibrationModalProps {
  onComplete: (accuracy: number) => void;
  onClose: () => void;
}

export function CalibrationModal({ onComplete, onClose }: CalibrationModalProps) {
  const [position, setPosition] = useState(0);
  const [attempts, setAttempts] = useState<number[]>([]);
  const [result, setResult] = useState<number | null>(null);
  const finishTimer = useRef<number | null>(null);

  useEffect(() => {
    if (result !== null) return;
    const started = performance.now();
    const timer = window.setInterval(() => {
      const cycle = ((performance.now() - started) % 1800) / 1800;
      setPosition(cycle <= 0.5 ? cycle * 200 : (1 - cycle) * 200);
    }, 32);
    return () => window.clearInterval(timer);
  }, [result]);

  useEffect(() => () => {
    if (finishTimer.current !== null) window.clearTimeout(finishTimer.current);
  }, []);

  const lockPulse = () => {
    if (result !== null) return;
    const quality = Math.max(0, Math.round(100 - Math.abs(position - 50) * 2.2));
    const next = [...attempts, quality];
    setAttempts(next);
    if (next.length === 3) {
      const accuracy = Math.round(next.reduce((sum, hit) => sum + hit, 0) / next.length);
      setResult(accuracy);
      finishTimer.current = window.setTimeout(() => onComplete(accuracy), 1000);
    }
  };

  const handleClose = () => {
    if (finishTimer.current !== null) window.clearTimeout(finishTimer.current);
    onClose();
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const previewAccuracy = result ?? (attempts.length ? Math.round(attempts.reduce((sum, hit) => sum + hit, 0) / attempts.length) : null);

  return <div role="dialog" aria-modal="true" aria-labelledby="calibration-title" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
    <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-[#0F172A] p-5 shadow-2xl sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div><span className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.16em] text-amber-300"><FlaskConical className="h-3.5 w-3.5" aria-hidden="true" /> Field calibration · Sol action</span><h2 id="calibration-title" className="mt-2 text-xl font-bold text-white">Catch the solar pulse</h2><p className="mt-1 text-xs leading-relaxed text-slate-400">Lock the moving signal inside the amber window. Three clean hits tune the array and bank a science bonus.</p></div>
        <button type="button" aria-label="Close calibration" onClick={handleClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"><X className="h-4 w-4" /></button>
      </div>
      <div className="mt-7">
        <div className="mb-2 flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-slate-500"><span>Array signal</span><span>Pulse {Math.min(attempts.length + (result === null ? 1 : 0), 3)} / 3</span></div>
        <div className="relative h-12 overflow-hidden rounded-xl border border-slate-700 bg-[#080D18]">
          <div className="absolute inset-y-0 left-[43%] w-[14%] border-x border-amber-300/50 bg-amber-300/15" />
          <div className="absolute inset-y-2 left-1/2 w-px bg-amber-200/80" />
          <div className="absolute top-1/2 h-7 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-200 shadow-[0_0_14px_rgba(103,232,249,0.8)]" style={{ left: `${position}%` }} />
        </div>
        <div className="mt-3 flex min-h-8 items-center justify-between gap-3">
          <div className="flex gap-1.5" aria-label={`Pulse scores: ${attempts.join(', ') || 'none'}`}>{[0, 1, 2].map((index) => <span key={index} className={`grid h-7 w-9 place-items-center rounded-md border font-mono text-[10px] ${attempts[index] !== undefined ? attempts[index] >= 75 ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200' : 'border-amber-500/40 bg-amber-500/10 text-amber-200' : 'border-slate-700 bg-slate-900 text-slate-600'}`}>{attempts[index] ?? '—'}</span>)}</div>
          {previewAccuracy !== null && <span className="text-[10px] font-mono text-slate-400">Mean accuracy {previewAccuracy}%</span>}
        </div>
      </div>
      {result !== null ? <div role="status" className="mt-5 rounded-xl border border-cyan-500/25 bg-cyan-500/10 px-3 py-3 text-center text-sm font-semibold text-cyan-100">Calibration locked · {result}% accuracy</div> : <button type="button" autoFocus onClick={lockPulse} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 py-3 text-sm font-bold text-slate-950 transition-transform hover:bg-cyan-300 active:scale-[0.99]"><Target className="h-4 w-4" aria-hidden="true" />Lock pulse <span className="text-[10px] font-medium text-slate-800/70">SPACE</span></button>}
      <p className="mt-3 text-center text-[10px] text-slate-500">A miss still earns a small field-data return. Close or press Escape to skip.</p>
    </div>
  </div>;
}
