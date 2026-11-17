import { ECONOMY, FIRST_RUN_DROPS, LOOT_TABLE, getAvailableSkills, getGachaCost, getPrestigeGate, getWaveConfig, rollWeighted } from './balance.js';
import { recordCampaignMining, recordCampaignClear } from './campaign.js';
import { getWorkshopEffects, resetVoyageModules } from './workshop.js';
import { recordExpeditionMining, recordExpeditionClear, resetVoyageContracts } from './expeditions.js';
import { recordRouteMining, recordRouteClear } from './routes.js';
import { getEncounter } from './encounters.js';

const MERGE_IRON_COST = ECONOMY.mergeIronCost;
const MERGE_CRYSTAL_COST = ECONOMY.mergeCrystalCost;
const OFFLINE_CAP_MS = ECONOMY.offlineCapMs;

export function getDerivedStats(state) {
  const skillTotals = state.skills.reduce(
    (totals, skill) => {
      totals.miningBonus += Number(skill.miningBonus) || 0;
      totals.damageBonus += Number(skill.damageBonus) || 0;
      totals.critBonus += Number(skill.critBonus) || 0;
      return totals;
    },
    { miningBonus: 0, damageBonus: 0, critBonus: 0 }
  );

  const darkMatter = Math.max(0, state.profile.darkMatter);
  const prestigeEffect = darkMatter / (darkMatter + 10);
  const workshop = getWorkshopEffects(state);
  const miningRate = (
    1.8 +
    state.ship.engine * 0.45 +
    state.ship.reactor * 0.25 +
    skillTotals.miningBonus
  ) * (1 + prestigeEffect) + (1.8 + state.ship.engine * 0.45 + state.ship.reactor * 0.25) * workshop.miningMult + workshop.miningBonus;

  const combatDps = (
    4.5 +
    state.ship.hull * 0.4 +
    state.ship.reactor * 0.8 +
    skillTotals.damageBonus
  ) * (1 + prestigeEffect) + (4.5 + state.ship.hull * 0.4 + state.ship.reactor * 0.8) * workshop.damageMult + workshop.damageBonus;

  const critChance = Math.min(0.65, 0.08 + prestigeEffect * 0.01 + skillTotals.critBonus);

  return {
    miningRate,
    combatDps,
    critChance,
    critMultiplier: 2.2 + workshop.critMultiplierBonus
  };
}

export function advanceMining(state, dtMs) {
  state.ship.workshop.switchRemainingMs = Math.max(0, state.ship.workshop.switchRemainingMs - Math.max(0, dtMs));
  const { miningRate } = getDerivedStats(state);
  const oreGain = miningRate * (dtMs / 1000) * state.session.timeScale;
  state.profile.ore += oreGain;
  state.profile.totalOreMined += oreGain;
  recordExpeditionMining(state, oreGain);
  recordRouteMining(state, oreGain);
  recordCampaignMining(state, oreGain);
}

export function advanceCombat(state, dtMs, random = Math.random) {
  const clearedWaves = [];
  if (!Number.isFinite(dtMs) || dtMs < 0) return clearedWaves;
  let remaining = dtMs / 1000 * state.session.timeScale;
  if (!Number.isFinite(remaining) || remaining < 0) return clearedWaves;
  state.combat.orbitAngle = (state.combat.orbitAngle + remaining * 1.6 * (1 + state.ship.engine * 0.08)) % (Math.PI * 2);
  // Spend time, not overflow damage: phases and newly reached waves have their own multipliers.
  while (remaining > 0 || state.combat.asteroidHp <= 0) {
    if (state.combat.asteroidHp <= 0) {
      clearedWaves.push(resolveWaveClear(state, random));
      continue;
    }
    const { combatDps, critChance, critMultiplier } = getDerivedStats(state);
    const encounter = getEncounter(state);
    const dps = combatDps * (1 + critChance * (critMultiplier - 1)) * (encounter?.damageMultiplier ?? 1);
    if (!Number.isFinite(dps) || dps <= 0) break;
    const boundary = encounter?.boundaryHp ?? 0;
    const secondsToBoundary = (state.combat.asteroidHp - boundary) / dps;
    if (remaining < secondsToBoundary) {
      state.combat.asteroidHp -= dps * remaining;
      break;
    }
    remaining = Math.max(0, remaining - secondsToBoundary);
    state.combat.asteroidHp = boundary;
  }
  return clearedWaves;
}

export function performGacha(state, random = Math.random) {
  const cost = getGachaCost(state);
  if (state.profile.ore < cost) {
    return { ok: false, message: `스킬 뽑기에 광석 ${cost}개가 필요합니다.`, messageKey: 'action.gachaNeed', messageParams: { cost } };
  }

  state.profile.ore -= cost;
  const roll = rollWeighted(getAvailableSkills(state), random);
  state.skills.push({ ...roll });
  return { ok: true, message: `${roll.name} 획득!`, messageKey: 'action.gacha', skill: { ...roll }, cost };
}

export function performMerge(state) {
  if (state.loot.iron < MERGE_IRON_COST || state.loot.crystal < MERGE_CRYSTAL_COST) {
    return {
      ok: false,
      message: `합성에 철 ${MERGE_IRON_COST}개와 수정 ${MERGE_CRYSTAL_COST}개가 필요합니다.`,
      messageKey: 'action.mergeNeed', messageParams: { iron: MERGE_IRON_COST, crystal: MERGE_CRYSTAL_COST }
    };
  }

  state.loot.iron -= MERGE_IRON_COST;
  state.loot.crystal -= MERGE_CRYSTAL_COST;
  state.ship.engine += 1;
  state.ship.reactor += 1;

  return { ok: true, message: '파츠 합성 완료! 엔진과 리액터가 강화되었습니다.', messageKey: 'action.merge' };
}

export function performPrestige(state) {
  const gate = getPrestigeGate(state);
  if (state.combat.wave < gate) {
    return { ok: false, message: `웨이브 ${gate}에서 프레스티지가 열립니다.`, messageKey: 'action.prestigeNeed', messageParams: { wave: gate } };
  }

  const reward = Math.max(1, Math.floor(state.combat.wave / 4));
  state.profile.darkMatter += reward;
  state.profile.ore = 0;
  state.loot = { iron: 0, crystal: 0, plasma: 0, relic: state.loot.relic };
  resetVoyageModules(state);
  resetVoyageContracts(state);
  state.combat.wave = 1;
  state.combat.maxAsteroidHp = getWaveConfig(1).hp;
  state.combat.asteroidHp = state.combat.maxAsteroidHp;
  state.prestige.runs += 1;

  return { ok: true, message: `프레스티지 완료! 암흑물질 +${reward}`, messageKey: 'action.prestige', messageParams: { value: reward } };
}

export function applyOfflineProgress(state, now) {
  const elapsedMs = Math.max(0, now - state.profile.lastSeenAt);
  const cappedMs = Math.min(elapsedMs, OFFLINE_CAP_MS);

  if (cappedMs < 1000) {
    state.profile.lastSeenAt = now;
    return;
  }

  const { miningRate } = getDerivedStats(state);
  const oreGain = miningRate * (cappedMs / 1000);
  state.profile.ore += oreGain;
  state.profile.totalOreMined += oreGain;
  state.profile.lastSeenAt = now;
  state.session.lastRewardSummary = `${formatDuration(cappedMs)} 동안 모은 광석 +${Math.floor(oreGain)}`;
  state.session.lastRewardEvent = {message:state.session.lastRewardSummary,messageKey:'event.offline',durationMs:cappedMs,messageParams:{ore:Math.floor(oreGain)}};
}

export function formatLootSummary(loot) {
  return `철 ${loot.iron} · 수정 ${loot.crystal} · 플라스마 ${loot.plasma} · 유물 ${loot.relic}`;
}

function resolveWaveClear(state, random) {
  const clearedWave = getWaveConfig(state.combat.wave);
  recordExpeditionClear(state, clearedWave);
  recordRouteClear(state, clearedWave);
  recordCampaignClear(state, clearedWave);
  const nextWave = state.combat.wave + 1;
  const bonusOre = Math.floor(clearedWave.oreReward * (1 + getWorkshopEffects(state).oreRewardBonusMult));

  state.combat.wave = nextWave;
  state.combat.maxAsteroidHp = getWaveConfig(nextWave).hp;
  state.combat.asteroidHp = state.combat.maxAsteroidHp;
  state.profile.ore += bonusOre;
  state.profile.totalOreMined += bonusOre;
  for (let drop = 0; drop < clearedWave.materialDrops; drop += 1) {
    const guaranteedDrop = state.prestige.runs === 0 ? FIRST_RUN_DROPS[clearedWave.wave - 1] : null;
    state.loot[guaranteedDrop || rollWeighted(LOOT_TABLE, random).id] += 1;
  }
  state.loot.plasma += clearedWave.bonusLoot.plasma;
  state.loot.relic += clearedWave.bonusLoot.relic;

  if (nextWave % 4 === 0 && nextWave > state.prestige.bestWave) {
    state.ship.hull += 1;
  }

  state.prestige.bestWave = Math.max(state.prestige.bestWave, nextWave);
  state.session.lastRewardSummary = clearedWave.isBoss
    ? `${clearedWave.name} 격파! 광석 +${bonusOre} · 플라스마 +1${clearedWave.bonusLoot.relic ? ' · 유물 +1' : ''}`
    : `웨이브 ${nextWave - 1} 돌파! 광석 +${bonusOre}`;
  state.session.lastRewardEvent = {message:state.session.lastRewardSummary,
    messageKey:clearedWave.isBoss ? (clearedWave.bonusLoot.relic ? 'event.bossRelic' : 'event.boss') : 'event.wave',
    messageParams:{wave:clearedWave.wave,ore:bonusOre}, messageParamKeys:clearedWave.isBoss ? {name:`enemy.${clearedWave.bossId}`} : {}};
  return { wave: clearedWave.wave, bossId:clearedWave.bossId, isBoss: clearedWave.isBoss, name: clearedWave.name, oreReward: bonusOre, bonusLoot: { ...clearedWave.bonusLoot } };
}

function formatDuration(durationMs) {
  const totalMinutes = Math.floor(durationMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours && minutes) return `${hours}시간 ${minutes}분`;
  if (hours) return `${hours}시간`;
  return totalMinutes ? `${minutes}분` : `${Math.floor(durationMs / 1000)}초`;
}
