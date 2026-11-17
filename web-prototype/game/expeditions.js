export const MILESTONES = [
  { id: 'first-rebirth', title: '차원의 도약', metric: 'runs', target: 1, reward: { relic: 1 } },
  { id: 'wave-20', title: '심우주 개척자', metric: 'bestWave', target: 20, reward: { relic: 1 } },
  { id: 'skills-15', title: '기술 수집가', metric: 'skills', target: 15, reward: { relic: 1 } },
  { id: 'merge-5', title: '함선 개조 전문가', metric: 'merges', target: 5, reward: { relic: 1 } },
  { id: 'boss-10', title: '거대 소행성 분쇄자', metric: 'bosses', target: 10, reward: { relic: 1 } },
  { id: 'ore-50k', title: '은하계 광부', metric: 'activeOre', target: 50000, reward: { relic: 1 } },
  { id: 'wave-30', title: '변방의 지배자', metric: 'bestWave', target: 30, reward: { relic: 1 } }
];
export const CONTRACTS = [
  { id: 'mining-quota', title: '과부하 채굴 할당량', moduleId: 'drill', description: '채굴 모듈로 전경 채굴 광석 2,500개', target: 2500, reward: { iron: 3, crystal: 1 } },
  { id: 'combat-sweep', title: '궤도 소탕 작전', moduleId: 'lance', description: '전투 모듈을 적용하고 적 6기 격파', target: 6, reward: { plasma: 1 } },
  { id: 'boss-hunt', title: '보스 정밀 타격', moduleId: 'sync', description: '균형 모듈을 적용하고 보스 2기 격파', target: 2, reward: { ore: 150 } }
];
export const isExpeditionUnlocked = (state) => state.prestige.runs >= 1;
export const createExpeditionState = () => ({
  claimed: [], counters: { bosses: 0, activeOre: 0 },
  contractProgress: Object.fromEntries(CONTRACTS.map(({ id }) => [id, 0])), contractClaimed: []
});
const finiteCount = (value, max = Number.MAX_SAFE_INTEGER) => Number.isFinite(value) ? Math.max(0, Math.min(max, value)) : 0;
export function hydrateExpeditions(raw) {
  const result = createExpeditionState();
  const ids = (value, entries) => Array.isArray(value) ? [...new Set(value.filter((id) => entries.some((entry) => entry.id === id)))] : [];
  result.claimed = ids(raw?.claimed, MILESTONES);
  result.contractClaimed = ids(raw?.contractClaimed, CONTRACTS);
  result.counters.bosses = Math.floor(finiteCount(raw?.counters?.bosses));
  result.counters.activeOre = finiteCount(raw?.counters?.activeOre);
  for (const entry of CONTRACTS) result.contractProgress[entry.id] = finiteCount(raw?.contractProgress?.[entry.id], entry.target);
  return result;
}

export function getMilestoneProgress(state, entry) {
  const values = { runs: state.prestige.runs, bestWave: state.prestige.bestWave, skills: state.skills.length,
    merges: Math.max(0, state.ship.engine - 1), ...state.prestige.expeditions.counters };
  return Math.min(entry.target, values[entry.metric] || 0);
}

// Record only actual foreground simulation events, never reward grants or offline mining.
export function recordExpeditionMining(state, amount) {
  const expedition = state.prestige.expeditions;
  const gain = finiteCount(amount);
  expedition.counters.activeOre = finiteCount(expedition.counters.activeOre + gain);
  if (isExpeditionUnlocked(state) && state.ship.workshop.activeModule === 'drill') addContractProgress(expedition, 'mining-quota', gain);
}
export function recordExpeditionClear(state, wave) {
  const expedition = state.prestige.expeditions;
  if (wave.isBoss) expedition.counters.bosses = finiteCount(expedition.counters.bosses + 1);
  if (!isExpeditionUnlocked(state)) return;
  if (state.ship.workshop.activeModule === 'lance') addContractProgress(expedition, 'combat-sweep', 1);
  if (state.ship.workshop.activeModule === 'sync' && wave.isBoss) addContractProgress(expedition, 'boss-hunt', 1);
}
function addContractProgress(expedition, id, amount) {
  if (expedition.contractClaimed.includes(id)) return;
  const entry = CONTRACTS.find((entry) => entry.id === id);
  expedition.contractProgress[id] = Math.min(entry.target, expedition.contractProgress[id] + amount);
}
export function resetVoyageContracts(state) {
  const expedition = state.prestige.expeditions;
  expedition.contractProgress = createExpeditionState().contractProgress;
  expedition.contractClaimed = [];
}
export function claimExpeditionReward(state, kind, id) {
  const entries = kind === 'milestone' ? MILESTONES : kind === 'contract' ? CONTRACTS : [];
  const entry = entries.find((entry) => entry.id === id);
  if (!entry || !isExpeditionUnlocked(state)) return { ok: false, messageKey: 'exp.locked', message: '첫 프레스티지 후 탐사 기록이 열립니다.' };
  const expedition = state.prestige.expeditions;
  const claimed = kind === 'milestone' ? expedition.claimed : expedition.contractClaimed;
  const progress = kind === 'milestone' ? getMilestoneProgress(state, entry) : expedition.contractProgress[id];
  if (claimed.includes(id)) return { ok: false, messageKey: 'exp.alreadyClaimed', message: '이미 수령한 보상입니다.' };
  if (progress < entry.target) return { ok: false, messageKey: 'exp.notReady', message: '아직 목표를 달성하지 않았습니다.' };
  claimed.push(id);
  for (const [resource, amount] of Object.entries(entry.reward)) {
    if (resource === 'ore') state.profile.ore = Math.min(Number.MAX_SAFE_INTEGER, state.profile.ore + amount);
    else state.loot[resource] = Math.min(Number.MAX_SAFE_INTEGER, state.loot[resource] + amount);
  }
  return { ok: true, messageKey:'exp.rewardReceived', messageParamKeys:{name:`exp.${id}.name`}, message: `${entry.title} 보상을 수령했습니다.` };
}
