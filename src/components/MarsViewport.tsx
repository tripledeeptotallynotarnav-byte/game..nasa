import React, { useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Shield, Sparkles, Sprout, Wind, Zap } from 'lucide-react';
import { ModuleId, SolHazardType } from '../data/campaignArc';
import { MissionResources } from '../game/simulation';
import {
  EmergencyMode,
  EvaObjective,
  EvaTelemetry,
  MarsOutpostScene,
  ProjectedModuleAnchor,
} from '../three/MarsOutpostScene';

export interface ModulePopup {
  id: number;
  moduleId: ModuleId;
  text: string;
  positive: boolean;
}

export interface MarsViewportHandle {
  triggerModulePulse: (moduleId: ModuleId) => void;
  triggerNightCycle: (
    hazardType: SolHazardType,
    shieldBlockedFlare: boolean,
    onComplete: () => void
  ) => void;
  enterEva: () => boolean;
  exitEva: (notify?: boolean) => void;
}

interface MarsViewportProps {
  resources: MissionResources;
  tau: number;
  targetModule: ModuleId | 'any';
  emergencyMode: EmergencyMode;
  isNightCycle: boolean;
  disabled: boolean;
  activePopup: ModulePopup | null;
  onModuleAction: (moduleId: ModuleId) => void;
  onEvaObjective: (objective: EvaObjective) => void;
  onEvaTelemetry: (telemetry: EvaTelemetry) => void;
  onEvaExit: () => void;
  evaActive: boolean;
}

const MODULE_META: Record<
  ModuleId,
  {
    name: string;
    actionLabel: string;
    tradeoffShort: string;
    accentClass: string;
    icon: React.FC<{ className?: string }>;
  }
> = {
  solar: {
    name: 'Solar Array Field',
    actionLabel: 'Clean Dust',
    tradeoffShort: '+Power · -3% H₂O',
    accentClass: 'border-amber-400/70 text-amber-200 hover:border-amber-300',
    icon: Zap,
  },
  moxie: {
    name: 'MOXIE O₂ Core',
    actionLabel: 'Boost O₂',
    tradeoffShort: '+14% O₂ · -12 kWh',
    accentClass: 'border-cyan-400/70 text-cyan-200 hover:border-cyan-300',
    icon: Wind,
  },
  shelter: {
    name: 'Water-Wall Shelter',
    actionLabel: 'Shield Up',
    tradeoffShort: '+6cm Wall · -14 kWh',
    accentClass: 'border-sky-400/70 text-sky-200 hover:border-sky-300',
    icon: Shield,
  },
  biodome: {
    name: 'Hydroponic Bio-Dome',
    actionLabel: 'Water Crops',
    tradeoffShort: '+8% O₂/Food · -10 kWh',
    accentClass: 'border-emerald-400/70 text-emerald-200 hover:border-emerald-300',
    icon: Sprout,
  },
};

export const MarsViewport = React.forwardRef<MarsViewportHandle, MarsViewportProps>(
  (
    {
      resources,
      tau,
      targetModule,
      emergencyMode,
      isNightCycle,
      disabled,
      activePopup,
      onModuleAction,
      onEvaObjective,
      onEvaTelemetry,
      onEvaExit,
      evaActive,
    },
    ref
  ) => {
    const mountRef = useRef<HTMLDivElement | null>(null);
    const sceneRef = useRef<MarsOutpostScene | null>(null);

    const onActionRef = useRef(onModuleAction);
    onActionRef.current = onModuleAction;
    const onEvaObjectiveRef = useRef(onEvaObjective);
    onEvaObjectiveRef.current = onEvaObjective;
    const onEvaTelemetryRef = useRef(onEvaTelemetry);
    onEvaTelemetryRef.current = onEvaTelemetry;
    const onEvaExitRef = useRef(onEvaExit);
    onEvaExitRef.current = onEvaExit;

    const disabledRef = useRef(disabled || isNightCycle);
    disabledRef.current = disabled || isNightCycle;

    const [anchors, setAnchors] = useState<ProjectedModuleAnchor[]>([]);
    const [hoveredId, setHoveredId] = useState<ModuleId | null>(null);
    const [webglError, setWebglError] = useState<string | null>(null);

    useImperativeHandle(ref, () => ({
      triggerModulePulse: (moduleId: ModuleId) => {
        sceneRef.current?.triggerModuleFeedback(moduleId);
      },
      triggerNightCycle: (hazardType, shieldBlockedFlare, onComplete) => {
        sceneRef.current?.triggerNightCycle(hazardType, shieldBlockedFlare, onComplete);
      },
      enterEva: () => sceneRef.current?.enterEva() ?? false,
      exitEva: (notify = true) => sceneRef.current?.exitEva(notify),
    }));

    useEffect(() => {
      const el = mountRef.current;
      if (!el) return;

      const controller = new MarsOutpostScene(el, {
        onModuleClick: (moduleId) => {
          if (!disabledRef.current) {
            onActionRef.current(moduleId);
          }
        },
        onHoverModule: (moduleId) => {
          setHoveredId(moduleId);
        },
        onEvaObjective: (objective) => onEvaObjectiveRef.current(objective),
        onEvaTelemetry: (telemetry) => onEvaTelemetryRef.current(telemetry),
        onEvaExit: () => onEvaExitRef.current(),
        onAnchorsUpdate: (next) => {
          setAnchors(next);
        },
        onWebglError: (reason) => {
          setWebglError(reason);
        },
      });
      sceneRef.current = controller;

      return () => {
        controller.dispose();
        sceneRef.current = null;
      };
    }, []);

    useEffect(() => {
      sceneRef.current?.updateMissionVisuals(resources, tau, targetModule, emergencyMode);
    }, [resources, tau, targetModule, emergencyMode]);

    const getDynamicStatus = (id: ModuleId): string => {
      if (id === 'solar') return `Dust ${resources.panelDustPct}%`;
      if (id === 'moxie') return `O₂ ${resources.lifeSupportPct}%`;
      if (id === 'shelter') return `Wall ${resources.waterWallCm}cm`;
      return `Crop Lv.${resources.cropGrowth}`;
    };

    return (
      <div className="fixed inset-0 overflow-hidden bg-[#1D0F0C]" data-testid="mars-3d-viewport">
        {/* Isolated WebGL Canvas Container */}
        <div ref={mountRef} className="absolute inset-0" />

        {webglError && (
          <div className="absolute inset-0 flex items-center justify-center p-6 bg-[#070B14] text-center">
            <div className="max-w-md bg-[#0F172A] border border-slate-700 rounded-2xl p-6 space-y-2">
              <p className="text-base font-bold text-white">3D Viewport Unavailable</p>
              <p className="text-xs text-slate-300">{webglError}</p>
            </div>
          </div>
        )}

        {/* Projected On-Object 3D Module Hotspots */}
        {!isNightCycle && !webglError && !evaActive && (
          <div className="absolute inset-0 pointer-events-none z-10">
            {anchors.map((anchor) => {
              if (!anchor.visible) return null;
              const meta = MODULE_META[anchor.id];
              const Icon = meta.icon;
              const isTarget = targetModule === anchor.id;
              const isHovered = hoveredId === anchor.id;
              const hasPopup = activePopup?.moduleId === anchor.id;

              return (
                <div
                  key={anchor.id}
                  style={{
                    left: `${anchor.x}px`,
                    top: `${anchor.y}px`,
                  }}
                  className="absolute -translate-x-1/2 -translate-y-full pointer-events-auto"
                >
                  {/* Floating Action Feedback Callout */}
                  {hasPopup && activePopup && (
                    <div
                      key={activePopup.id}
                      data-testid={`module-feedback-${anchor.id}`}
                      className={`anim-float-pop mb-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold text-center whitespace-nowrap border shadow-lg ${
                        activePopup.positive
                          ? 'bg-[#071F1B] border-emerald-400 text-emerald-200'
                          : 'bg-[#290F14] border-rose-400 text-rose-200'
                      }`}
                    >
                      {activePopup.text}
                    </div>
                  )}

                  <button
                    type="button"
                    data-testid={`hotspot-${anchor.id}`}
                    disabled={disabled}
                    onClick={() => onModuleAction(anchor.id)}
                    aria-label={`${meta.name}: ${meta.actionLabel} (${meta.tradeoffShort})`}
                    className={`group flex flex-col items-center gap-0.5 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-xl bg-[#0B1220]/92 border text-left transition-transform cursor-pointer shadow-lg focus-visible:outline-2 focus-visible:outline-cyan-300 ${
                      isTarget
                        ? 'border-cyan-400 ring-2 ring-cyan-400/35 -translate-y-0.5'
                        : isHovered
                        ? 'border-amber-300 -translate-y-0.5'
                        : meta.accentClass
                    }`}
                  >
                    <div className="flex items-center gap-1 sm:gap-1.5">
                      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      <span className="text-[11px] sm:text-xs font-bold text-white whitespace-nowrap">
                        {meta.actionLabel}
                      </span>
                      {isTarget && (
                        <Sparkles className="w-3 h-3 text-cyan-300 shrink-0" aria-hidden="true" />
                      )}
                    </div>
                    <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-mono text-slate-300 whitespace-nowrap">
                      <span>{getDynamicStatus(anchor.id)}</span>
                      <span className="text-slate-500">·</span>
                      <span className="text-cyan-300">{meta.tradeoffShort}</span>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }
);

MarsViewport.displayName = 'MarsViewport';
