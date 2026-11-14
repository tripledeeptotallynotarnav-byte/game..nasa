import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Radio, Signal, X } from 'lucide-react';
import { EARTH_DISPATCHES } from '../data/campaignArc';
import { EmergencyMode } from '../three/MarsOutpostScene';
import { missionAudio } from '../utils/audio';

interface EarthDispatchDrawerProps {
  open: boolean;
  currentSol: number;
  emergencyMode: EmergencyMode;
  decryptedSols: number[];
  onMarkDecrypted: (sol: number) => void;
  onClose: () => void;
}

const SCRAMBLE_GLYPHS = '01#%*+=/:~';

function scrambleTail(text: string, revealCount: number): string {
  if (revealCount >= text.length) return text;
  const visible = text.slice(0, revealCount);
  const restLen = Math.min(text.length - revealCount, 18);
  let tail = '';
  for (let i = 0; i < restLen; i++) {
    const ch = text[revealCount + i];
    if (ch === ' ') tail += ' ';
    else tail += SCRAMBLE_GLYPHS[(revealCount + i * 3) % SCRAMBLE_GLYPHS.length];
  }
  return visible + tail + (revealCount + restLen < text.length ? '…' : '');
}

export const EarthDispatchDrawer: React.FC<EarthDispatchDrawerProps> = ({
  open,
  currentSol,
  emergencyMode,
  decryptedSols,
  onMarkDecrypted,
  onClose,
}) => {
  const [viewedSol, setViewedSol] = useState(currentSol);
  const [progress, setProgress] = useState(100);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chimePlayedRef = useRef<Set<number>>(new Set());

  // Automatically select newest Sol and run decryption bar when currentSol advances
  useEffect(() => {
    setViewedSol(currentSol);
  }, [currentSol]);

  const alreadyDecrypted = decryptedSols.includes(viewedSol);

  useEffect(() => {
    if (!open) return;
    if (alreadyDecrypted) {
      setProgress(100);
      return;
    }

    setProgress(0);
    const start = performance.now();
    const durationMs = 2600;
    let frameId = 0;

    const step = () => {
      const elapsed = performance.now() - start;
      const pct = Math.min(100, Math.round((elapsed / durationMs) * 100));
      setProgress(pct);
      if (pct < 100) {
        frameId = requestAnimationFrame(step);
      } else {
        onMarkDecrypted(viewedSol);
        if (!chimePlayedRef.current.has(viewedSol)) {
          chimePlayedRef.current.add(viewedSol);
          missionAudio.playTelemetryChime();
        }
      }
    };

    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [open, viewedSol, alreadyDecrypted, onMarkDecrypted]);

  // Procedural audio-static waveform visualizer on Canvas
  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    let raf = 0;
    let phase = 0;

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Baseline grid
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.16)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();

      const isDecrypting = progress < 100;
      const strokeColor =
        emergencyMode !== 'none'
          ? '#FF7A33'
          : isDecrypting
          ? '#FBBF24'
          : '#22D3EE';

      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2;
      ctx.beginPath();

      const amp = isDecrypting ? h * 0.34 : h * 0.2;
      for (let x = 0; x <= w; x += 3) {
        const norm = x / w;
        const envelope = Math.sin(norm * Math.PI);
        const carrier = Math.sin(norm * 18 + phase) * 0.55 + Math.sin(norm * 41 - phase * 1.6) * 0.3;
        const staticNoise = isDecrypting
          ? Math.sin(x * 0.9 + phase * 5.2) * 0.45
          : Math.sin(x * 0.4 + phase * 1.8) * 0.12;
        const y = h / 2 + (carrier + staticNoise) * amp * (0.35 + envelope * 0.65);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      if (!reduceMotion) {
        phase += isDecrypting ? 0.22 : 0.09;
        raf = requestAnimationFrame(draw);
      }
    };

    draw();
    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [open, progress, emergencyMode]);

  const dispatch = useMemo(
    () => EARTH_DISPATCHES[viewedSol] ?? EARTH_DISPATCHES[1],
    [viewedSol]
  );

  if (!open) return null;

  const revealCount = Math.floor((progress / 100) * dispatch.body.length);
  const renderedBody = progress >= 100 ? dispatch.body : scrambleTail(dispatch.body, revealCount);
  const isAlert = emergencyMode !== 'none';

  return (
    <section
      data-testid="dispatch-drawer"
      aria-label="Houston Deep Space Network Audio Dispatch"
      className={`pointer-events-auto max-w-5xl mx-auto mb-2.5 max-h-[45vh] overflow-y-auto rounded-2xl p-3.5 sm:p-4 bg-[#070B14]/95 border shadow-2xl transition-colors ${
        isAlert ? 'border-rose-500/75' : 'border-cyan-500/45'
      }`}
    >
      <div className="pb-2.5 border-b border-slate-800 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Radio
              className={`w-4 h-4 shrink-0 ${isAlert ? 'text-rose-400' : 'text-cyan-400'}`}
              aria-hidden="true"
            />
            <h2 className="text-xs sm:text-sm font-bold text-white truncate">
              Houston DSN Audio Dispatch
            </h2>
            <span className="hidden sm:inline text-[11px] font-mono text-amber-300 whitespace-nowrap">
              {dispatch.dsnStation} · SNR {dispatch.snrDb}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden sm:inline font-mono text-[11px] text-slate-400">
              {dispatch.timestamp} · Delay {dispatch.lightDelayMin}
            </span>
            <button
              type="button"
              aria-label="Close Houston DSN Dispatch"
              onClick={() => {
                missionAudio.playClick();
                onClose();
              }}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <p className="sm:hidden text-[11px] font-mono text-amber-300">
          {dispatch.dsnStation} · SNR {dispatch.snrDb} · Delay {dispatch.lightDelayMin}
        </p>
      </div>

      {/* Waveform + 14-Min Decryption Progress */}
      <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
        <div className="sm:col-span-5 bg-[#0B1220] border border-slate-800 rounded-xl p-2">
          <canvas
            ref={canvasRef}
            width={340}
            height={52}
            aria-label="Audio static carrier waveform"
            className="w-full h-12 block"
          />
        </div>

        <div className="sm:col-span-7 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="inline-flex items-center gap-1.5 text-cyan-300">
              <Signal className="w-3.5 h-3.5" aria-hidden="true" />
              {progress < 100
                ? 'DECRYPTING 14-MIN LIGHT-TIME PACKET...'
                : '14-MIN LIGHT-TIME LINK SYNCED'}
            </span>
            <span className="text-white font-bold tabular-nums">{progress}%</span>
          </div>
          <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-100 ${
                progress < 100
                  ? 'bg-amber-400'
                  : isAlert
                  ? 'bg-rose-400'
                  : 'bg-cyan-400'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
          {/* Sol Dispatch Archive Selector */}
          <div className="flex flex-wrap items-center gap-1 pt-0.5">
            {Array.from({ length: currentSol }, (_, idx) => idx + 1).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  missionAudio.playClick();
                  setViewedSol(s);
                }}
                className={`px-2 py-0.5 rounded text-[11px] font-mono border cursor-pointer ${
                  viewedSol === s
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                    : 'bg-[#0B1220] border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                S{s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Decrypted Incoming Text Message Log */}
      <div className="mt-2.5 bg-[#0B1220] border border-slate-800 rounded-xl p-3 space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <strong className="text-white font-semibold">
            LEO (HOUSTON): {dispatch.subject}
          </strong>
          <span className="font-mono text-[11px] text-slate-400">Sol {dispatch.sol} Log</span>
        </div>
        <p
          data-testid="dispatch-body-text"
          className="text-xs sm:text-sm font-mono text-slate-200 leading-relaxed"
        >
          {renderedBody}
        </p>
        {progress >= 100 && (
          <p className="text-xs text-amber-300 font-medium pt-0.5">{dispatch.tacticalHint}</p>
        )}
      </div>
    </section>
  );
};
