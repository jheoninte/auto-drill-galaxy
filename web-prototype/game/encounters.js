import { EXTRA_LINKS, EXTRA_BOSSES, getBossId } from './launch-content.js';
// HP-derived phases need no wall clock or extra save fields. All builds can win automatically.
export const SKILL_LINKS = [
  { id: 'drill', module:'drill', name: '굴착 공명', skills: ['sk_mine_1', 'sk_mine_2'] },
  { id: 'lance', module:'lance', name: '집중 포화', skills: ['sk_dmg_1', 'sk_dmg_2'] },
  { id: 'sync', module:'sync', name: '정밀 동기화', skills: ['sk_crit_1', 'sk_crit_2'] },
  ...EXTRA_LINKS
];

export const BOSS_PATTERNS = [
  { id: 'armor', phases: [
    { name: '장갑 굴착', module: 'drill', multiplier: 0.85, color: '#fbbf24' },
    { name: '노심 노출', module: 'lance', multiplier: 1.15, color: '#fb7185' }
  ] },
  { id: 'crystal', phases: [
    { name: '수정 공명', module: 'sync', multiplier: 0.9, color: '#c4b5fd' },
    { name: '균열 확장', module: 'drill', multiplier: 1.1, color: '#67e8f9' }
  ] },
  { id: 'void', phases: [
    { name: '공허 응축', module: 'lance', multiplier: 0.9, color: '#fb7185' },
    { name: '위상 붕괴', module: 'sync', multiplier: 1.1, color: '#c4b5fd' }
  ] },
  ...EXTRA_BOSSES
];
export const MODULE_LABELS = { drill: '채굴', lance: '전투', sync: '균형' };

export function getSkillLinks(state) {
  const owned = new Set(state.skills.map((skill) => skill.id));
  return SKILL_LINKS.map((link) => ({ ...link, count: link.skills.filter((id) => owned.has(id)).length,
    active: link.skills.every((id) => owned.has(id)) }));
}

export function getEncounter(state) {
  const wave = state.combat.wave;
  if (wave % 5 !== 0 || state.prestige.runs < 1) return null;
  const pattern = BOSS_PATTERNS.find((entry) => entry.id === getBossId(wave));
  const halfHp = state.combat.maxAsteroidHp / 2;
  const phaseIndex = state.combat.asteroidHp > halfHp ? 0 : 1;
  const phase = pattern.phases[phaseIndex];
  const matching = getSkillLinks(state).filter((entry) => entry.module === phase.module);
  const link = matching.find((entry) => entry.active) || matching[0];
  const moduleBonus = state.ship.workshop.activeModule === phase.module
    && state.ship.workshop.moduleLevels[phase.module] > 0 ? 0.25 : 0;
  const linkBonus = link.active ? 0.1 : 0;
  return { pattern: pattern.id, phaseIndex, ...phase, link, moduleBonus, linkBonus,
    damageMultiplier: phase.multiplier + moduleBonus + linkBonus,
    boundaryHp: phaseIndex === 0 ? halfHp : 0 };
}
