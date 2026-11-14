import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateNightCycle,
  checkDefeatReason,
  createInitialMissionState,
  getSolChapter,
  MAX_SOLS,
  performModuleAction,
  resolveDilemmaChoice,
  resolveNightCycleStep,
} from './simulation';
import { VERIFIED_FALLBACK_FLARES } from '../data/nasaTelemetry';
import { computeUnlockedLogIds, NASA_ARCHIVE_ENTRIES } from '../data/campaignArc';

test('initial mission state starts at Sol 1 with healthy 3D outpost resources', () => {
  const state = createInitialMissionState(VERIFIED_FALLBACK_FLARES);
  assert.equal(state.sol, 1);
  assert.equal(state.resources.powerKwh, 88);
  assert.equal(state.resources.lifeSupportPct, 80);
  assert.equal(state.resources.crewHealthPct, 88);
  assert.equal(state.resources.waterWallCm, 16);
  assert.equal(state.pendingDilemma, null);
  assert.equal(state.debrief, null);
});

test('on-object module actions apply coupled trade-offs directly', () => {
  const state = createInitialMissionState(VERIFIED_FALLBACK_FLARES);

  // MOXIE raises O2 (+14%) but costs 12 kWh power
  const moxieRes = performModuleAction(state.resources, 'moxie');
  assert.equal(moxieRes.applied, true);
  assert.equal(moxieRes.deltaPower, -12);
  assert.equal(moxieRes.deltaLife, 14);

  // Shelter thickens Water-Wall (+6 cm) and health, while draining 14 kWh power & 5% water
  const shelterRes = performModuleAction(state.resources, 'shelter');
  assert.equal(shelterRes.applied, true);
  assert.equal(shelterRes.deltaPower, -14);
  assert.equal(shelterRes.deltaLife, -5);
  assert.equal(shelterRes.deltaShieldCm, 6);

  // Solar cleans dust (-16% from 16% -> 0%) and harvests +14 kWh for -3% cooling water
  const solarRes = performModuleAction(state.resources, 'solar');
  assert.equal(solarRes.applied, true);
  assert.ok(solarRes.deltaDust < 0);
  assert.equal(solarRes.deltaPower, 14);
  assert.equal(solarRes.deltaLife, -3);

  // Bio-Dome grows crops & boosts science (+5) while spending 10 kWh
  const bioRes = performModuleAction(state.resources, 'biodome');
  assert.equal(bioRes.applied, true);
  assert.equal(bioRes.nextResources.cropGrowth, state.resources.cropGrowth + 1);
  assert.equal(bioRes.nextResources.sciencePoints, 5);
});

test('thick Water-Wall deflects Sol 4 Solar Flare while thin wall suffers radiation damage', () => {
  const state = createInitialMissionState(VERIFIED_FALLBACK_FLARES);
  const sol4 = getSolChapter(4);
  assert.equal(sol4.hazardType, 'flare');

  const thinNight = calculateNightCycle(
    { ...state.resources, waterWallCm: 14 },
    state.weather,
    state.activeFlare,
    sol4
  );
  const thickNight = calculateNightCycle(
    { ...state.resources, waterWallCm: 26 },
    state.weather,
    state.activeFlare,
    sol4
  );

  assert.equal(thinNight.shieldBlockedFlare, false);
  assert.equal(thickNight.shieldBlockedFlare, true);
  assert.ok(thickNight.netCrewHealthPct > thinNight.netCrewHealthPct);
});

test('defeat triggers when any critical resource hits 0', () => {
  assert.ok(
    checkDefeatReason({
      powerKwh: 0,
      lifeSupportPct: 50,
      crewHealthPct: 50,
      panelDustPct: 10,
      waterWallCm: 16,
      cropGrowth: 2,
      sciencePoints: 0,
    }) !== null
  );
  assert.ok(
    checkDefeatReason({
      powerKwh: 50,
      lifeSupportPct: 0,
      crewHealthPct: 50,
      panelDustPct: 10,
      waterWallCm: 16,
      cropGrowth: 2,
      sciencePoints: 0,
    }) !== null
  );
  assert.ok(
    checkDefeatReason({
      powerKwh: 50,
      lifeSupportPct: 50,
      crewHealthPct: 0,
      panelDustPct: 10,
      waterWallCm: 16,
      cropGrowth: 2,
      sciencePoints: 0,
    }) !== null
  );
});

test('completing 10 Sols with active 3D module management achieves VICTORY debrief', () => {
  let state = createInitialMissionState(VERIFIED_FALLBACK_FLARES);
  for (let s = 1; s < MAX_SOLS; s++) {
    // Perform helpful 3D module clicks based on need
    if (state.resources.panelDustPct > 20 && state.resources.powerKwh > 20) {
      state = {
        ...state,
        resources: performModuleAction(state.resources, 'solar').nextResources,
      };
    }
    if (state.resources.lifeSupportPct < 60 && state.resources.powerKwh > 25) {
      state = {
        ...state,
        resources: performModuleAction(state.resources, 'moxie').nextResources,
      };
    }
    if ((s === 4 || s === 5 || state.resources.crewHealthPct < 65) && state.resources.waterWallCm < 24 && state.resources.powerKwh > 28) {
      state = {
        ...state,
        resources: performModuleAction(state.resources, 'shelter').nextResources,
      };
    }

    state = resolveNightCycleStep(state, VERIFIED_FALLBACK_FLARES);
    assert.ok(state.pendingDilemma, `Expected dilemma on Sol ${s}`);
    const sortedByPower = [...state.pendingDilemma.choices].sort(
      (a, b) => b.effects.powerKwh - a.effects.powerKwh
    );
    const choice =
      state.resources.powerKwh < 45 ? sortedByPower[0] : state.pendingDilemma.choices[0];
    state = resolveDilemmaChoice(state, choice, VERIFIED_FALLBACK_FLARES);
  }

  assert.equal(state.sol, 10);
  const finalState = resolveNightCycleStep(state, VERIFIED_FALLBACK_FLARES);
  assert.ok(finalState.debrief);
  assert.equal(finalState.debrief.outcome, 'VICTORY');
  assert.equal(finalState.debrief.solsCompleted, 10);
});

test('NASA Data Log archive unlocks progressively by Sol and 3D module interactions', () => {
  const sol1Empty = computeUnlockedLogIds(1, { solar: 0, moxie: 0, shelter: 0, biodome: 0 });
  assert.deepEqual(sol1Empty, ['geo-delta']);

  const sol1Moxie = computeUnlockedLogIds(1, { solar: 0, moxie: 1, shelter: 0, biodome: 0 });
  assert.ok(sol1Moxie.includes('isru-moxie'));
  assert.ok(!sol1Moxie.includes('isru-rad-shield'));

  const sol8Full = computeUnlockedLogIds(8, { solar: 2, moxie: 1, shelter: 2, biodome: 1 });
  assert.equal(sol8Full.length, NASA_ARCHIVE_ENTRIES.length);
});
