import data from './data/campaign.json' with { type:'json' };
import { getSkillLinks } from './encounters.js';

export const SECTORS = data.sectors;
export const CAMPAIGN = data.missions;
const bounded = (value,max=Number.MAX_SAFE_INTEGER) => Number.isFinite(value) ? Math.min(max,Math.max(0,value)) : 0;
const limits = {drillOre:18000,lanceKills:70,syncBosses:8};
export const createCampaignState = () => ({claimed:[],counters:{drillOre:0,lanceKills:0,syncBosses:0}});
export function hydrateCampaign(raw, oldRouteCounters = {}) {
  const result = createCampaignState();
  // Only a contiguous prefix can have been claimed. A forged late ID cannot skip prerequisites.
  for (const entry of CAMPAIGN) {
    if (!Array.isArray(raw?.claimed) || !raw.claimed.includes(entry.id)) break;
    result.claimed.push(entry.id);
  }
  for (const [key,max] of Object.entries(limits)) {
    const value = raw?.counters?.[key] ?? oldRouteCounters[key];
    result.counters[key] = bounded(value,max);
    if (key !== 'drillOre') result.counters[key] = Math.floor(result.counters[key]);
  }
  return result;
}
export const currentMission = (state) => CAMPAIGN[state.prestige.campaign.claimed.length] || null;
export const currentSector = (state) => SECTORS.find((sector) => sector.id === currentMission(state)?.sectorId) || SECTORS.at(-1);
export function campaignMetric(state,metric) {
  const values = {
    skills:state.skills.length, bestWave:state.prestige.bestWave, runs:state.prestige.runs,
    merges:Math.max(0,state.ship.engine-1), ...state.prestige.expeditions.counters,
    ...state.prestige.campaign.counters,
    activeSkillLinks:getSkillLinks(state).filter((link) => link.active).length,
    totalResearchLevels:Object.values(state.ship.workshop.researchLevels).reduce((sum,level) => sum+level,0)
  };
  return bounded(values[metric]);
}
export function missionProgress(state,entry) {
  const value = Math.min(entry.target,campaignMetric(state,entry.metric));
  const alternative = entry.alternative;
  const alternativeValue = alternative ? Math.min(alternative.target,campaignMetric(state,alternative.metric)) : 0;
  return {value, alternativeValue, complete:value >= entry.target || Boolean(alternative && alternativeValue >= alternative.target)};
}
export function recordCampaignMining(state,amount) {
  const lab=state.ship.workshop;
  if (lab.activeModule !== 'drill' || lab.moduleLevels.drill < 1 || !Number.isFinite(amount) || amount <= 0) return;
  const counters=state.prestige.campaign.counters;
  counters.drillOre=bounded(counters.drillOre+amount,limits.drillOre);
}
export function recordCampaignClear(state,wave) {
  const lab=state.ship.workshop;
  const counters=state.prestige.campaign.counters;
  if (lab.activeModule === 'lance' && lab.moduleLevels.lance > 0) counters.lanceKills=bounded(counters.lanceKills+1,limits.lanceKills);
  if (lab.activeModule === 'sync' && lab.moduleLevels.sync > 0 && wave.isBoss) counters.syncBosses=bounded(counters.syncBosses+1,limits.syncBosses);
}
export function claimCampaign(state,id) {
  const entry=currentMission(state);
  if (!entry || entry.id !== id || !missionProgress(state,entry).complete) return {ok:false,messageKey:'campaign.notReady'};
  state.prestige.campaign.claimed.push(id);
  for (const [resource,amount] of [...Object.entries(entry.reward),...Object.entries(entry.bonusReward || {})]) {
    if (resource === 'route') {
      if (!state.prestige.routes.claimed.includes(amount)) state.prestige.routes.claimed.push(amount);
    } else if (resource === 'ore') state.profile.ore=bounded(state.profile.ore+amount);
    else state.loot[resource]=bounded(state.loot[resource]+amount);
  }
  return {ok:true,messageKey:'campaign.claimed'};
}
