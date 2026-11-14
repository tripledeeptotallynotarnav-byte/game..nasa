import {
  DILEMMA_EVENTS,
  DilemmaChoice,
  DilemmaEvent,
  MEDA_ARCHIVE_SOLS,
  MedaSolWeather,
  NasaFlareRecord,
  VERIFIED_FALLBACK_FLARES,
} from '../data/nasaTelemetry';
import { CAMPAIGN_CHAPTERS, ModuleId, SolCampaignChapter } from '../data/campaignArc';

export const MAX_SOLS = 10;
export const MAX_BATTERY_KWH = 120;

export interface MissionResources {
  powerKwh: number; // 0..120
  lifeSupportPct: number; // 0..100
  crewHealthPct: number; // 0..100
  panelDustPct: number; // 0..85
  waterWallCm: number; // 8..36
  cropGrowth: number; // 1..5
  sciencePoints: number;
}

export type BuildingId = 'solar' | 'moxie' | 'shelter' | 'biodome';
export type BuildingLevels = Record<BuildingId, number>;
export const MAX_BUILDING_LEVEL = 3;
export const INITIAL_BUILDING_LEVELS: BuildingLevels = {
  solar: 1,
  moxie: 1,
  shelter: 1,
  biodome: 1,
};

export interface UpgradeResult {
  applied: boolean;
  reason?: string;
  nextResources: MissionResources;
  nextLevels: BuildingLevels;
  cost: number;
}

export interface ModuleActionResult {
  applied: boolean;
  reason?: string;
  nextResources: MissionResources;
  deltaPower: number;
  deltaLife: number;
  deltaHealth: number;
  deltaDust: number;
  deltaShieldCm: number;
  feedbackText: string;
}

export interface NightCycleSummary {
  solarRechargeKwh: number;
  overnightDrawKwh: number;
  netPowerKwh: number;
  netLifeSupportPct: number;
  netCrewHealthPct: number;
  netDustPct: number;
  radDoseMsv: number;
  shieldBlockedFlare: boolean;
}

export interface MissionLogEntry {
  sol: number;
  headline: string;
  detail: string;
  nasaSource: string;
  tone: 'nominal' | 'caution' | 'critical';
}

export interface DebriefReport {
  outcome: 'VICTORY' | 'DEFEAT';
  defeatReason: string | null;
  solsCompleted: number;
  finalResources: MissionResources;
  crewSafetyGrade: string;
  resourceEfficiencyGrade: string;
  scienceGrade: string;
  overallRank: string;
  totalScore: number;
}

export interface MissionState {
  sol: number;
  resources: MissionResources;
  buildingLevels: BuildingLevels;
  calibrationSol: number;
  weather: MedaSolWeather;
  activeFlare: NasaFlareRecord;
  pendingDilemma: DilemmaEvent | null;
  usedDilemmaIds: string[];
  logs: MissionLogEntry[];
  debrief: DebriefReport | null;
}

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function getSolChapter(sol: number): SolCampaignChapter {
  const index = clamp(sol - 1, 0, CAMPAIGN_CHAPTERS.length - 1);
  return CAMPAIGN_CHAPTERS[index];
}

export function getWeatherForSol(sol: number): MedaSolWeather {
  const index = clamp(sol - 1, 0, MEDA_ARCHIVE_SOLS.length - 1);
  return MEDA_ARCHIVE_SOLS[index];
}

export function pickFlareForSol(sol: number, flares: NasaFlareRecord[]): NasaFlareRecord {
  const pool = flares.length > 0 ? flares : VERIFIED_FALLBACK_FLARES;
  return pool[(sol - 1) % pool.length];
}

export function createInitialMissionState(
  flares: NasaFlareRecord[] = VERIFIED_FALLBACK_FLARES
): MissionState {
  const weather = getWeatherForSol(1);
  const activeFlare = pickFlareForSol(1, flares);
  return {
    sol: 1,
    buildingLevels: { ...INITIAL_BUILDING_LEVELS },
    calibrationSol: 0,
    resources: {
      powerKwh: 88,
      lifeSupportPct: 80,
      crewHealthPct: 88,
      panelDustPct: 16,
      waterWallCm: 16,
      cropGrowth: 2,
      sciencePoints: 0,
    },
    weather,
    activeFlare,
    pendingDilemma: null,
    usedDilemmaIds: [],
    logs: [
      {
        sol: 1,
        headline: 'Touchdown Confirmed at Jezero Base',
        detail:
          'All four crew members are inside the habitat. Click any 3D outpost module to manage resources before sunset.',
        nasaSource: `Perseverance ${weather.nasaSourceId}`,
        tone: 'nominal',
      },
    ],
    debrief: null,
  };
}

export function upgradeBuilding(
  resources: MissionResources,
  levels: BuildingLevels,
  building: BuildingId
): UpgradeResult {
  const currentLevel = levels[building];
  const cost = 18 + (currentLevel - 1) * 12;
  if (currentLevel >= MAX_BUILDING_LEVEL) {
    return { applied: false, reason: 'This outpost system is already fully upgraded.', nextResources: resources, nextLevels: levels, cost: 0 };
  }
  if (resources.powerKwh < cost) {
    return { applied: false, reason: `Need ${cost} kWh to upgrade this system.`, nextResources: resources, nextLevels: levels, cost };
  }
  return {
    applied: true,
    nextResources: { ...resources, powerKwh: resources.powerKwh - cost },
    nextLevels: { ...levels, [building]: currentLevel + 1 },
    cost,
  };
}

/**
 * Direct "On-Object" 3D module interactions with coupled "Zero Free Choices" trade-offs.
 */
export function performModuleAction(
  resources: MissionResources,
  moduleId: ModuleId,
  levels: BuildingLevels = INITIAL_BUILDING_LEVELS
): ModuleActionResult {
  if (moduleId === 'solar') {
    const waterCoolCost = 3;
    if (resources.lifeSupportPct < waterCoolCost + 5) {
      return {
        applied: false,
        reason: 'Life Support water too low to cool solar wiper motors!',
        nextResources: resources,
        deltaPower: 0,
        deltaLife: 0,
        deltaHealth: 0,
        deltaDust: 0,
        deltaShieldCm: 0,
        feedbackText: 'Low Water!',
      };
    }
    const nextDust = clamp(resources.panelDustPct - 22, 0, 85);
    const dustDiff = nextDust - resources.panelDustPct;
    const solarGain = (dustDiff < -5 ? 14 : 10) + Math.max(0, levels.solar - 1) * 2;
    const nextPower = clamp(resources.powerKwh + solarGain, 0, MAX_BATTERY_KWH);
    const nextLife = clamp(resources.lifeSupportPct - waterCoolCost, 0, 100);
    return {
      applied: true,
      nextResources: {
        ...resources,
        powerKwh: nextPower,
        lifeSupportPct: nextLife,
        panelDustPct: nextDust,
        sciencePoints: resources.sciencePoints + 1,
      },
      deltaPower: nextPower - resources.powerKwh,
      deltaLife: nextLife - resources.lifeSupportPct,
      deltaHealth: 0,
      deltaDust: dustDiff,
      deltaShieldCm: 0,
      feedbackText:
        dustDiff < 0
          ? `+${nextPower - resources.powerKwh} kWh · Dust ${dustDiff}% · -${waterCoolCost}% H₂O`
          : `+${nextPower - resources.powerKwh} kWh Tilt Boost · -${waterCoolCost}% H₂O`,
    };
  }

  if (moduleId === 'moxie') {
    const cost = 12;
    if (resources.powerKwh < cost) {
      return {
        applied: false,
        reason: 'Need at least 12 kWh battery to run MOXIE!',
        nextResources: resources,
        deltaPower: 0,
        deltaLife: 0,
        deltaHealth: 0,
        deltaDust: 0,
        deltaShieldCm: 0,
        feedbackText: 'Need 12 kWh!',
      };
    }
    const nextPower = clamp(resources.powerKwh - cost, 0, MAX_BATTERY_KWH);
    const nextLife = clamp(resources.lifeSupportPct + 14 + Math.max(0, levels.moxie - 1) * 2, 0, 100);
    return {
      applied: true,
      nextResources: {
        ...resources,
        powerKwh: nextPower,
        lifeSupportPct: nextLife,
        sciencePoints: resources.sciencePoints + 2,
      },
      deltaPower: nextPower - resources.powerKwh,
      deltaLife: nextLife - resources.lifeSupportPct,
      deltaHealth: 0,
      deltaDust: 0,
      deltaShieldCm: 0,
      feedbackText: `+${nextLife - resources.lifeSupportPct}% O₂ · -${cost} kWh`,
    };
  }

  if (moduleId === 'shelter') {
    const powerCost = 14;
    const waterCost = 5;
    if (resources.powerKwh < powerCost || resources.lifeSupportPct < waterCost + 5) {
      return {
        applied: false,
        reason: 'Need 14 kWh Power & Water reserves to pump Water-Wall!',
        nextResources: resources,
        deltaPower: 0,
        deltaLife: 0,
        deltaHealth: 0,
        deltaDust: 0,
        deltaShieldCm: 0,
        feedbackText: 'Low Power/Water!',
      };
    }
    const nextPower = clamp(resources.powerKwh - powerCost, 0, MAX_BATTERY_KWH);
    const nextLife = clamp(resources.lifeSupportPct - waterCost, 0, 100);
    const nextHealth = clamp(resources.crewHealthPct + 10, 0, 100);
    const nextWall = clamp(resources.waterWallCm + 6 + Math.max(0, levels.shelter - 1) * 2, 8, 36);
    return {
      applied: true,
      nextResources: {
        ...resources,
        powerKwh: nextPower,
        lifeSupportPct: nextLife,
        crewHealthPct: nextHealth,
        waterWallCm: nextWall,
      },
      deltaPower: nextPower - resources.powerKwh,
      deltaLife: nextLife - resources.lifeSupportPct,
      deltaHealth: nextHealth - resources.crewHealthPct,
      deltaDust: 0,
      deltaShieldCm: nextWall - resources.waterWallCm,
      feedbackText: `Shield ${nextWall}cm · -${powerCost} kWh · -${waterCost}% H₂O`,
    };
  }

  // biodome
  const cost = 10;
  if (resources.powerKwh < cost) {
    return {
      applied: false,
      reason: 'Need at least 10 kWh battery for Bio-Dome UV lights!',
      nextResources: resources,
      deltaPower: 0,
      deltaLife: 0,
      deltaHealth: 0,
      deltaDust: 0,
      deltaShieldCm: 0,
      feedbackText: 'Need 10 kWh!',
    };
  }
  const nextPower = clamp(resources.powerKwh - cost, 0, MAX_BATTERY_KWH);
  const nextLife = clamp(resources.lifeSupportPct + 8, 0, 100);
  const nextHealth = clamp(resources.crewHealthPct + 4, 0, 100);
  return {
    applied: true,
    nextResources: {
      ...resources,
      powerKwh: nextPower,
      lifeSupportPct: nextLife,
      crewHealthPct: nextHealth,
    cropGrowth: clamp(resources.cropGrowth + 1, 1, 5),
    sciencePoints: resources.sciencePoints + 5 + Math.max(0, levels.biodome - 1),

    },
    deltaPower: nextPower - resources.powerKwh,
    deltaLife: nextLife - resources.lifeSupportPct,
    deltaHealth: nextHealth - resources.crewHealthPct,
    deltaDust: 0,
    deltaShieldCm: 0,
    feedbackText: `+8% O₂/Food · +5 Sci · -${cost} kWh`,
  };
}

/**
 * Simulates the Martian night cycle when the player clicks "End Sol & Watch Night Cycle".
 */
export function calculateNightCycle(
  resources: MissionResources,
  weather: MedaSolWeather,
  activeFlare: NasaFlareRecord,
  chapter: SolCampaignChapter,
  levels: BuildingLevels = INITIAL_BUILDING_LEVELS
): NightCycleSummary {
  const tauFactor = clamp(1 - (weather.tau - 0.35) * 0.4, 0.35, 1.0);
  const dustFactor = clamp(1 - (resources.panelDustPct / 100) * 0.65, 0.38, 1.0);
  const solarRechargeKwh = Math.round(45 * tauFactor * dustFactor) + Math.max(0, levels.solar - 1) * 3;
  const baseDraw = chapter.hazardType === 'cold' || weather.tempMinC <= -81 ? 26 : 22;
  const overnightDrawKwh = Math.max(16, baseDraw - Math.max(0, levels.shelter - 1) * 2);
  const netPowerKwh = solarRechargeKwh - overnightDrawKwh;

  const netDustPct = Math.round(5 + weather.tau * 7);
  const netLifeSupportPct = -9;

  const isFlare = chapter.hazardType === 'flare' || activeFlare.radBoostMsv >= 0.7;
  const shieldStrong = resources.waterWallCm >= 22;
  const shieldBlockedFlare = isFlare && shieldStrong;

  const ambientRad = 0.67 + (isFlare ? activeFlare.radBoostMsv : 0.12);
  const shieldFactor = clamp((resources.waterWallCm - 8) / 28, 0, 1) * 0.72;
  const radDoseMsv = Number((ambientRad * (1 - shieldFactor)).toFixed(2));

  let netCrewHealthPct = -2;
  if (isFlare && !shieldStrong) {
    netCrewHealthPct = -12; // Unshielded flare breach!
  } else if (isFlare && shieldStrong) {
    netCrewHealthPct = -1; // Deflected by water-wall!
  }
  if (resources.lifeSupportPct < 30) {
    netCrewHealthPct -= 6;
  }

  return {
    solarRechargeKwh,
    overnightDrawKwh,
    netPowerKwh,
    netLifeSupportPct,
    netCrewHealthPct,
    netDustPct,
    radDoseMsv,
    shieldBlockedFlare,
  };
}

export function selectNextDilemma(
  sol: number,
  weather: MedaSolWeather,
  activeFlare: NasaFlareRecord,
  usedIds: string[]
): DilemmaEvent {
  const chapter = getSolChapter(sol);
  if (chapter.dilemmaId) {
    const matched = DILEMMA_EVENTS.find((ev) => ev.id === chapter.dilemmaId);
    if (matched) return matched;
  }
  const unused = DILEMMA_EVENTS.filter((ev) => !usedIds.includes(ev.id));
  const pool = unused.length > 0 ? unused : DILEMMA_EVENTS;
  if (weather.tau >= 1.0) {
    const dustEvent = pool.find((ev) => ev.category === 'weather');
    if (dustEvent) return dustEvent;
  }
  if (activeFlare.radBoostMsv >= 0.45) {
    const radEvent = pool.find((ev) => ev.category === 'radiation');
    if (radEvent) return radEvent;
  }
  return pool[(sol - 1) % pool.length];
}

function gradeFromNumber(score: number): string {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 58) return 'C';
  return 'D';
}

export function buildDebriefReport(
  outcome: 'VICTORY' | 'DEFEAT',
  defeatReason: string | null,
  solsCompleted: number,
  finalResources: MissionResources
): DebriefReport {
  const crewScore = clamp(
    Math.round(finalResources.crewHealthPct * 0.75 + finalResources.lifeSupportPct * 0.25),
    0,
    100
  );
  const powerPct = Math.round((finalResources.powerKwh / MAX_BATTERY_KWH) * 100);
  const efficiencyScore = clamp(
    Math.round(
      powerPct * 0.5 +
        finalResources.lifeSupportPct * 0.35 +
        (100 - finalResources.panelDustPct) * 0.15
    ),
    0,
    100
  );
  const scienceScore = clamp(Math.round((finalResources.sciencePoints / 45) * 100), 0, 100);

  const totalScore =
    outcome === 'VICTORY'
      ? Math.round(crewScore * 0.4 + efficiencyScore * 0.35 + scienceScore * 0.25)
      : Math.round((solsCompleted / MAX_SOLS) * 45);

  let overallRank = 'Cadet Operator';
  if (outcome === 'VICTORY') {
    if (totalScore >= 85) overallRank = 'Jezero Legend Commander';
    else if (totalScore >= 72) overallRank = 'Senior Mars Flight Director';
    else overallRank = 'Outpost Survival Specialist';
  } else {
    overallRank = 'Emergency Extraction Required';
  }

  return {
    outcome,
    defeatReason,
    solsCompleted,
    finalResources,
    crewSafetyGrade:
      outcome === 'DEFEAT' && finalResources.crewHealthPct <= 0 ? 'F' : gradeFromNumber(crewScore),
    resourceEfficiencyGrade:
      outcome === 'DEFEAT' && finalResources.powerKwh <= 0
        ? 'F'
        : gradeFromNumber(efficiencyScore),
    scienceGrade: gradeFromNumber(scienceScore),
    overallRank,
    totalScore,
  };
}

export function checkDefeatReason(resources: MissionResources): string | null {
  if (resources.powerKwh <= 0) {
    return 'Battery reserves hit 0 kWh. Habitat heaters and oxygen pumps shut down during the Martian night.';
  }
  if (resources.lifeSupportPct <= 0) {
    return 'Life Support O₂ & Water dropped to 0%. Emergency ascent vehicle evacuation triggered.';
  }
  if (resources.crewHealthPct <= 0) {
    return 'Crew Radiation Shield & Health reached 0%. Crew evacuated to orbital medical bay.';
  }
  return null;
}

/**
 * Applies overnight survival math after the 3D sunset / hazard cycle completes.
 */
export function resolveNightCycleStep(
  state: MissionState,
  flares: NasaFlareRecord[]
): MissionState {
  const chapter = getSolChapter(state.sol);
  const summary = calculateNightCycle(
    state.resources,
    state.weather,
    state.activeFlare,
    chapter,
    state.buildingLevels
  );

  // Water-wall naturally settles slightly overnight
  const nextWall = clamp(state.resources.waterWallCm - 2, 8, 36);

  const updatedResources: MissionResources = {
    powerKwh: clamp(state.resources.powerKwh + summary.netPowerKwh, 0, MAX_BATTERY_KWH),
    lifeSupportPct: clamp(state.resources.lifeSupportPct + summary.netLifeSupportPct, 0, 100),
    crewHealthPct: clamp(state.resources.crewHealthPct + summary.netCrewHealthPct, 0, 100),
    panelDustPct: clamp(state.resources.panelDustPct + summary.netDustPct, 0, 85),
    waterWallCm: nextWall,
    cropGrowth: state.resources.cropGrowth,
    sciencePoints: state.resources.sciencePoints + (summary.shieldBlockedFlare ? 4 : 2),
  };

  const defeatReason = checkDefeatReason(updatedResources);
  if (defeatReason) {
    const debrief = buildDebriefReport('DEFEAT', defeatReason, state.sol - 1, updatedResources);
    return {
      ...state,
      resources: updatedResources,
      pendingDilemma: null,
      debrief,
      logs: [
        {
          sol: state.sol,
          headline: 'Mission Aborted — Critical Failure',
          detail: defeatReason,
          nasaSource: `MEDA ${state.weather.nasaSourceId}`,
          tone: 'critical',
        },
        ...state.logs,
      ],
    };
  }

  if (state.sol >= MAX_SOLS) {
    const debrief = buildDebriefReport('VICTORY', null, MAX_SOLS, updatedResources);
    return {
      ...state,
      resources: updatedResources,
      pendingDilemma: null,
      debrief,
      logs: [
        {
          sol: state.sol,
          headline: 'Sol 10 Complete — Supply Rocket Landed!',
          detail:
            'Jezero Base survived the full 10-Sol mission arc and welcomed the automated supply lander.',
          nasaSource: 'NASA Mars Architecture Mission Log',
          tone: 'nominal',
        },
        ...state.logs,
      ],
    };
  }

  const dilemma = selectNextDilemma(
    state.sol,
    state.weather,
    state.activeFlare,
    state.usedDilemmaIds
  );

  return {
    ...state,
    resources: updatedResources,
    pendingDilemma: dilemma,
    logs: [
      {
        sol: state.sol,
        headline: `Sol ${state.sol} Night Cycle (${summary.netPowerKwh >= 0 ? '+' : ''}${summary.netPowerKwh} kWh)`,
        detail: summary.shieldBlockedFlare
          ? `Water-Wall deflected the solar flare! (${summary.radDoseMsv} mSv/Sol)`
          : `Solar recharge +${summary.solarRechargeKwh} kWh vs ${summary.overnightDrawKwh} kWh overnight heating.`,
        nasaSource: `${state.weather.nasaSourceId} / ${state.activeFlare.id}`,
        tone:
          updatedResources.powerKwh < 25 ||
          updatedResources.lifeSupportPct < 35 ||
          updatedResources.crewHealthPct < 35
            ? 'caution'
            : 'nominal',
      },
      ...state.logs,
    ],
  };
}

export function resolveDilemmaChoice(
  state: MissionState,
  choice: DilemmaChoice,
  flares: NasaFlareRecord[]
): MissionState {
  if (!state.pendingDilemma) return state;

  const updatedResources: MissionResources = {
    powerKwh: clamp(state.resources.powerKwh + choice.effects.powerKwh, 0, MAX_BATTERY_KWH),
    lifeSupportPct: clamp(state.resources.lifeSupportPct + choice.effects.lifeSupportPct, 0, 100),
    crewHealthPct: clamp(state.resources.crewHealthPct + choice.effects.crewHealthPct, 0, 100),
    panelDustPct: clamp(state.resources.panelDustPct + choice.effects.dustDelta, 0, 85),
    waterWallCm: state.resources.waterWallCm,
    cropGrowth: state.resources.cropGrowth,
    sciencePoints: state.resources.sciencePoints + choice.effects.sciencePoints,
  };

  const defeatReason = checkDefeatReason(updatedResources);
  if (defeatReason) {
    const debrief = buildDebriefReport('DEFEAT', defeatReason, state.sol, updatedResources);
    return {
      ...state,
      resources: updatedResources,
      pendingDilemma: null,
      debrief,
      logs: [
        {
          sol: state.sol,
          headline: `${choice.label} — System Collapse`,
          detail: defeatReason,
          nasaSource: state.pendingDilemma.nasaSourceLabel,
          tone: 'critical',
        },
        ...state.logs,
      ],
    };
  }

  const nextSol = state.sol + 1;
  const nextWeather = getWeatherForSol(nextSol);
  const nextFlare = pickFlareForSol(nextSol, flares);

  return {
    ...state,
    sol: nextSol,
    resources: updatedResources,
    weather: nextWeather,
    activeFlare: nextFlare,
    pendingDilemma: null,
    usedDilemmaIds: [...state.usedDilemmaIds, state.pendingDilemma.id],
    logs: [
      {
        sol: state.sol,
        headline: `Decision: ${choice.label}`,
        detail: `${choice.summary} (${choice.tradeoffHint})`,
        nasaSource: state.pendingDilemma.nasaSourceLabel,
        tone:
          updatedResources.powerKwh < 25 ||
          updatedResources.lifeSupportPct < 35 ||
          updatedResources.crewHealthPct < 35
            ? 'caution'
            : 'nominal',
      },
      ...state.logs,
    ],
  };
}
