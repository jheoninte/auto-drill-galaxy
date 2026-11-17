import assert from 'node:assert/strict';
import { createInitialState, hydrateState } from '../web-prototype/game/state.js';
import { ECONOMY, SKILL_POOL, getGachaCost, getPrestigeGate, getWaveConfig, rollWeighted } from '../web-prototype/game/balance.js';
import { advanceMining, advanceCombat, applyOfflineProgress, getDerivedStats, performGacha, performMerge, performPrestige } from '../web-prototype/game/systems.js';
import { VOYAGE_MODULES, PERMANENT_RESEARCH, upgradeWorkshop, selectWorkshopModule } from '../web-prototype/game/workshop.js';
import { createTutorial } from '../web-prototype/game/tutorial.js';
import { describeStatChanges } from '../web-prototype/ui/feedback.js';
import { readFile } from 'node:fs/promises';

function seededRandom(seed) {
  let value = seed;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

const rows = (await readFile(new URL('../tools/balance_sheet.csv', import.meta.url), 'utf8')).trim().split(/\r?\n/).slice(1);
assert.equal(rows.length, 20);
for (const row of rows) {
  const [wave, hp, oreReward, materialDrops] = row.split(',').map(Number);
  const config = getWaveConfig(wave);
  assert.deepEqual({ wave: config.wave, hp: config.hp, oreReward: config.oreReward, materialDrops: config.materialDrops }, { wave, hp, oreReward, materialDrops });
}
assert.equal(rollWeighted(SKILL_POOL, () => 0).id, 'sk_mine_1');
assert.equal(rollWeighted(SKILL_POOL, () => 0.999999).id, SKILL_POOL.at(-1).id);

const slow = createInitialState();
const fast = createInitialState();
for (let frame = 0; frame < 300; frame += 1) advanceCombat(slow, 1000 / 30);
for (let frame = 0; frame < 1440; frame += 1) advanceCombat(fast, 1000 / 144);
assert.ok(Math.abs(slow.combat.asteroidHp - fast.combat.asteroidHp) < 1e-8);
const restored = hydrateState({ combat: { wave: 1, maxAsteroidHp: 600, asteroidHp: 300 } });
assert.equal(restored.combat.asteroidHp, 75);

const prestigeState = createInitialState();
prestigeState.combat.wave = ECONOMY.prestigeGate;
prestigeState.profile.ore = 100;
prestigeState.loot.iron = 10;
prestigeState.ship.engine = 4;
prestigeState.skills.push({ ...SKILL_POOL[0] });
assert.equal(performPrestige(prestigeState).ok, true);
assert.equal(prestigeState.profile.darkMatter, Math.floor(ECONOMY.prestigeGate / 4));
assert.equal(prestigeState.profile.ore, 0);
assert.equal(prestigeState.loot.iron, 0);
assert.equal(prestigeState.ship.engine, 4);
assert.equal(prestigeState.skills.length, 1);
assert.equal(prestigeState.combat.asteroidHp, 150);
assert.equal(getGachaCost(prestigeState), 57);

const pricedState = createInitialState();
pricedState.profile.ore = 106;
assert.equal(performGacha(pricedState, () => 0).ok, true);
assert.equal(getGachaCost(pricedState), 57);
assert.equal(performGacha(pricedState, () => 0).ok, false);
assert.equal(pricedState.profile.ore, 56);
const cappedState = createInitialState();
cappedState.profile.darkMatter = 10;
assert.equal(getDerivedStats(cappedState).miningRate, 3.75);
cappedState.profile.darkMatter = Number.MAX_SAFE_INTEGER;
assert.ok(getDerivedStats(cappedState).miningRate <= 5);
const supplyState = createInitialState();
for (let wave = 1; wave <= 8; wave += 1) {
  supplyState.combat.asteroidHp = 0;
  advanceCombat(supplyState, 0, () => 0.99);
}
assert.equal(supplyState.loot.iron, 5);
assert.equal(supplyState.loot.crystal, 2);
assert.equal(supplyState.loot.plasma, 2);
assert.equal(supplyState.combat.wave, 9);
assert.equal(performPrestige(supplyState).ok, false);

const bossState = createInitialState();
bossState.combat.wave = 10;
bossState.combat.maxAsteroidHp = getWaveConfig(10).hp;
bossState.combat.asteroidHp = 0;
const bossEvents = advanceCombat(bossState, 0, () => 0.99);
assert.equal(bossEvents.length, 1);
assert.equal(bossEvents[0].isBoss, true);
assert.equal(bossEvents[0].wave, 10);
assert.equal(bossState.profile.ore, 105);
assert.equal(bossState.loot.plasma, 1);
assert.equal(bossState.loot.relic, 2);
assert.deepEqual(advanceCombat(bossState, 0), []);
assert.equal(bossState.profile.ore, 105);
assert.equal(hydrateState({ settings: { soundEnabled: true } }).settings.soundEnabled, true);
assert.equal(hydrateState({}).settings.soundEnabled, false);
assert.equal(describeStatChanges({ miningRate: 2.5, combatDps: 5.7, critChance: 0.08 }, { miningRate: 3, combatDps: 5.7, critChance: 0.1 }), '채굴 +0.5/초 · 치명타 +2.0%p');

const tutorialState = createInitialState();
let tutorialSaves = 0;
const tutorial = createTutorial(tutorialState, () => { tutorialSaves += 1; });
assert.equal(tutorial.tick(0).id, 'intro');
tutorialState.skills.push({ ...SKILL_POOL[0] });
tutorialState.prestige.bestWave = 2;
assert.equal(tutorial.tick(3999).id, 'intro');
assert.equal(tutorial.tick(1), null);
assert.equal(tutorial.tick(0).id, 'first-skill');
assert.equal(tutorialSaves, 2);
const resumedTutorial = createTutorial(hydrateState(JSON.parse(JSON.stringify(tutorialState))));
assert.equal(resumedTutorial.tick(0).id, 'first-wave');

// Regression checks for spending, migration, switching and prestige persistence.
const labState = createInitialState();
labState.loot.plasma = 100;
labState.loot.relic = 100;
const locked = JSON.stringify(labState);
assert.equal(upgradeWorkshop(labState, 'module', 'drill').ok, false);
assert.equal(JSON.stringify(labState), locked);
labState.ship.engine = 2;
assert.equal(upgradeWorkshop(labState, 'module', 'missing').ok, false);
assert.equal(upgradeWorkshop(labState, 'oops', 'drill').ok, false);
assert.equal(selectWorkshopModule(labState, 'lance').ok, false);
const baseStats = getDerivedStats(labState);
assert.equal(upgradeWorkshop(labState, 'module', 'drill').ok, true);
assert.equal(labState.loot.plasma, 98);
assert.equal(labState.ship.workshop.activeModule, 'drill');
assert.ok(getDerivedStats(labState).miningRate > baseStats.miningRate);
assert.ok(getDerivedStats(labState).combatDps < baseStats.combatDps);
assert.equal(upgradeWorkshop(labState, 'module', 'lance').ok, true);
assert.equal(selectWorkshopModule(labState, 'lance').ok, false);
const reloadedLab = hydrateState(JSON.parse(JSON.stringify(labState)));
assert.equal(selectWorkshopModule(reloadedLab, 'lance').ok, false);
advanceMining(reloadedLab, 10000);
assert.equal(selectWorkshopModule(reloadedLab, 'lance').ok, true);
assert.equal(reloadedLab.loot.plasma, 96);
assert.ok(getDerivedStats(reloadedLab).combatDps > baseStats.combatDps);
assert.ok(getDerivedStats(reloadedLab).miningRate < baseStats.miningRate);
assert.equal(upgradeWorkshop(reloadedLab, 'research', 'radar').ok, true);
assert.equal(upgradeWorkshop(reloadedLab, 'research', 'stabilizer').ok, true);
const researchLevels = { ...reloadedLab.ship.workshop.researchLevels };
reloadedLab.combat.wave = ECONOMY.prestigeGate;
assert.equal(performPrestige(reloadedLab).ok, true);
assert.equal(reloadedLab.loot.relic, 98);
assert.equal(reloadedLab.loot.plasma, 0);
assert.deepEqual(reloadedLab.ship.workshop.moduleLevels, { drill: 0, lance: 0, sync: 0 });
assert.deepEqual(reloadedLab.ship.workshop.researchLevels, researchLevels);
assert.equal(reloadedLab.ship.workshop.activeModule, null);
assert.deepEqual(hydrateState({ ship: { engine: 4 } }).ship.workshop, createInitialState().ship.workshop);
const invalidLab = hydrateState({ ship: { workshop: { activeModule: 'missing', moduleLevels: { drill: -1, lance: Infinity, sync: 99 }, researchLevels: { radar: NaN, stabilizer: 999 }, switchRemainingMs: Infinity } }, loot: { plasma: -1, relic: 'bad' } });
assert.deepEqual(invalidLab.ship.workshop.moduleLevels, { drill: 0, lance: 0, sync: 3 });
assert.deepEqual(invalidLab.ship.workshop.researchLevels, { radar: 0, stabilizer: 5, res_launch_03:0, res_launch_04:0 });
assert.equal(invalidLab.ship.workshop.activeModule, null);
assert.equal(invalidLab.loot.relic, 0);
for (const [entries, kind] of [[VOYAGE_MODULES, 'module'], [PERMANENT_RESEARCH, 'research']]) {
  for (const entry of entries) {
    const state = createInitialState();
    state.ship.engine = 2;
    state.loot.plasma = state.loot.relic = 100;
    for (let level = 0; level < entry.levels.length; level++) assert.equal(upgradeWorkshop(state, kind, entry.id).ok, true);
    const before = JSON.stringify(state);
    assert.equal(upgradeWorkshop(state, kind, entry.id).ok, false);
    assert.equal(JSON.stringify(state), before);
    state.loot.plasma = state.loot.relic = 0;
  }
}
const poorLab = createInitialState();
poorLab.ship.engine = 2;
assert.equal(upgradeWorkshop(poorLab, 'module', 'drill').ok, false);
assert.equal(upgradeWorkshop(poorLab, 'research', 'radar').ok, false);
const offlineLab = hydrateState(JSON.parse(JSON.stringify(labState)));
offlineLab.profile.lastSeenAt = 1000;
const offlineRate = getDerivedStats(offlineLab).miningRate;
const oreBefore = offlineLab.profile.ore;
applyOfflineProgress(offlineLab, 61000);
assert.ok(Math.abs(offlineLab.profile.ore - oreBefore - offlineRate * 60) < 1e-8);
const settledOre = offlineLab.profile.ore;
applyOfflineProgress(offlineLab, 61000);
assert.equal(offlineLab.profile.ore, settledOre);

function simulate(seed, { decisionInterval = 0, autoPrestige = false, moduleId = null } = {}) {
  const state = createInitialState();
  const random = seededRandom(seed);
  const milestones = { gacha: null, merge: null, wave8: null, wave15: null, prestigeUnlock: null, firstPrestige: null };
  const checkpoints = [];
  let nextDecisionAt = decisionInterval;
  for (let seconds = 0.25; seconds <= 1800; seconds += 0.25) {
    advanceMining(state, 250);
    advanceCombat(state, 250, random);
    if (state.combat.wave >= 8) milestones.wave8 ??= seconds;
    if (state.combat.wave >= 15) milestones.wave15 ??= seconds;
    if (state.combat.wave >= ECONOMY.prestigeGate) milestones.prestigeUnlock ??= seconds;
    if (seconds >= nextDecisionAt) {
      while (state.profile.ore >= getGachaCost(state)) {
        performGacha(state, random);
        milestones.gacha ??= seconds;
      }
      while (state.loot.iron >= ECONOMY.mergeIronCost && state.loot.crystal >= ECONOMY.mergeCrystalCost) {
        performMerge(state);
        milestones.merge ??= seconds;
      }
      if (moduleId) {
        while (upgradeWorkshop(state, 'module', moduleId).ok) { /* Spend only available plasma. */ }
        for (const research of PERMANENT_RESEARCH) {
          while (upgradeWorkshop(state, 'research', research.id).ok) { /* Fixed radar-first policy. */ }
        }
      }
      if (autoPrestige && state.combat.wave >= getPrestigeGate(state)) {
        performPrestige(state);
        milestones.firstPrestige ??= seconds;
      }
      nextDecisionAt = seconds + decisionInterval;
    }
    if ([60, 300, 600, 900, 1800].includes(seconds)) {
      checkpoints.push({ seconds, wave: state.combat.wave, skills: state.skills.length, runs: state.prestige.runs });
    }
  }
  return { milestones, checkpoints };
}

function median(values) {
  return values.sort((left, right) => left - right)[Math.floor(values.length / 2)] ?? null;
}

const results = Array.from({ length: 20 }, (_, index) => simulate(index + 1));
console.log('Verified: wave CSV, weighted selection, 30/144 FPS, save HP conversion, prestige policy, growing gacha costs, dark matter cap, guaranteed materials, tutorial queue, boss rewards, sound settings and upgrade descriptions.');
console.log('20 seeds, 1x speed, 0.25s steps, immediate gacha/merge, no prestige, maximum 1800 seconds.');
for (const key of ['gacha', 'merge', 'wave8', 'wave15', 'prestigeUnlock']) {
  const times = results.map((result) => result.milestones[key]).filter((value) => value !== null);
  console.log(`${key}: median=${median(times)}s, min=${times[0] ?? 'n/a'}s, max=${times.at(-1) ?? 'n/a'}s, reached=${times.length}/20`);
}
const sessionRows = [];
for (const decisionInterval of [0, 30]) {
  const sessions = Array.from({ length: 20 }, (_, index) => simulate(index + 1, { decisionInterval, autoPrestige: true }));
  for (const seconds of [60, 300, 600, 900, 1800]) {
    const snapshots = sessions.map((session) => session.checkpoints.find((entry) => entry.seconds === seconds));
    sessionRows.push({ policy: decisionInterval ? '30s decisions' : 'immediate', minutes: seconds / 60, wave: median(snapshots.map((entry) => entry.wave)), skills: median(snapshots.map((entry) => entry.skills)), prestiges: median(snapshots.map((entry) => entry.runs)) });
  }
}
console.log('30-minute sessions: prestige immediately at the unlock gate (each column is a separate upper median).');
console.table(sessionRows);
console.log('Workshop comparison: each build buys upgrades/research immediately after merging, no ads/prestige.');
const labRows = [];
for (const moduleId of ['drill', 'lance', 'sync']) {
  const sessions = Array.from({ length: 20 }, (_, index) => simulate(index + 1, { moduleId }));
  const merge = median(sessions.map((session) => session.milestones.merge));
  const unlock = median(sessions.map((session) => session.milestones.prestigeUnlock));
  assert.equal(merge, median(results.map((session) => session.milestones.merge)));
  assert.ok(unlock >= 600 && unlock <= 900, `${moduleId}: prestige median ${unlock}s outside 10–15 minutes`);
  labRows.push({ moduleId, merge, prestigeUnlock: unlock });
}
console.table(labRows);
console.log('Workshop verified: locked/unknown/insufficient/max-level spending, independent modules, cooldown reload, old/corrupt save hydration, relic/research persistence and offline settlement.');
