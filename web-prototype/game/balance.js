import { EXTRA_SKILLS, EXTRA_BOSSES, getBossId } from './launch-content.js';

export const ECONOMY = {
  gachaCost: 50,
  gachaCostMultiplier: 1.15,
  mergeIronCost: 5,
  mergeCrystalCost: 2,
  prestigeGate: 18,
  offlineCapMs: 4 * 60 * 60 * 1000
};

export const FIRST_RUN_DROPS = ['iron', 'crystal', 'iron', 'plasma', 'iron', 'crystal', 'iron', 'iron'];

const BOSS_NAMES = {armor:'철갑 채굴자',crystal:'수정 파수꾼',void:'공허 수호자',...Object.fromEntries(EXTRA_BOSSES.map((entry) => [entry.id,entry.name]))};

// Three voyages at each gate, then explore two waves deeper. No timer or paid bypass.
export function getPrestigeGate(state) {
  return ECONOMY.prestigeGate + 2 * Math.floor(Math.max(0, state.prestige.runs) / 3);
}

export function getGachaCost(state) {
  return Math.min(Number.MAX_SAFE_INTEGER, Math.floor(ECONOMY.gachaCost * ECONOMY.gachaCostMultiplier ** state.skills.length));
}

export const SKILL_POOL = [
  { id: 'sk_mine_1', name: 'Basic Drill', rarity: 'N', weight: 100, miningBonus: 0.5, damageBonus: 0, critBonus: 0 },
  { id: 'sk_dmg_1', name: 'Laser Pointer', rarity: 'N', weight: 100, miningBonus: 0, damageBonus: 1, critBonus: 0 },
  { id: 'sk_crit_1', name: 'Lucky Strike', rarity: 'N', weight: 80, miningBonus: 0, damageBonus: 0, critBonus: 0.02 },
  { id: 'sk_mine_2', name: 'Plasma Cutter', rarity: 'R', weight: 50, miningBonus: 1.5, damageBonus: 0, critBonus: 0 },
  { id: 'sk_dmg_2', name: 'Auto Cannon', rarity: 'R', weight: 50, miningBonus: 0, damageBonus: 2.5, critBonus: 0 },
  { id: 'sk_hybrid_1', name: 'Mining Laser', rarity: 'R', weight: 40, miningBonus: 0.8, damageBonus: 1.2, critBonus: 0 },
  { id: 'sk_crit_2', name: 'Targeting OS', rarity: 'R', weight: 40, miningBonus: 0, damageBonus: 0, critBonus: 0.05 },
  { id: 'sk_mine_3', name: 'Quantum Extractor', rarity: 'SR', weight: 15, miningBonus: 4, damageBonus: 0, critBonus: 0 },
  { id: 'sk_dmg_3', name: 'Orbital Railgun', rarity: 'SR', weight: 15, miningBonus: 0, damageBonus: 6, critBonus: 0 },
  { id: 'sk_hybrid_2', name: 'Void Engine', rarity: 'SR', weight: 10, miningBonus: 2.5, damageBonus: 3.5, critBonus: 0.03 },
  { id: 'sk_crit_3', name: 'Probability Manipulator', rarity: 'UR', weight: 3, miningBonus: 0, damageBonus: 2, critBonus: 0.12 },
  { id: 'sk_all_1', name: 'Galaxy Core', rarity: 'UR', weight: 2, miningBonus: 5, damageBonus: 8, critBonus: 0.08 },
  ...EXTRA_SKILLS
];
export const getAvailableSkills = (state) => SKILL_POOL.filter((entry) => state.prestige.runs >= (entry.unlockRuns || 0));

export const LOOT_TABLE = [
  { id: 'iron', weight: 45 },
  { id: 'crystal', weight: 27 },
  { id: 'plasma', weight: 21 },
  { id: 'relic', weight: 7 }
];

export function getWaveConfig(wave) {
  const isBoss = wave % 5 === 0;
  return {
    wave,
    hp: Math.min(Number.MAX_SAFE_INTEGER, Math.floor(150 * 1.2 ** (wave - 1) * (isBoss ? 1.35 : 1))),
    oreReward: Math.floor((20 + wave * 5) * (isBoss ? 1.5 : 1)),
    materialDrops: 1,
    isBoss,
    bossId: getBossId(wave),
    name: isBoss ? BOSS_NAMES[getBossId(wave)] : '소행성 광맥',
    bonusLoot: { plasma: isBoss ? 1 : 0, relic: wave % 10 === 0 ? 1 : 0 }
  };
}

export function rollWeighted(entries, random = Math.random) {
  const totalWeight = entries.reduce((total, entry) => total + entry.weight, 0);
  let remaining = random() * totalWeight;
  for (const entry of entries) {
    remaining -= entry.weight;
    if (remaining < 0) return entry;
  }
  return entries[entries.length - 1];
}
