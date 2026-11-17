import data from './data/launch-content.json' with { type: 'json' };
export const LAUNCH_CONTENT = data;
// Stable data IDs remain independent of UI language.
export const EXTRA_SKILLS = data.skills.map((entry) => ({ ...entry, name:entry.name.ko }));
export const EXTRA_LINKS = data.skillLinks.map((entry) => ({ ...entry, name:entry.name.ko, module:entry.moduleId }));
export const EXTRA_RESEARCH = data.permanentResearch.map((entry) => ({ ...entry, name:entry.name.ko }));
export const EXTRA_ROUTES = data.routes.map((entry,index) => ({
  ...entry, title:entry.name.ko, theme:entry.name.ko, description:entry.description.ko,
  motto:'', metric:'campaignClaims', target:[12,18,23,24,28,29,30,30][index]
}));
export const EXTRA_BOSSES = data.bosses.map((entry) => ({
  id:entry.id.replace('boss_',''), name:entry.name.ko,
  phases:entry.phases.map((phase) => ({ ...phase, name:phase.name.ko }))
}));

export function getBossId(wave) {
  if (wave % 5 !== 0) return null;
  if (wave <= 30) return ['armor','crystal','void'][(wave / 5 - 1) % 3];
  return ['gravity','solar','armor','crystal','void'][(wave / 5 - 7) % 5];
}
