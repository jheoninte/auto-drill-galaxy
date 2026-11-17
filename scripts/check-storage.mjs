import assert from 'node:assert/strict';
import { createInitialState, hydrateState, SAVE_KEY } from '../web-prototype/game/state.js';
import { createSaveStore, serializeState, parseSave, BACKUP_KEY, RECOVERY_KEY, BEFORE_RESTORE_KEY } from '../web-prototype/game/storage.js';
import { createLifecycle } from '../web-prototype/game/lifecycle.js';
import { getDerivedStats } from '../web-prototype/game/systems.js';

let time = 1_000_000;
function fixture() {
  const data = new Map();
  let fail = null;
  const storage = { getItem: (key) => data.get(key) ?? null, setItem(key, value) {
    if (key === fail) throw new Error('quota');
    data.set(key, value);
  } };
  return { data, store: createSaveStore(() => storage, () => time), fail: (key) => { fail = key; } };
}
const state = createInitialState();
state.profile.lastSeenAt = time;
state.profile.ore = 321;
state.ship.engine = 3;
state.ship.workshop.researchLevels.radar = 2;
state.prestige.runs = 1;
state.prestige.expeditions.claimed = ['first-rebirth'];
state.combat.asteroidHp = 0;
state.settings.soundEnabled = true;
state.entitlements = { removeAds: true };
state.session.timeScale = 2;
const exported = serializeState(state, time);
const parsed = parseSave(exported);
assert.equal(parsed.profile.ore, 321);
assert.equal(parsed.combat.asteroidHp, 0);
assert.equal(parsed.ship.workshop.researchLevels.radar, 2);
assert.equal(parsed.settings.soundEnabled, true);
assert.deepEqual(parsed.prestige.expeditions.claimed, ['first-rebirth']);
assert.equal(parsed.entitlements, undefined);
assert.equal(parsed.session.timeScale, 1);
assert.ok(!exported.includes('entitlements'));
assert.throws(() => parseSave(exported.replace('321', '322')), /손상/);
for (const invalid of ['{}', 'null', '[]', '{', JSON.stringify({format:'auto-drill-galaxy',version:99})]) assert.throws(() => parseSave(invalid));

const invalid = hydrateState({ profile: {ore: Infinity, darkMatter: -5}, ship: { engine: -1, hull: 2.9 }, combat:{wave:Infinity,asteroidHp:0}, skills:[{miningBonus:Infinity,damageBonus:-10}] });
assert.equal(invalid.profile.ore, 0);
assert.equal(invalid.profile.darkMatter, 0);
assert.equal(invalid.ship.engine, 1);
assert.equal(invalid.ship.hull, 2);
assert.equal(invalid.combat.wave, 1);
assert.equal(invalid.combat.asteroidHp, 0);
assert.equal(invalid.skills[0].miningBonus, 0);
assert.ok(Number.isFinite(getDerivedStats(invalid).miningRate));

// Migrate legacy v2, consume offline only once, rotate a valid previous save.
const legacy = fixture();
legacy.data.set(SAVE_KEY, JSON.stringify(state));
time += 10_000;
const loaded = legacy.store.load();
assert.ok(loaded.profile.ore > 321);
assert.equal(legacy.store.load().profile.ore, loaded.profile.ore);
assert.equal(JSON.parse(legacy.data.get(SAVE_KEY)).version, 1);
assert.ok(legacy.data.has(BACKUP_KEY));

// Backup failure must leave the only known primary untouched.
const backupFailure = fixture();
backupFailure.data.set(SAVE_KEY, exported);
backupFailure.fail(BACKUP_KEY);
assert.equal(backupFailure.store.save(state), false);
assert.equal(backupFailure.data.get(SAVE_KEY), exported);

const recovered = fixture();
recovered.data.set(SAVE_KEY, 'broken');
recovered.data.set(BACKUP_KEY, exported);
assert.equal(recovered.store.load().ship.engine, 3);
assert.match(recovered.store.message, /복구/);
assert.equal(recovered.data.get(RECOVERY_KEY), 'broken');

for (const primary of ['broken', JSON.stringify({format:'auto-drill-galaxy',version:99})]) {
  const broken = fixture();
  broken.data.set(SAVE_KEY, primary);
  broken.data.set(BACKUP_KEY, primary === 'broken' ? 'also broken' : exported);
  broken.store.load();
  assert.equal(broken.store.blocked, true);
  assert.equal(broken.store.save(state), false);
  assert.equal(broken.data.get(SAVE_KEY), primary);
  broken.store.restore(exported, createInitialState());
  assert.equal(broken.store.blocked, false);
  assert.ok(broken.data.get(RECOVERY_KEY).includes(primary === 'broken' ? 'broken' : '99'));
}

const failed = fixture();
failed.store.save(state);
const before = failed.data.get(SAVE_KEY);
const seen = state.profile.lastSeenAt;
time += 60_000;
failed.fail(SAVE_KEY);
assert.equal(failed.store.save(state), false);
assert.equal(state.profile.lastSeenAt, seen);
assert.equal(failed.data.get(SAVE_KEY), before);
const running = createInitialState();
running.profile.ore = 999;
assert.throws(() => failed.store.restore(exported, running), /quota/);
assert.equal(running.profile.ore, 999);
assert.equal(failed.data.get(SAVE_KEY), before);
failed.fail(null);
running.monetization.rewardIds = ['already-paid'];
running.monetization.lastRewardedAt = time;
failed.store.restore(exported, running);
assert.equal(running.profile.ore, 321);
assert.equal(running.profile.lastSeenAt, time);
assert.equal(running.monetization.lastRewardedAt, time);
assert.deepEqual(running.monetization.rewardIds, ['already-paid']);
assert.equal(parseSave(failed.data.get(BEFORE_RESTORE_KEY)).profile.ore, 999);
assert.equal(failed.store.load().profile.ore, 321);

const denied = createSaveStore(() => { throw new Error('denied'); });
assert.doesNotThrow(() => denied.load());
assert.equal(denied.save(state), false);

// Duplicate lifecycle events, hidden SDK saves and a changed module cannot change the snapshot reward.
const away = createInitialState();
away.ship.workshop.moduleLevels.drill = 1;
away.ship.workshop.activeModule = 'drill';
const rate = getDerivedStats(away).miningRate;
let saves = 0;
const lifecycle = createLifecycle(away, () => { saves++; away.profile.lastSeenAt = time; }, () => time);
lifecycle.suspend();
time += 60_000;
lifecycle.suspend();
away.profile.lastSeenAt = time;
away.ship.workshop.activeModule = null;
time += 60_000;
lifecycle.resume();
assert.ok(Math.abs(away.profile.ore - rate * 120) < 0.0001);
assert.equal(away.prestige.expeditions.contractProgress['mining-quota'], 0);
assert.equal(lifecycle.resume(), false);
assert.equal(saves, 2);
const ore = away.profile.ore;
lifecycle.suspend({busy:true});
time += 60_000;
lifecycle.resume();
assert.equal(away.profile.ore, ore);
lifecycle.suspend();
time += 8 * 3600_000;
lifecycle.resume();
assert.equal(away.profile.ore - ore, getDerivedStats(away).miningRate * 4 * 3600);
lifecycle.suspend();
time -= 10_000;
lifecycle.resume();
assert.ok(away.profile.ore >= ore);
console.log('Save migration, recovery, failed writes, restore and lifecycle checks passed.');
