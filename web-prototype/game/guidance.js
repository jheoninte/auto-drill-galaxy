import { currentMission, missionProgress } from './campaign.js';
import { VOYAGE_MODULES, isWorkshopUnlocked } from './workshop.js';
import { getGachaCost, getPrestigeGate } from './balance.js';

// Navigation hints only. No automatic purchases, switches, reward claims or prestige.
export function getCampaignGuidance(state) {
  const entry = currentMission(state);
  if (!entry) return null;
  if (missionProgress(state, entry).complete) return {key:'guide.ready'};
  const moduleId = {drillOre:'drill', lanceKills:'lance', syncBosses:'sync'}[entry.metric];
  if (moduleId) {
    const lab = state.ship.workshop;
    const module = VOYAGE_MODULES.find((item) => item.id === moduleId);
    const params = {cost:module.costs[0],seconds:Math.ceil(lab.switchRemainingMs/1000)};
    const key = !isWorkshopUnlocked(state) ? 'guide.labLocked'
      : lab.moduleLevels[moduleId] < 1 ? 'guide.moduleBuy'
        : lab.activeModule === moduleId ? 'guide.moduleActive'
          : lab.switchRemainingMs > 0 ? 'guide.moduleWait' : 'guide.moduleSelect';
    return {key, params, moduleId, action:'workshop', label:'guide.openModule'};
  }
  const actions = {
    skills:{key:'guide.skills',action:'gacha',label:'guide.openGacha',params:{cost:getGachaCost(state)}},
    merges:{key:'guide.merge',action:'merge',label:'guide.openMerge'},
    runs:{key:'guide.prestige',action:'prestige',label:'guide.openPrestige',params:{wave:getPrestigeGate(state)}},
    totalResearchLevels:{key:'guide.research',action:'workshop',label:'guide.openResearch'},
    activeSkillLinks:{key:'guide.links',action:'skills',label:'guide.openSkills'},
    activeOre:{key:'guide.activeOre',action:'workshop',moduleId:'drill',label:'guide.openModule'}
  };
  return actions[entry.metric] || {key:'guide.combat',action:'gacha',label:'guide.openGacha'};
}
