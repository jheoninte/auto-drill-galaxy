import { getWaveConfig } from './balance.js';
import { TUTORIAL_IDS } from './tutorial.js';
import { createWorkshopState, hydrateWorkshop } from './workshop.js';
import { createExpeditionState, hydrateExpeditions } from './expeditions.js';
import { createRouteState, hydrateRoutes } from './routes.js';
import { createSettings, hydrateSettings } from './settings.js';
import { createCampaignState, hydrateCampaign } from './campaign.js';

export const SAVE_KEY = 'auto-drill-galaxy-save-v2';

export function createInitialState() {
  const now = Date.now();
  return {
    profile: {
      ore: 0,
      darkMatter: 0,
      totalOreMined: 0,
      lastSeenAt: now
    },
    ship: {
      hull: 1,
      engine: 1,
      reactor: 1,
      workshop: createWorkshopState()
    },
    skills: [],
    tutorial: {
      seen: []
    },
    settings: createSettings(),
    loot: {
      iron: 0,
      crystal: 0,
      plasma: 0,
      relic: 0
    },
    prestige: {
      runs: 0,
      bestWave: 1,
      expeditions: createExpeditionState(),
      routes: createRouteState(),
      campaign: createCampaignState()
    },
    monetization: {
      lastRewardedAt: 0,
      rewardIds: []
    },
    combat: {
      wave: 1,
      asteroidHp: getWaveConfig(1).hp,
      maxAsteroidHp: getWaveConfig(1).hp,
      orbitAngle: 0
    },
    session: {
      timeScale: 1,
      lastRewardSummary: '',
      lastRewardEvent: null
    }
  };
}

export function hydrateState(rawState) {
  const state = createInitialState();
  if (!rawState || typeof rawState !== 'object') return state;

  const number = (value, fallback = 0, min = 0, max = Number.MAX_SAFE_INTEGER) =>
    Number.isFinite(Number(value)) && value !== null ? Math.min(max, Math.max(min, Number(value))) : fallback;
  const integer = (value, fallback = 0, min = 0, max = Number.MAX_SAFE_INTEGER) => Math.floor(number(value, fallback, min, max));
  for (const key of ['ore', 'darkMatter', 'totalOreMined']) state.profile[key] = number(rawState.profile?.[key]);
  state.profile.lastSeenAt = number(rawState.profile?.lastSeenAt, Date.now());
  for (const key of ['hull', 'engine', 'reactor']) state.ship[key] = integer(rawState.ship?.[key], 1, 1);
  state.ship.workshop = hydrateWorkshop(rawState.ship?.workshop);
  for (const key of ['iron', 'crystal', 'plasma', 'relic']) {
    const value = rawState.loot?.[key];
    state.loot[key] = Number.isFinite(value) ? Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, Math.floor(value))) : 0;
  }
  state.prestige.runs = integer(rawState.prestige?.runs);
  state.prestige.bestWave = integer(rawState.prestige?.bestWave, 1, 1, 1000);
  state.prestige.expeditions = hydrateExpeditions(rawState.prestige?.expeditions);
  state.prestige.routes = hydrateRoutes(rawState.prestige?.routes);
  state.prestige.campaign = hydrateCampaign(rawState.prestige?.campaign, state.prestige.routes.counters);
  state.monetization.lastRewardedAt = number(rawState.monetization?.lastRewardedAt);
  state.monetization.rewardIds = Array.isArray(rawState.monetization?.rewardIds)
    ? rawState.monetization.rewardIds.filter((entry) => typeof entry === 'string').slice(-100)
    : [];
  state.combat.wave = integer(rawState.combat?.wave, 1, 1, 1000);
  state.prestige.bestWave = Math.max(state.prestige.bestWave, state.combat.wave);
  state.combat.maxAsteroidHp = number(rawState.combat?.maxAsteroidHp, getWaveConfig(state.combat.wave).hp, 1, Number.MAX_VALUE);
  state.combat.asteroidHp = number(rawState.combat?.asteroidHp, state.combat.maxAsteroidHp, 0, state.combat.maxAsteroidHp);
  state.combat.orbitAngle = number(rawState.combat?.orbitAngle, 0, 0, Math.PI * 2);
  state.settings = hydrateSettings(rawState.settings);
  state.tutorial.seen = Array.isArray(rawState.tutorial?.seen)
    ? [...new Set(rawState.tutorial.seen.filter((entry) => TUTORIAL_IDS.includes(entry)))]
    : [];
  state.skills = Array.isArray(rawState.skills)
    ? rawState.skills
        .filter((entry) => entry && typeof entry === 'object')
        .map((entry) => ({
          id: typeof entry.id === 'string' ? entry.id : `skill-${Math.random().toString(36).slice(2, 8)}`,
          name: typeof entry.name === 'string' ? entry.name : 'Unknown Skill',
          rarity: typeof entry.rarity === 'string' ? entry.rarity : 'N',
          miningBonus: number(entry.miningBonus),
          damageBonus: number(entry.damageBonus),
          critBonus: number(entry.critBonus, 0, 0, 1)
        }))
    : [];

  const hpRatio = state.combat.asteroidHp / state.combat.maxAsteroidHp;
  state.combat.maxAsteroidHp = getWaveConfig(state.combat.wave).hp;
  state.combat.asteroidHp = state.combat.maxAsteroidHp * hpRatio;

  return state;
}
