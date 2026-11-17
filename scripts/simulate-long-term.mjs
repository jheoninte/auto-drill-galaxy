import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createInitialState } from '../web-prototype/game/state.js';
import { ECONOMY, getGachaCost, getPrestigeGate } from '../web-prototype/game/balance.js';
import { advanceMining, advanceCombat, applyOfflineProgress, getDerivedStats, performGacha, performMerge, performPrestige } from '../web-prototype/game/systems.js';
import { PERMANENT_RESEARCH, upgradeWorkshop, selectWorkshopModule } from '../web-prototype/game/workshop.js';
import { MILESTONES, CONTRACTS, claimExpeditionReward } from '../web-prototype/game/expeditions.js';
import { ROUTES, isRouteUnlocked, claimRoute, equipRoute } from '../web-prototype/game/routes.js';

function seededRandom(seed) {
  let value = seed;
  return () => ((value = (Math.imul(value, 1664525) + 1013904223) >>> 0) / 4294967296);
}
const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const policies = [
  { id: 'drill-gate18', moduleId: 'drill', gate: 18 },
  { id: 'lance-gate18', moduleId: 'lance', gate: 18 },
  { id: 'sync-gate18', moduleId: 'sync', gate: 18 },
  { id: 'sync-gate30', moduleId: 'sync', gate: 30 }
];

function decisions(state, random, policy) {
  if (process.argv.includes('--routes')) {
    for (const entry of ROUTES) if (claimRoute(state, entry.id).ok) equipRoute(state, entry.id);
  }
  if (policy.missions) {
    for (const entry of MILESTONES) claimExpeditionReward(state, 'milestone', entry.id);
    for (const entry of CONTRACTS) claimExpeditionReward(state, 'contract', entry.id);
  }
  while (state.profile.ore >= getGachaCost(state)) performGacha(state, random);
  while (state.loot.iron >= ECONOMY.mergeIronCost && state.loot.crystal >= ECONOMY.mergeCrystalCost) performMerge(state);
  const counters = state.prestige.routes.counters;
  const moduleId = policy.routeRotation
    ? counters.drillOre < 25000 ? 'drill' : counters.lanceKills < 100 ? 'lance' : 'sync'
    : policy.moduleId;
  while (upgradeWorkshop(state, 'module', moduleId).ok) { /* No material generation. */ }
  if (policy.routeRotation) selectWorkshopModule(state, moduleId);
  for (const entry of PERMANENT_RESEARCH) {
    while (upgradeWorkshop(state, 'research', entry.id).ok) { /* Radar first. */ }
  }
  if (state.combat.wave >= Math.max(policy.gate, getPrestigeGate(state))) return performPrestige(state).ok;
  return false;
}

function simulate(seed, policy, { seconds = 86400, stepMs = 1000, intermittent = false } = {}) {
  const state = createInitialState();
  const random = seededRandom(seed);
  const checkpoints = [];
  const prestigeIntervals = [];
  let lastPrestigeAt = 0;
  let researchCompletedAt = null;
  let routeUnlockedAt = null;
  const routeCompletedAt = {};
  let ms = 0;
  const sampleAt = [3600000, 21600000, 86400000];
  while (ms < seconds * 1000) {
    // Six five-minute visits: launch, then at 4h intervals. Offline grants mining only, capped at 4h.
    const active = !intermittent || ms % 14400000 < 300000;
    if (active) {
      advanceMining(state, stepMs);
      advanceCombat(state, stepMs, random);
      ms += stepMs;
      if (decisions(state, random, policy)) {
        prestigeIntervals.push((ms - lastPrestigeAt) / 1000);
        lastPrestigeAt = ms;
      }
    } else {
      state.profile.lastSeenAt = ms;
      // Batch offline settlement once per gap, never advance combat or cooldown offline.
      const nextVisit = ms + 14400000 - ms % 14400000;
      const nextSample = sampleAt.find((at) => at > ms) ?? seconds * 1000;
      ms = Math.min(nextVisit, nextSample, seconds * 1000);
      applyOfflineProgress(state, ms);
      // No purchases or claims while absent; the next foreground step makes decisions.
    }
    const levels = state.ship.workshop.researchLevels;
    if (isRouteUnlocked(state)) routeUnlockedAt ??= ms / 1000;
    for (const id of state.prestige.routes.claimed) routeCompletedAt[id] ??= ms / 1000;
    if (PERMANENT_RESEARCH.every((entry) => levels[entry.id] === entry.levels.length)) researchCompletedAt ??= ms / 1000;
    assert.ok(Number.isFinite(state.profile.ore) && state.profile.ore >= 0);
    assert.ok(Number.isFinite(state.combat.asteroidHp) && state.combat.asteroidHp > 0);
    if (sampleAt.includes(ms) || ms === seconds * 1000) {
      const stats = getDerivedStats(state);
      checkpoints.push({ seconds: ms / 1000, wave: state.combat.wave, bestWave: state.prestige.bestWave,
        runs: state.prestige.runs, hull: state.ship.hull, engine: state.ship.engine, skills: state.skills.length,
        gachaCost: getGachaCost(state), miningRate: stats.miningRate, damage: stats.combatDps,
        relic: state.loot.relic, research: { ...levels },
        missionsClaimed: state.prestige.expeditions.claimed.length,
        routesClaimed: state.prestige.routes.claimed.length,
        routeCounters: {...state.prestige.routes.counters},
        lastPrestigeSeconds: prestigeIntervals.at(-1) ?? null });
    }
  }
  return { seed, checkpoints, researchCompletedAt, routeUnlockedAt, routeCompletedAt, minPrestigeInterval: Math.min(...prestigeIntervals),
    final: checkpoints.at(-1), prestigeCount: prestigeIntervals.length };
}

const quick = process.argv.includes('--quick');
const seedCount = quick ? 3 : 20;
const results = [];
policies.push({ id: 'sync-gate18-missions', moduleId: 'sync', gate: 18, missions: true });
if (process.argv.includes('--routes')) policies.push({id:'routes-rotation', moduleId:'drill', gate:18, missions:true, routeRotation:true});
for (const policy of policies) {
  const sessions = Array.from({ length: seedCount }, (_, i) => simulate(i + 1, policy));
  for (const session of sessions) {
    assert.ok(session.minPrestigeInterval >= 60, `${policy.id}: runaway prestige loop`);
    assert.ok(session.prestigeCount < 200, `${policy.id}: too many voyages in one day`);
  }
  results.push({ policy: policy.id, sessions });
  console.log(policy.id, JSON.stringify(summarize(sessions)));
}
const intermittent = Array.from({ length: seedCount }, (_, i) => simulate(i + 1, policies.find((policy) => policy.id === 'sync-gate18-missions'), { intermittent: true }));
assert.ok(intermittent.every((session) => session.checkpoints.length === 3));
results.push({ policy: 'sync-6x5min-visits', sessions: intermittent });
console.log('sync-6x5min-visits', JSON.stringify(summarize(intermittent)));

function summarize(sessions) {
  return {
    checkpoints: [3600, 21600, 86400].map((seconds) => {
      const snapshots = sessions.flatMap((session) => session.checkpoints.filter((point) => point.seconds === seconds));
      if (!snapshots.length) return { seconds, sampled: 0 };
      return { seconds, runs: median(snapshots.map((p) => p.runs)), bestWave: median(snapshots.map((p) => p.bestWave)),
        engine: median(snapshots.map((p) => p.engine)), hull: median(snapshots.map((p) => p.hull)),
        skills: median(snapshots.map((p) => p.skills)), lastPrestigeSeconds: median(snapshots.map((p) => p.lastPrestigeSeconds)),
        missionsClaimed: median(snapshots.map((p) => p.missionsClaimed)),
        routesClaimed: median(snapshots.map((p) => p.routesClaimed)),
        researchRadar: median(snapshots.map((p) => p.research.radar)), researchStabilizer: median(snapshots.map((p) => p.research.stabilizer)) };
    }),
    researchCompleteCount: sessions.filter((s) => s.researchCompletedAt !== null).length,
    routeUnlockMedianSeconds: median(sessions.map((s) => s.routeUnlockedAt).filter((v) => v !== null)) ?? null,
    routeCompletions: Object.fromEntries(ROUTES.map((entry) => {
      const times = sessions.map((s) => s.routeCompletedAt[entry.id]).filter((v) => v !== undefined);
      return [entry.id, {count: times.length, medianSeconds: median(times) ?? null}];
    })),
    researchCompletedMedianSeconds: median(sessions.map((s) => s.researchCompletedAt).filter((v) => v !== null)) ?? null,
    minPrestigeSeconds: Math.min(...sessions.map((s) => s.minPrestigeInterval))
  };
}
await mkdir(new URL('../tools/reports/', import.meta.url), { recursive: true });
await writeFile(new URL(process.argv.includes('--bosses') ? '../tools/reports/long-term-bosses.json' : process.argv.includes('--routes') ? '../tools/reports/long-term-routes.json' : '../tools/reports/long-term-balance.json', import.meta.url), JSON.stringify({
  seeds: seedCount, stepMs: 1000, seconds: 86400, ads: false,
  routes: process.argv.includes('--routes'),
  bossPhases: 'After first prestige, HP half boundary; phase base + matching module 0.25 + distinct skill pair 0.10. No automatic tactical switching in these policies.',
  rules: { prestigeGate: '18 + 2 * floor(runs / 3)', hullReward: 'first-ever reached multiple of four',
    decisions: 'Every foreground second: claim if enabled, gacha, merge, module, radar then stabilizer, prestige at max(policy gate, current gate).',
    intermittent: 'Six five-minute visits at 0/4/8/12/16/20h; mining-only offline settlement; no actions while absent.' },
  summaries: results.map((result) => ({policy: result.policy, ...summarize(result.sessions)})), results
}, null, 2) + '\n');
