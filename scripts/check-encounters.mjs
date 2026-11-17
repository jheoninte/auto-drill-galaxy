import assert from 'node:assert/strict';
import { createInitialState, hydrateState } from '../web-prototype/game/state.js';
import { BOSS_PATTERNS, SKILL_LINKS, getEncounter, getSkillLinks } from '../web-prototype/game/encounters.js';
import { SKILL_POOL, getWaveConfig } from '../web-prototype/game/balance.js';
import { advanceCombat, applyOfflineProgress, getDerivedStats, performPrestige } from '../web-prototype/game/systems.js';
import { selectWorkshopModule } from '../web-prototype/game/workshop.js';
import { parseSave, serializeState } from '../web-prototype/game/storage.js';

function atWave(wave, runs = 1) {
  const state = createInitialState();
  state.prestige.runs = runs;
  state.combat.wave = wave;
  state.combat.maxAsteroidHp = getWaveConfig(wave).hp;
  state.combat.asteroidHp = state.combat.maxAsteroidHp;
  return state;
}
const baseDps = (s) => { const d = getDerivedStats(s); return d.combatDps * (1 + d.critChance * (d.critMultiplier - 1)); };
for (const wave of [5, 10, 15, 20, 25, 30, 35, 40]) {
  assert.equal(getEncounter(atWave(wave, 0)), null);
  const state = atWave(wave);
  const first = getEncounter(state);
  assert.equal(first.pattern, getWaveConfig(wave).bossId);
  const half = state.combat.maxAsteroidHp / 2;
  const firstSeconds = half / (baseDps(state) * first.damageMultiplier);
  advanceCombat(state, firstSeconds * 1000);
  assert.ok(Math.abs(state.combat.asteroidHp - half) < 1e-8);
  // Explicit exact-half boundary also covers floating point subtraction on entry.
  state.combat.asteroidHp = half;
  const second = getEncounter(state);
  assert.equal(second.phaseIndex, 1);
  assert.notEqual(first.module, second.module);
  const totalSeconds = firstSeconds + half / (baseDps(state) * second.damageMultiplier);
  const oneTick = atWave(wave);
  const manyTicks = atWave(wave);
  advanceCombat(oneTick, (totalSeconds + 0.001) * 1000, () => 0);
  for (let t = 0; t < 1000; t++) advanceCombat(manyTicks, (totalSeconds + 0.001), () => 0);
  assert.equal(oneTick.combat.wave, wave + 1);
  assert.equal(manyTicks.combat.wave, wave + 1);
  assert.ok(Math.abs(oneTick.combat.asteroidHp - manyTicks.combat.asteroidHp) < 1e-6);
  assert.deepEqual(oneTick.loot, manyTicks.loot);
  assert.equal(oneTick.profile.ore, manyTicks.profile.ore);
}
assert.equal(getEncounter(atWave(6)), null);
for (const link of SKILL_LINKS) {
  const state = atWave(5);
  state.skills = Array.from({length: 50}, () => ({...SKILL_POOL.find((skill) => skill.id === link.skills[0])}));
  assert.equal(getSkillLinks(state).find((entry) => entry.id === link.id).active, false);
  state.skills.push({...SKILL_POOL.find((skill) => skill.id === link.skills[1])});
  assert.equal(getSkillLinks(state).find((entry) => entry.id === link.id).active, true);
}
const state = atWave(5);
state.skills = SKILL_POOL.map((skill) => ({...skill}));
assert.equal(getEncounter(state).linkBonus, 0.1);
state.ship.workshop.activeModule = 'drill';
assert.equal(getEncounter(state).moduleBonus, 0); // Invalid/unpurchased module never grants a bonus.
state.ship.workshop.moduleLevels.drill = 1;
assert.equal(getEncounter(state).moduleBonus, 0.25);
assert.ok(Math.abs(getEncounter(state).damageMultiplier - 1.2) < 1e-9);
state.ship.workshop.moduleLevels.lance = 1;
assert.equal(selectWorkshopModule(state, 'lance').ok, true);
assert.equal(selectWorkshopModule(state, 'drill').ok, false); // Existing 10 second switch guard.
assert.equal(getEncounter(state).moduleBonus, 0);
state.combat.asteroidHp = state.combat.maxAsteroidHp * 0.4;
const encounter = getEncounter(state);
assert.equal(encounter.moduleBonus, 0.25);
const restored = hydrateState(parseSave(serializeState(state)));
assert.deepEqual(getEncounter(restored), encounter);
const hp = state.combat.asteroidHp;
state.profile.lastSeenAt = 1000;
applyOfflineProgress(state, 14_401_000);
assert.equal(state.combat.asteroidHp, hp);
for (const dt of [-1, NaN, Infinity]) assert.deepEqual(advanceCombat(state, dt), []);
assert.equal(state.combat.asteroidHp, hp);
state.combat.asteroidHp = 0;
assert.equal(advanceCombat(state, 0, () => 0).length, 1);
assert.equal(advanceCombat(state, 0).length, 0);
state.combat.wave = 18;
assert.equal(performPrestige(state).ok, true);
assert.equal(getEncounter(state), null);
assert.equal(state.ship.workshop.activeModule, null);
console.log('Encounter checks passed: HP boundaries, timestep equivalence, module guards, distinct skill links, migration, offline and clear-once rewards.');
