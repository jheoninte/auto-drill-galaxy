import { EXTRA_ROUTES } from './launch-content.js';
// Permanent exploration goals. Rewards change the beam/orbit only, never economy or paid hulls.
export const ROUTES = [
  { id: 'sector-25', title: '성계 경계 돌파', motto: '첫 성계를 넘어 미지의 궤도로', metric: 'bestWave', target: 25, description: '최고 웨이브 25 도달', theme: '새벽 이온 궤적', color: '#fda4af', dash: [] },
  { id: 'voyager-10', title: '베테랑 항해사', motto: '열 번의 차원 도약을 견딘 선체', metric: 'runs', target: 10, description: '프레스티지 누적 10회', theme: '워프 에메랄드', color: '#6ee7b7', dash: [8, 4] },
  { id: 'drill-mastery', title: '과부하 채굴 숙련', motto: '식지 않는 드릴로 소행성을 가른다', metric: 'drillOre', target: 25000, description: '채굴 모듈로 직접 플레이하며 광석 25,000개 채굴', theme: '마그마 앰버', color: '#fbbf24', dash: [3, 5] },
  { id: 'lance-mastery', title: '궤도 소탕 숙련', motto: '빈틈없는 화력으로 궤도를 제압한다', metric: 'lanceKills', target: 100, description: '전투 모듈을 적용하고 적 누적 100기 격파', theme: '크림슨 펄스', color: '#fb7185', dash: [12, 4, 3, 4] },
  { id: 'sync-mastery', title: '양자 균형 숙련', motto: '완벽한 동기화로 거대 보스를 격파', metric: 'syncBosses', target: 20, description: '균형 모듈을 적용하고 보스 누적 20기 격파', theme: '아스트랄 화이트', color: '#f8fafc', dash: [2, 3, 8, 3] },
  { id: 'sector-32', title: '암흑 성운 개척', motto: '짙은 어둠을 가르는 고출력 광선', metric: 'bestWave', target: 32, description: '최고 웨이브 32 도달', theme: '네뷸라 바이올렛', color: '#c4b5fd', dash: [14, 6] },
  { id: 'sector-40', title: '은하 중심부 도달', motto: '중력의 심장부에서 빛나는 항적', metric: 'bestWave', target: 40, description: '최고 웨이브 40 도달', theme: '솔라 골드 코로나', color: '#fde047', dash: [1, 4] },
  ...EXTRA_ROUTES
];
export const isRouteUnlocked = (state) => state.prestige.runs >= 5 || state.prestige.bestWave >= 25;
export const createRouteState = () => ({ claimed: [], tracked: null, equipped: null, counters: { drillOre: 0, lanceKills: 0, syncBosses: 0 } });
export function hydrateRoutes(raw) {
  const result = createRouteState();
  const known = (id) => ROUTES.some((entry) => entry.id === id);
  result.claimed = Array.isArray(raw?.claimed) ? [...new Set(raw.claimed.filter(known))] : [];
  result.tracked = known(raw?.tracked) ? raw.tracked : null;
  result.equipped = result.claimed.includes(raw?.equipped) ? raw.equipped : null;
  for (const entry of ROUTES.filter((entry) => entry.metric in result.counters)) {
    const value = raw?.counters?.[entry.metric];
    result.counters[entry.metric] = Number.isFinite(value) ? Math.min(entry.target, Math.max(0, value)) : 0;
    if (entry.metric !== 'drillOre') result.counters[entry.metric] = Math.floor(result.counters[entry.metric]);
  }
  return result;
}
export function getRouteProgress(state, entry) {
  const value = entry.metric === 'campaignClaims' ? state.prestige.campaign.claimed.length : entry.metric === 'runs' ? state.prestige.runs : entry.metric === 'bestWave' ? state.prestige.bestWave : state.prestige.routes.counters[entry.metric];
  return Math.min(entry.target, Math.max(0, value || 0));
}
export function recordRouteMining(state, amount) {
  if (!isRouteUnlocked(state) || state.ship.workshop.activeModule !== 'drill' || !Number.isFinite(amount) || amount <= 0) return;
  const counters = state.prestige.routes.counters;
  counters.drillOre = Math.min(25000, counters.drillOre + amount);
}
export function recordRouteClear(state, wave) {
  if (!isRouteUnlocked(state)) return;
  const counters = state.prestige.routes.counters;
  if (state.ship.workshop.activeModule === 'lance') counters.lanceKills = Math.min(100, counters.lanceKills + 1);
  if (state.ship.workshop.activeModule === 'sync' && wave.isBoss) counters.syncBosses = Math.min(20, counters.syncBosses + 1);
}
export function claimRoute(state, id) {
  const entry = ROUTES.find((entry) => entry.id === id);
  if (!entry || !isRouteUnlocked(state)) return { ok: false, messageKey: 'routes.locked', message: '프레스티지 5회 또는 최고 웨이브 25에서 심우주 항로가 열립니다.' };
  const routes = state.prestige.routes;
  if (routes.claimed.includes(id)) return { ok: false, messageKey: 'routes.alreadyUnlocked', message: '이미 해금한 항로입니다.' };
  if (getRouteProgress(state, entry) < entry.target) return { ok: false, messageKey: 'exp.notReady', message: '아직 목표를 달성하지 않았습니다.' };
  routes.claimed.push(id);
  return { ok: true, messageKey:'routes.claimed', messageParamKeys:{name:`routes.${id}.name`}, message: `${entry.theme} 외형을 해금했습니다. 적용 버튼으로 선택하세요.` };
}
export function trackRoute(state, id) {
  if (id !== null && (!isRouteUnlocked(state) || !ROUTES.some((entry) => entry.id === id))) return { ok: false, messageKey: 'routes.cannotTrack', message: '지금 선택할 수 없는 목표입니다.' };
  state.prestige.routes.tracked = id;
  return { ok: true, messageKey:id ? 'routes.tracked' : 'routes.untracked', message: id ? '선택한 목표를 메인 화면에 표시합니다. 다른 항로의 진행도도 유지됩니다.' : '목표 추적을 해제했습니다.' };
}
export function equipRoute(state, id) {
  if (id !== null && (!ROUTES.some((entry) => entry.id === id) || !state.prestige.routes.claimed.includes(id))) return { ok: false, messageKey: 'routes.needUnlock', message: '목표 달성 후 외형을 먼저 해금해 주세요.' };
  state.prestige.routes.equipped = id;
  return { ok: true, messageKey:id ? 'routes.equipped' : 'routes.equippedDefault', messageParamKeys:id ? {name:`routes.${id}.name`} : {}, message: id ? `${ROUTES.find((entry) => entry.id === id).theme} 적용. 채굴량과 공격력은 그대로입니다.` : '기본 항로 외형을 적용했습니다.' };
}
export const getRouteTheme = (state) => ROUTES.find((entry) => entry.id === state.prestige.routes.equipped) || null;
