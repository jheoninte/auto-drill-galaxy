import { EXTRA_RESEARCH } from './launch-content.js';
// Costs are paid for the next level; effects describe the entire attained level.
export const VOYAGE_MODULES = [
  { id: 'drill', name: '채굴 과부하 코어', costs: [2, 5, 10], levels: [
    { miningMult: 0.25, damageMult: -0.10 },
    { miningMult: 0.50, damageMult: -0.15 },
    { miningMult: 0.85, damageMult: -0.20 }
  ] },
  { id: 'lance', name: '궤도 플라스마 창', costs: [2, 5, 10], levels: [
    { miningMult: -0.10, damageMult: 0.30 },
    { miningMult: -0.15, damageMult: 0.60 },
    { miningMult: -0.20, damageMult: 1.00 }
  ] },
  { id: 'sync', name: '양자 동기화 엔진', costs: [3, 7, 14], levels: [
    { miningMult: 0.15, damageMult: 0.15 },
    { miningMult: 0.30, damageMult: 0.30 },
    { miningMult: 0.50, damageMult: 0.50 }
  ] }
];

export const PERMANENT_RESEARCH = [
  { id: 'radar', name: '고대 유물 탐지기', costs: [1, 2, 4, 7, 12], levels: [
    { miningBonus: 0.25 }, { miningBonus: 0.5 }, { miningBonus: 0.75 }, { miningBonus: 1 }, { miningBonus: 1.5 }
  ] },
  { id: 'stabilizer', name: '반응로 출력 안정화', costs: [1, 2, 4, 7, 12], levels: [
    { damageBonus: 0.5 }, { damageBonus: 1 }, { damageBonus: 1.5 }, { damageBonus: 2 }, { damageBonus: 3 }
  ] },
  ...EXTRA_RESEARCH
];

export const MODULE_SWITCH_MS = 10000;
export const createWorkshopState = () => ({
  activeModule: null,
  moduleLevels: { drill: 0, lance: 0, sync: 0 },
  researchLevels: Object.fromEntries(PERMANENT_RESEARCH.map((entry) => [entry.id,0])),
  switchRemainingMs: 0
});

export function hydrateWorkshop(raw) {
  const result = createWorkshopState();
  for (const [entries, key] of [[VOYAGE_MODULES, 'moduleLevels'], [PERMANENT_RESEARCH, 'researchLevels']]) {
    for (const entry of entries) {
      const level = raw?.[key]?.[entry.id];
      result[key][entry.id] = Number.isFinite(level) ? Math.max(0, Math.min(entry.levels.length, Math.floor(level))) : 0;
    }
  }
  if (VOYAGE_MODULES.some((entry) => entry.id === raw?.activeModule) && result.moduleLevels[raw.activeModule] > 0) {
    result.activeModule = raw.activeModule;
  }
  result.switchRemainingMs = Number.isFinite(raw?.switchRemainingMs)
    ? Math.max(0, Math.min(MODULE_SWITCH_MS, raw.switchRemainingMs)) : 0;
  return result;
}

export const isWorkshopUnlocked = (state) => state.ship.engine >= 2 || state.prestige.runs > 0;

export function getWorkshopEffects(state) {
  const lab = state.ship.workshop;
  const module = VOYAGE_MODULES.find((entry) => entry.id === lab?.activeModule);
  const effect = { miningMult: 0, damageMult: 0, miningBonus: 0, damageBonus: 0, critMultiplierBonus:0, oreRewardBonusMult:0,
    ...module?.levels[lab?.moduleLevels[module.id] - 1] };
  for (const entry of PERMANENT_RESEARCH) {
    const level = entry.levels[(lab?.researchLevels[entry.id] || 0) - 1];
    effect.miningBonus += level?.miningBonus || 0;
    effect.damageBonus += level?.damageBonus || 0;
    effect.critMultiplierBonus += level?.critMultiplierBonus || 0;
    effect.oreRewardBonusMult += level?.oreRewardBonusMult || 0;
  }
  return effect;
}

export function upgradeWorkshop(state, kind, id) {
  const entries = kind === 'module' ? VOYAGE_MODULES : kind === 'research' ? PERMANENT_RESEARCH : [];
  const entry = entries.find((item) => item.id === id);
  if (!entry) return { ok: false, messageKey: 'lab.unknown', message: '알 수 없는 연구입니다.' };
  if (!isWorkshopUnlocked(state)) return { ok: false, messageKey: 'lab.locked', message: '첫 파츠 합성 후 연구소가 열립니다.' };
  const lab = state.ship.workshop;
  const levels = kind === 'module' ? lab.moduleLevels : lab.researchLevels;
  const cost = entry.costs[levels[id]];
  if (cost === undefined) return { ok: false, messageKey: 'lab.max', message: '최대 단계입니다.' };
  const resource = kind === 'module' ? 'plasma' : 'relic';
  if (!Number.isFinite(state.loot[resource]) || state.loot[resource] < cost) {
    return { ok: false, messageKey:'lab.needResource', messageParams:{cost}, messageParamKeys:{resource:`resource.${resource}`}, message: `${resource === 'plasma' ? '플라스마' : '유물'} ${cost}개가 필요합니다.` };
  }
  state.loot[resource] -= cost;
  levels[id] += 1;
  if (kind === 'module' && !lab.activeModule && lab.switchRemainingMs === 0) {
    lab.activeModule = id;
    lab.switchRemainingMs = MODULE_SWITCH_MS;
  }
  return { ok: true, messageKey:kind === 'module' ? 'lab.upgraded' : 'lab.researched', messageParams:{level:levels[id]}, messageParamKeys:{name:`${kind === 'module' ? 'modules' : 'research'}.${id}.name`}, message: `${entry.name} Lv.${levels[id]} ${kind === 'module' ? '강화' : '연구'} 완료!` };
}

export function selectWorkshopModule(state, id) {
  const lab = state.ship.workshop;
  if (!isWorkshopUnlocked(state)) return { ok: false, messageKey: 'lab.locked', message: '첫 파츠 합성 후 연구소가 열립니다.' };
  if (id !== null && !VOYAGE_MODULES.some((entry) => entry.id === id && lab.moduleLevels[id] > 0)) {
    return { ok: false, messageKey: 'lab.needModule', message: '먼저 해당 모듈을 강화해 주세요.' };
  }
  if (lab.activeModule === id) return { ok: false, messageKey: 'lab.alreadyActive', message: '이미 적용 중입니다.' };
  if (lab.switchRemainingMs > 0) return { ok: false, messageKey: 'lab.waiting', message: '전환 대기 중입니다.' };
  lab.activeModule = id;
  lab.switchRemainingMs = MODULE_SWITCH_MS;
  return { ok: true, messageKey:id === null ? 'lab.switchedBasic' : 'lab.switched', messageParamKeys:id === null ? {} : {name:`modules.${id}.name`}, message: id === null ? '기본 항해로 전환했습니다.' : `${VOYAGE_MODULES.find((entry) => entry.id === id).name} 적용!` };
}

export function resetVoyageModules(state) {
  const researchLevels = state.ship.workshop.researchLevels;
  state.ship.workshop = { ...createWorkshopState(), researchLevels };
}
