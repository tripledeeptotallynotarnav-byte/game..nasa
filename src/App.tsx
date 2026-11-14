import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Database,
  Moon,
  Radio,
  RotateCcw,
  Shield,
  Sun,
  Volume2,
  VolumeX,
  Wind,
  Zap,
} from 'lucide-react';
import { DilemmaChoice, ScienceTerm, VERIFIED_FALLBACK_FLARES } from './data/nasaTelemetry';
import {
  computeUnlockedLogIds,
  ModuleId,
  ModuleUsageCounts,
} from './data/campaignArc';
import {
  BuildingId,
  calculateNightCycle,
  createInitialMissionState,
  getSolChapter,
  MAX_BATTERY_KWH,
  MAX_SOLS,
  MissionState,
  performModuleAction,
  upgradeBuilding,
  resolveDilemmaChoice,
  resolveNightCycleStep,
} from './game/simulation';
import { DonkiFetchResult, fetchNasaDonkiTelemetry } from './utils/nasaApi';
import { missionAudio } from './utils/audio';
import { EmergencyMode, EvaObjective, EvaTelemetry } from './three/MarsOutpostScene';
import { TitleScreen } from './components/TitleScreen';
import { MarsViewport, MarsViewportHandle, ModulePopup } from './components/MarsViewport';
import { CharacterPortrait } from './components/CharacterPortrait';
import { EvaHelmetHud, EvaOpportunity } from './components/EvaInterface';
import { CalibrationModal, ColonyProgression } from './components/ColonyProgression';
import { ScienceTermButton } from './components/ScienceTermButton';
import { EarthDispatchDrawer } from './components/EarthDispatchDrawer';
import {
  DebriefModal,
  DilemmaModal,
  ScienceDecoderModal,
  ScienceLogModal,
} from './components/Modals';

type ScreenPhase = 'title' | 'playing' | 'gameover';

interface HudDeltas {
  id: number;
  power: number;
  life: number;
  health: number;
}

const INITIAL_USAGE: ModuleUsageCounts = {
  solar: 0,
  moxie: 0,
  shelter: 0,
  biodome: 0,
};

export default function App() {
  const [phase, setPhase] = useState<ScreenPhase>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') return 'playing';
    }
    return 'title';
  });

  const [donkiResult, setDonkiResult] = useState<DonkiFetchResult>({
    flares: VERIFIED_FALLBACK_FLARES,
    mode: 'VERIFIED_ARCHIVE_FALLBACK',
    fetchedAt: 'Archive Ready',
    statusNote: 'Initialized with verified NASA CCMC DONKI & Perseverance MEDA telemetry.',
  });

  const [mission, setMission] = useState<MissionState>(() =>
    createInitialMissionState(VERIFIED_FALLBACK_FLARES)
  );
  const [moduleUsage, setModuleUsage] = useState<ModuleUsageCounts>(INITIAL_USAGE);
  const [isNightCycle, setIsNightCycle] = useState(false);
  const [muted, setMuted] = useState(false);
  const [showScienceLog, setShowScienceLog] = useState(false);
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [decryptedSols, setDecryptedSols] = useState<number[]>([]);
  const [activeTerm, setActiveTerm] = useState<ScienceTerm | null>(null);
  const [activePopup, setActivePopup] = useState<ModulePopup | null>(null);
  const [hudDeltas, setHudDeltas] = useState<HudDeltas | null>(null);
  const [evaOpportunity, setEvaOpportunity] = useState(false);
  const [evaActive, setEvaActive] = useState(false);
  const [evaSolarCleaned, setEvaSolarCleaned] = useState(false);
  const [evaSampleFound, setEvaSampleFound] = useState(false);
  const [evaTelemetry, setEvaTelemetry] = useState<EvaTelemetry>({
    heading: 0,
    relativeBearing: 43,
    distance: 18,
  });
  const [calibrationOpen, setCalibrationOpen] = useState(false);

  const viewportRef = useRef<MarsViewportHandle | null>(null);
  const evaPromptedSolRef = useRef(0);
  const popupTimerRef = useRef<number | null>(null);
  const deltaTimerRef = useRef<number | null>(null);

  const clearTimers = useCallback(() => {
    if (popupTimerRef.current !== null) {
      window.clearTimeout(popupTimerRef.current);
      popupTimerRef.current = null;
    }
    if (deltaTimerRef.current !== null) {
      window.clearTimeout(deltaTimerRef.current);
      deltaTimerRef.current = null;
    }
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  useEffect(() => {
    document.body.dataset.state = mission.debrief ? 'gameover' : phase;
  }, [phase, mission.debrief]);

  useEffect(() => {
    let active = true;
    fetchNasaDonkiTelemetry().then((res) => {
      if (!active) return;
      setDonkiResult(res);
    });
    return () => {
      active = false;
    };
  }, []);

  const chapter = useMemo(() => getSolChapter(mission.sol), [mission.sol]);

  const emergencyMode: EmergencyMode = useMemo(() => {
    const severeSolarFlare =
      chapter.hazardType === 'flare' ||
      (mission.sol >= 4 && /^[MX]/i.test(mission.activeFlare.classType));
    if (severeSolarFlare) return 'flare';
    if (chapter.hazardType === 'dust' || mission.weather.tau >= 0.85) return 'dust';
    return 'none';
  }, [chapter.hazardType, mission.sol, mission.activeFlare.classType, mission.weather.tau]);

  const unlockedLogIds = useMemo(
    () => computeUnlockedLogIds(mission.sol, moduleUsage),
    [mission.sol, moduleUsage]
  );

  useEffect(() => {
    const hasFieldOpportunity =
      (mission.resources.panelDustPct >= 34 && mission.sol % 2 === 1) || mission.sol % 4 === 0;
    if (
      phase === 'playing' &&
      !mission.debrief &&
      !mission.pendingDilemma &&
      !isNightCycle &&
      !evaActive &&
      hasFieldOpportunity &&
      evaPromptedSolRef.current !== mission.sol
    ) {
      evaPromptedSolRef.current = mission.sol;
      setEvaOpportunity(true);
    }
  }, [phase, mission.sol, mission.resources.panelDustPct, mission.debrief, mission.pendingDilemma, isNightCycle, evaActive]);

  // Drive synthesized Martian ambient wind soundscape based on mission state
  useEffect(() => {
    missionAudio.setAmbientCondition({
      active: phase === 'playing' && !mission.debrief,
      isDustStorm: emergencyMode === 'dust' || mission.weather.tau >= 1.0,
      isEmergency: emergencyMode !== 'none',
    });
  }, [phase, mission.debrief, emergencyMode, mission.weather.tau]);

  const showModulePopup = useCallback((moduleId: ModuleId, text: string, positive: boolean) => {
    if (popupTimerRef.current !== null) {
      window.clearTimeout(popupTimerRef.current);
    }
    setActivePopup({
      id: Date.now() + Math.random(),
      moduleId,
      text,
      positive,
    });
    popupTimerRef.current = window.setTimeout(() => {
      setActivePopup(null);
      popupTimerRef.current = null;
    }, 3200);
  }, []);

  const showHudDeltaBadges = useCallback((power: number, life: number, health: number) => {
    if (deltaTimerRef.current !== null) {
      window.clearTimeout(deltaTimerRef.current);
    }
    setHudDeltas({
      id: Date.now() + Math.random(),
      power,
      life,
      health,
    });
    deltaTimerRef.current = window.setTimeout(() => {
      setHudDeltas(null);
      deltaTimerRef.current = null;
    }, 3200);
  }, []);

  const startMission = useCallback(() => {
    viewportRef.current?.exitEva(false);
    clearTimers();
    setMission(createInitialMissionState(donkiResult.flares));
    setModuleUsage(INITIAL_USAGE);
    setDecryptedSols([]);
    setDispatchOpen(false);
    setIsNightCycle(false);
    setActivePopup(null);
    setHudDeltas(null);
    setEvaOpportunity(false);
    setEvaActive(false);
    setEvaSolarCleaned(false);
    setEvaSampleFound(false);
    setCalibrationOpen(false);
    evaPromptedSolRef.current = 0;
    setPhase('playing');
    setShowScienceLog(false);
    setActiveTerm(null);
  }, [clearTimers, donkiResult.flares]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (phase === 'title' && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        missionAudio.playSolAdvance();
        startMission();
        return;
      }
      if (e.key === 'Escape') {
        if (activeTerm) setActiveTerm(null);
        else if (showScienceLog) setShowScienceLog(false);
        else if (dispatchOpen) setDispatchOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, activeTerm, showScienceLog, dispatchOpen, startMission]);

  const handleModuleAction = useCallback(
    (moduleId: ModuleId) => {
      if (isNightCycle || mission.pendingDilemma || mission.debrief) return;

      const result = performModuleAction(mission.resources, moduleId, mission.buildingLevels);
      if (!result.applied) {
        missionAudio.playWarningKlaxon();
        showModulePopup(moduleId, result.feedbackText, false);
        return;
      }

      if (moduleId === 'moxie') missionAudio.playMoxieTurbine();
      else if (moduleId === 'solar') missionAudio.playSolarServoSweep();
      else if (moduleId === 'shelter') missionAudio.playShieldSurge();
      else missionAudio.playBiodomeMist();

      viewportRef.current?.triggerModulePulse(moduleId);
      setMission((prev) => ({ ...prev, resources: result.nextResources }));
      setModuleUsage((prev) => ({ ...prev, [moduleId]: prev[moduleId] + 1 }));
      showModulePopup(moduleId, result.feedbackText, true);
      showHudDeltaBadges(result.deltaPower, result.deltaLife, result.deltaHealth);
    },
    [
      isNightCycle,
      mission.pendingDilemma,
      mission.debrief,
      mission.resources,
      mission.buildingLevels,
      showModulePopup,
      showHudDeltaBadges,
    ]
  );

  const handleBuildingUpgrade = useCallback((building: BuildingId) => {
    if (isNightCycle || mission.pendingDilemma || mission.debrief || evaActive) return;
    const result = upgradeBuilding(mission.resources, mission.buildingLevels, building);
    if (!result.applied) {
      missionAudio.playWarningKlaxon();
      showModulePopup(building, result.reason ?? 'Upgrade unavailable.', false);
      return;
    }
    missionAudio.playClick();
    setMission((previous) => ({
      ...previous,
      resources: result.nextResources,
      buildingLevels: result.nextLevels,
    }));
    showModulePopup(building, `Tier ${result.nextLevels[building]} online · −${result.cost} kWh`, true);
    showHudDeltaBadges(-result.cost, 0, 0);
  }, [isNightCycle, mission.pendingDilemma, mission.debrief, mission.resources, mission.buildingLevels, evaActive, showModulePopup, showHudDeltaBadges]);

  const handleCalibrationComplete = useCallback((accuracy: number) => {
    const bonusPower = Math.round(4 + accuracy * 0.12);
    const bonusScience = 2 + Math.floor(accuracy / 25);
    setMission((previous) => {
      if (previous.calibrationSol === previous.sol) return previous;
      return {
        ...previous,
        calibrationSol: previous.sol,
        resources: {
          ...previous.resources,
          powerKwh: Math.min(MAX_BATTERY_KWH, previous.resources.powerKwh + bonusPower),
          sciencePoints: previous.resources.sciencePoints + bonusScience,
        },
      };
    });
    setCalibrationOpen(false);
    showHudDeltaBadges(Math.min(MAX_BATTERY_KWH, mission.resources.powerKwh + bonusPower) - mission.resources.powerKwh, 0, 0);
    showModulePopup('solar', `Calibration ${accuracy}% · +${bonusScience} science`, true);
  }, [mission.resources.powerKwh, showHudDeltaBadges, showModulePopup]);

  const beginEva = () => {
    if (isNightCycle || mission.pendingDilemma || mission.debrief) return;
    const started = viewportRef.current?.enterEva() ?? false;
    if (!started) return;
    setEvaOpportunity(false);
    setEvaSolarCleaned(false);
    setEvaSampleFound(false);
    setEvaActive(true);
  };

  const skipEva = () => {
    evaPromptedSolRef.current = mission.sol;
    setEvaOpportunity(false);
  };

  const handleEvaObjective = useCallback((objective: EvaObjective) => {
    if (objective === 'solar') {
      setEvaSolarCleaned(true);
      missionAudio.playSolarServoSweep();
      setMission((prev) => {
        const nextDust = Math.max(0, prev.resources.panelDustPct - 28);
        const nextPower = Math.min(MAX_BATTERY_KWH, prev.resources.powerKwh + 14);
        return {
          ...prev,
          resources: {
            ...prev.resources,
            panelDustPct: nextDust,
            powerKwh: nextPower,
            sciencePoints: prev.resources.sciencePoints + 1,
          },
        };
      });
      showHudDeltaBadges(
        Math.min(MAX_BATTERY_KWH, mission.resources.powerKwh + 14) - mission.resources.powerKwh,
        0,
        0
      );
      return;
    }
    setEvaSampleFound(true);
    missionAudio.playBiodomeMist();
  }, [mission.resources.powerKwh, showHudDeltaBadges]);

  const handleEvaExit = useCallback(() => {
    setEvaActive(false);
    if (evaSampleFound) {
      setMission((prev) => ({
        ...prev,
        resources: {
          ...prev.resources,
          lifeSupportPct: Math.min(100, prev.resources.lifeSupportPct + 6),
          sciencePoints: prev.resources.sciencePoints + 8,
        },
      }));
      showHudDeltaBadges(
        0,
        Math.min(100, mission.resources.lifeSupportPct + 6) - mission.resources.lifeSupportPct,
        0
      );
    }
    setEvaSampleFound(false);
  }, [evaSampleFound, mission.resources.lifeSupportPct, showHudDeltaBadges]);

  const leaveEva = () => viewportRef.current?.exitEva();

  const handleEndSolNightCycle = () => {
    if (isNightCycle || evaActive || mission.pendingDilemma || mission.debrief) return;
    setEvaOpportunity(false);
    setIsNightCycle(true);
    setDispatchOpen(false);

    const       previewSummary = calculateNightCycle(
      mission.resources,
      mission.weather,
      mission.activeFlare,
      chapter,
      mission.buildingLevels
    );


    if (chapter.hazardType !== 'none') {
      missionAudio.playHazardImpact();
    } else {
      missionAudio.playSolAdvance();
    }

    const completeNight = () => {
      setIsNightCycle(false);
      setMission((prev) => {
        const next = resolveNightCycleStep(prev, donkiResult.flares);
        if (next.debrief) {
          missionAudio.playMissionComplete(next.debrief.outcome === 'VICTORY');
        } else if (
          next.resources.powerKwh < 30 ||
          next.resources.lifeSupportPct < 35 ||
          next.resources.crewHealthPct < 35
        ) {
          missionAudio.playWarningKlaxon();
        }
        return next;
      });
    };

    if (viewportRef.current) {
      viewportRef.current.triggerNightCycle(
        chapter.hazardType,
        previewSummary.shieldBlockedFlare,
        completeNight
      );
    } else {
      window.setTimeout(completeNight, 600);
    }
  };

  const handleChooseDilemma = (choice: DilemmaChoice) => {
    setMission((prev) => {
      const next = resolveDilemmaChoice(prev, choice, donkiResult.flares);
      if (next.debrief) {
        missionAudio.playMissionComplete(next.debrief.outcome === 'VICTORY');
      }
      return next;
    });
  };

  const handleMarkDecrypted = useCallback((solNum: number) => {
    setDecryptedSols((prev) => (prev.includes(solNum) ? prev : [...prev, solNum]));
  }, []);

  const toggleMute = () => {
    const nextMuted = !muted;
    setMuted(nextMuted);
    missionAudio.setMuted(nextMuted);
    if (!nextMuted) missionAudio.playClick();
  };

  if (phase === 'title') {
    return <TitleScreen onStart={startMission} nasaStatusNote={donkiResult.statusNote} />;
  }

  const powerPct = Math.round((mission.resources.powerKwh / MAX_BATTERY_KWH) * 100);
  const lifePct = Math.round(mission.resources.lifeSupportPct);
  const healthPct = Math.round(mission.resources.crewHealthPct);
  const modalOpen = Boolean(mission.pendingDilemma || mission.debrief || showScienceLog || activeTerm || calibrationOpen);
  const isEmergency = emergencyMode !== 'none';
  const hasUnreadDispatch = !decryptedSols.includes(mission.sol);

  return (
    <div
      data-emergency={emergencyMode}
      className="relative w-screen h-screen overflow-hidden bg-[#070B14] text-slate-100 select-none"
    >
      {/* Full-Screen 3D Mars Outpost */}
      <MarsViewport
        ref={viewportRef}
        resources={mission.resources}
        tau={mission.weather.tau}
        targetModule={chapter.targetModule}
        emergencyMode={emergencyMode}
        isNightCycle={isNightCycle}
        disabled={modalOpen || evaActive}
        activePopup={activePopup}
        onModuleAction={handleModuleAction}
        onEvaObjective={handleEvaObjective}
        onEvaTelemetry={setEvaTelemetry}
        onEvaExit={handleEvaExit}
        evaActive={evaActive}
      />

      <EvaOpportunity
        visible={evaOpportunity && !evaActive}
        sol={mission.sol}
        onAccept={beginEva}
        onSkip={skipEva}
      />
      {evaActive && (
        <EvaHelmetHud
          lifeSupport={mission.resources.lifeSupportPct}
          telemetry={evaTelemetry}
          solarCleaned={evaSolarCleaned}
          sampleFound={evaSampleFound}
          onExit={leaveEva}
        />
      )}
      {!evaActive && !mission.debrief && (
        <ColonyProgression
          power={mission.resources.powerKwh}
          levels={mission.buildingLevels}
          calibratedThisSol={mission.calibrationSol === mission.sol}
          disabled={Boolean(isNightCycle || mission.pendingDilemma || modalOpen)}
          onUpgrade={handleBuildingUpgrade}
          onStartCalibration={() => setCalibrationOpen(true)}
        />
      )}

      {/* Minimal Translucent Top HUD Bar */}
      <header className="relative z-20 pointer-events-none px-2.5 sm:px-5 pt-2.5">
        <div
          data-testid="top-hud-bar"
          className={`pointer-events-auto max-w-7xl mx-auto rounded-2xl px-3 sm:px-4 py-2.5 shadow-xl flex flex-col gap-2 border transition-colors ${
            isEmergency
              ? 'bg-[#19090E]/92 border-rose-500/80 shadow-[0_0_24px_rgba(239,68,68,0.24)]'
              : 'bg-[#070B14]/90 border-slate-700/80'
          }`}
        >
          {/* Row 1: Sol, Emergency Banner, MEDA Weather & Utility Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 min-w-0">
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-white">
                OUTPOST COMMAND
              </h1>
              <span
                data-testid="hud-sol-counter"
                className="text-xs sm:text-sm font-mono font-semibold text-cyan-300 whitespace-nowrap"
              >
                <ScienceTermButton termKey="sol" onSelectTerm={setActiveTerm} /> {mission.sol} /{' '}
                {MAX_SOLS}
              </span>
              {isEmergency && (
                <span
                  data-testid="emergency-protocol-badge"
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-950/90 border border-rose-500/80 text-[11px] font-mono font-bold text-rose-200 whitespace-nowrap"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" aria-hidden="true" />
                  <span>
                    {emergencyMode === 'flare'
                      ? 'EMERGENCY PROTOCOL: SOLAR FLARE'
                      : 'EMERGENCY PROTOCOL: DUST STORM'}
                  </span>
                </span>
              )}
              <span className="hidden md:inline-flex items-center gap-2 text-xs font-mono text-slate-300">
                <span>{mission.weather.tempMinC}°C</span>
                <span className="text-slate-600">·</span>
                <span>
                  <ScienceTermButton termKey="tau" label="Tau" onSelectTerm={setActiveTerm} />{' '}
                  {mission.weather.tau}
                </span>
                <span className="text-slate-600">·</span>
                <span className="inline-flex items-center gap-1 text-amber-300">
                  <Sun className="w-3.5 h-3.5" aria-hidden="true" />
                  {mission.activeFlare.classType}
                </span>
              </span>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  missionAudio.playClick();
                  setShowScienceLog(true);
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-cyan-300 border border-slate-700 cursor-pointer whitespace-nowrap"
              >
                <Database className="w-3.5 h-3.5" aria-hidden="true" />
                <span>NASA Data Log</span>
                <span className="font-mono text-[10px] text-emerald-300">
                  ({unlockedLogIds.length}/9)
                </span>
              </button>
              <button
                type="button"
                onClick={toggleMute}
                aria-label={muted ? 'Unmute sound effects' : 'Mute sound effects'}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer"
              >
                {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={() => {
                  missionAudio.playClick();
                  startMission();
                }}
                aria-label="Restart mission"
                className="p-1.5 sm:px-2.5 sm:py-1.5 inline-flex items-center gap-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            </div>
          </div>

          {/* Row 2: The 3 Coupled Resource Bars */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            {/* 1. Power Grid */}
            <div
              className={`relative bg-[#0B1220] border rounded-xl px-2.5 py-1.5 ${
                isEmergency ? 'border-rose-800/80' : 'border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between gap-1 text-[11px] sm:text-xs">
                <span className="inline-flex items-center gap-1 font-medium text-amber-200 truncate">
                  <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" aria-hidden="true" />
                  <span className="hidden sm:inline">Power</span>
                </span>
                <span
                  data-testid="meter-power-value"
                  className="font-mono font-bold text-white tabular-nums"
                >
                  {mission.resources.powerKwh}{' '}
                  <span className="text-[10px] text-slate-400">kWh</span>
                </span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    powerPct < 25 ? 'bg-rose-500' : 'bg-amber-400'
                  }`}
                  style={{ width: `${powerPct}%` }}
                />
              </div>
              {hudDeltas && hudDeltas.power !== 0 && (
                <span
                  key={`p-${hudDeltas.id}`}
                  data-testid="hud-delta-power"
                  className={`anim-float-pop absolute -bottom-4 right-2 text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#070B14] border ${
                    hudDeltas.power > 0
                      ? 'text-emerald-300 border-emerald-500/60'
                      : 'text-amber-300 border-amber-500/60'
                  }`}
                >
                  {hudDeltas.power > 0 ? `+${hudDeltas.power}` : hudDeltas.power} kWh
                </span>
              )}
            </div>

            {/* 2. Life Support O2 & Water */}
            <div
              className={`relative bg-[#0B1220] border rounded-xl px-2.5 py-1.5 ${
                isEmergency ? 'border-rose-800/80' : 'border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between gap-1 text-[11px] sm:text-xs">
                <span className="inline-flex items-center gap-1 font-medium text-cyan-200 truncate">
                  <Wind className="w-3.5 h-3.5 text-cyan-400 shrink-0" aria-hidden="true" />
                  <span className="hidden sm:inline">O₂ & Water</span>
                </span>
                <span
                  data-testid="meter-life-value"
                  className="font-mono font-bold text-white tabular-nums"
                >
                  {lifePct}%
                </span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    lifePct < 30 ? 'bg-rose-500' : 'bg-cyan-400'
                  }`}
                  style={{ width: `${lifePct}%` }}
                />
              </div>
              {hudDeltas && hudDeltas.life !== 0 && (
                <span
                  key={`l-${hudDeltas.id}`}
                  data-testid="hud-delta-life"
                  className={`anim-float-pop absolute -bottom-4 right-2 text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#070B14] border ${
                    hudDeltas.life > 0
                      ? 'text-cyan-300 border-cyan-500/60'
                      : 'text-amber-300 border-amber-500/60'
                  }`}
                >
                  {hudDeltas.life > 0 ? `+${hudDeltas.life}%` : `${hudDeltas.life}%`}
                </span>
              )}
            </div>

            {/* 3. Radiation Shield & Crew Health */}
            <div
              className={`relative bg-[#0B1220] border rounded-xl px-2.5 py-1.5 ${
                isEmergency ? 'border-rose-800/80' : 'border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between gap-1 text-[11px] sm:text-xs">
                <span className="inline-flex items-center gap-1 font-medium text-emerald-200 truncate">
                  <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
                  <span className="hidden sm:inline">Shield & Crew</span>
                </span>
                <span
                  data-testid="meter-health-value"
                  className="font-mono font-bold text-white tabular-nums"
                >
                  {healthPct}%{' '}
                  <span className="hidden md:inline text-[10px] text-sky-300">
                    ({mission.resources.waterWallCm}cm)
                  </span>
                </span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    healthPct < 35 ? 'bg-rose-500' : 'bg-emerald-400'
                  }`}
                  style={{ width: `${healthPct}%` }}
                />
              </div>
              {hudDeltas && hudDeltas.health !== 0 && (
                <span
                  key={`h-${hudDeltas.id}`}
                  data-testid="hud-delta-health"
                  className={`anim-float-pop absolute -bottom-4 right-2 text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#070B14] border ${
                    hudDeltas.health > 0
                      ? 'text-emerald-300 border-emerald-500/60'
                      : 'text-rose-300 border-rose-500/60'
                  }`}
                >
                  {hudDeltas.health > 0 ? `+${hudDeltas.health}%` : `${hudDeltas.health}%`}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Bottom Dock: Optional Earth Audio Dispatch Drawer + Story Banner */}
      {!evaActive && <footer className="fixed bottom-2.5 sm:bottom-4 inset-x-2.5 sm:inset-x-5 z-20 pointer-events-none">
        <EarthDispatchDrawer
          open={dispatchOpen && !isNightCycle}
          currentSol={mission.sol}
          emergencyMode={emergencyMode}
          decryptedSols={decryptedSols}
          onMarkDecrypted={handleMarkDecrypted}
          onClose={() => setDispatchOpen(false)}
        />

        <div
          data-testid="story-banner"
          className={`pointer-events-auto max-w-5xl mx-auto rounded-2xl p-3 sm:p-4 shadow-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 border transition-colors ${
            isEmergency
              ? 'bg-[#19090E]/94 border-rose-500/80'
              : 'bg-[#070B14]/92 border-slate-700/85'
          }`}
        >
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <CharacterPortrait speaker={chapter.speaker} />
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                <strong className="text-sm text-white">{chapter.speakerName}</strong>
                <span className={isEmergency ? 'text-rose-300 font-mono' : 'text-amber-300 font-mono'}>
                  {chapter.arcTitle}
                </span>
                <span className="text-slate-400 hidden sm:inline">· {chapter.commNote}</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-200 leading-snug">
                {isNightCycle
                  ? `Simulating Sol ${mission.sol} sunset & overnight survival across Jezero Crater...`
                  : chapter.storyPrompt}
              </p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400 pt-0.5">
                <button
                  type="button"
                  data-testid="toggle-dispatch-btn"
                  disabled={isNightCycle}
                  onClick={() => {
                    missionAudio.playClick();
                    setDispatchOpen((prev) => !prev);
                  }}
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border font-mono text-[11px] cursor-pointer transition-colors ${
                    dispatchOpen
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                      : hasUnreadDispatch
                      ? 'bg-amber-500/15 border-amber-400/70 text-amber-200 hover:bg-amber-500/25'
                      : 'bg-[#0B1220] border-slate-700 text-cyan-300 hover:border-cyan-400'
                  }`}
                >
                  <Radio className="w-3 h-3 shrink-0" aria-hidden="true" />
                  <span>{dispatchOpen ? 'Hide DSN Dispatch' : 'Houston DSN Dispatch'}</span>
                  {hasUnreadDispatch && !dispatchOpen && (
                    <span className="text-amber-300 font-bold">· NEW</span>
                  )}
                </button>
                <span className="hidden sm:inline">Decoder:</span>
                <ScienceTermButton termKey="moxie" onSelectTerm={setActiveTerm} />
                <ScienceTermButton termKey="waterwall" onSelectTerm={setActiveTerm} />
                <ScienceTermButton termKey="hydroponics" onSelectTerm={setActiveTerm} />
                <ScienceTermButton termKey="commdelay" onSelectTerm={setActiveTerm} />
                <span className="font-mono text-cyan-300 ml-auto">
                  {mission.resources.sciencePoints} Sci Pts
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            data-testid="end-sol-btn"
            disabled={isNightCycle || modalOpen}
            onClick={handleEndSolNightCycle}
            className={`inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-3 rounded-xl font-semibold text-xs sm:text-sm transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-cyan-300 ${
              isNightCycle
                ? 'bg-amber-500/20 text-amber-200 border border-amber-400/50 cursor-wait'
                : isEmergency
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
            }`}
          >
            <Moon className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>
              {isNightCycle ? `Running Sol ${mission.sol} Night...` : 'End Sol & Watch Night Cycle'}
            </span>
          </button>
        </div>
      </footer>}

      {calibrationOpen && !mission.debrief && (
        <CalibrationModal
          onComplete={handleCalibrationComplete}
          onClose={() => setCalibrationOpen(false)}
        />
      )}

      {/* Modals */}
      {mission.pendingDilemma && !mission.debrief && (
        <DilemmaModal
          dilemma={mission.pendingDilemma}
          sol={mission.sol}
          onChoose={handleChooseDilemma}
          onOpenScienceLog={() => setShowScienceLog(true)}
        />
      )}

      {showScienceLog && (
        <ScienceLogModal
          donkiResult={donkiResult}
          activeSol={mission.sol}
          unlockedLogIds={unlockedLogIds}
          onClose={() => setShowScienceLog(false)}
        />
      )}

      {activeTerm && (
        <ScienceDecoderModal term={activeTerm} onClose={() => setActiveTerm(null)} />
      )}

      {mission.debrief && (
        <DebriefModal debrief={mission.debrief} onReplay={startMission} />
      )}
    </div>
  );
}
