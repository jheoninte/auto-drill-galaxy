import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createInitialState,hydrateState} from '../web-prototype/game/state.js';
import {CAMPAIGN,SECTORS,currentMission,claimCampaign,missionProgress,recordCampaignMining,recordCampaignClear} from '../web-prototype/game/campaign.js';
import {SKILL_POOL,getAvailableSkills,getWaveConfig,getPrestigeGate} from '../web-prototype/game/balance.js';
import {ROUTES,equipRoute} from '../web-prototype/game/routes.js';
import {SKILL_LINKS,BOSS_PATTERNS,getEncounter} from '../web-prototype/game/encounters.js';
import {PERMANENT_RESEARCH,upgradeWorkshop,getWorkshopEffects} from '../web-prototype/game/workshop.js';
import {performPrestige,applyOfflineProgress,advanceCombat,getDerivedStats,performGacha} from '../web-prototype/game/systems.js';
import {serializeState,parseSave} from '../web-prototype/game/storage.js';
import {selectShipColor,shipColor,SUPPORTER_COLORS} from '../web-prototype/game/cosmetics.js';
import {catalogs} from '../web-prototype/i18n/index.js';

assert.equal(SECTORS.length,5);assert.equal(CAMPAIGN.length,30);
assert.equal(SKILL_POOL.length,18);assert.equal(SKILL_LINKS.length,6);assert.equal(BOSS_PATTERNS.length,5);
assert.equal(PERMANENT_RESEARCH.length,4);assert.equal(ROUTES.length,15);assert.equal(SUPPORTER_COLORS.length,3);
const metricSet=new Set(['skills','bestWave','runs','merges','activeOre','bosses','drillOre','lanceKills','syncBosses','activeSkillLinks','totalResearchLevels']);
for(const [index,entry] of CAMPAIGN.entries()) {
  assert.equal(entry.order,index+1);assert.equal(entry.prerequisiteId,index ? CAMPAIGN[index-1].id : null);
  assert.equal(entry.scope,'lifetime');assert.equal(entry.retroactive,true);assert.ok(metricSet.has(entry.metric));
  assert.ok(entry.target>0);
  for(const locale of ['ko','en','ja']) {assert.ok(entry.title[locale]);assert.ok(entry.description[locale]);}
  for(const [key,value] of [...Object.entries(entry.reward),...Object.entries(entry.bonusReward || {})]) {
    if(key==='route') assert.ok(ROUTES.some((r)=>r.id===value));
    else {assert.ok(['ore','iron','crystal','plasma','relic'].includes(key));assert.ok(Number.isFinite(value)&&value>0);}
  }
}
for(const s of SECTORS)assert.equal(CAMPAIGN.filter((t)=>t.sectorId===s.id).length,6);
const source=await readFile(new URL('../tools/handoffs/gemini-release-draft/asset_catalog.tsv',import.meta.url),'utf8');
assert.equal(source.trim().split(/\r?\n/).length-1,76);
const rawUI=JSON.parse(await readFile(new URL('../tools/handoffs/gemini-release-draft/ui_ko_en_ja.json',import.meta.url),'utf8'));
assert.deepEqual(Object.keys(rawUI.ko).sort(),Object.keys(rawUI.en).sort());

const state=createInitialState();
assert.equal(getAvailableSkills(state).length,12);
state.prestige.runs=1;assert.equal(getAvailableSkills(state).length,18);state.prestige.runs=0;
assert.equal(claimCampaign(state,'campaign_02').ok,false);
assert.equal(claimCampaign(state,'campaign_01').ok,false);
state.profile.ore=50;performGacha(state,()=>0);
assert.equal(claimCampaign(state,'campaign_01').ok,true);
const balance=state.profile.ore;
assert.equal(claimCampaign(state,'campaign_01').ok,false);assert.equal(state.profile.ore,balance);
assert.equal(currentMission(state).id,'campaign_02');
const before=structuredClone(state.prestige.campaign.counters);
state.profile.lastSeenAt=1000;applyOfflineProgress(state,14_401_000);
assert.deepEqual(state.prestige.campaign.counters,before);
state.ship.workshop.activeModule='drill';recordCampaignMining(state,10000);
assert.equal(state.prestige.campaign.counters.drillOre,0);
state.ship.workshop.moduleLevels.drill=1;
for(const v of [-1,NaN,Infinity])recordCampaignMining(state,v);
recordCampaignMining(state,20000);assert.equal(state.prestige.campaign.counters.drillOre,18000);
state.ship.workshop.activeModule='lance';state.ship.workshop.moduleLevels.lance=1;
recordCampaignClear(state,getWaveConfig(1));assert.equal(state.prestige.campaign.counters.lanceKills,1);
assert.equal(state.prestige.campaign.counters.syncBosses,0);
state.ship.workshop.activeModule='sync';state.ship.workshop.moduleLevels.sync=1;
recordCampaignClear(state,getWaveConfig(1));assert.equal(state.prestige.campaign.counters.syncBosses,0);
recordCampaignClear(state,getWaveConfig(5));assert.equal(state.prestige.campaign.counters.syncBosses,1);
state.prestige.expeditions.counters.bosses=35;
for(const id of ['campaign_14','campaign_22'])assert.equal(missionProgress(state,CAMPAIGN.find((x)=>x.id===id)).complete,true,'Deterministic alternative must avoid draw luck');

const old=hydrateState({prestige:{routes:{counters:{drillOre:123,lanceKills:4,syncBosses:2}}}});
assert.deepEqual(old.prestige.campaign.counters,{drillOre:123,lanceKills:4,syncBosses:2});
const invalid=hydrateState({prestige:{campaign:{claimed:['campaign_30','campaign_01','campaign_01','bad'],counters:{drillOre:Infinity,lanceKills:1.5,syncBosses:-1}}}});
assert.deepEqual(invalid.prestige.campaign,{claimed:['campaign_01'],counters:{drillOre:0,lanceKills:1,syncBosses:0}});
const snapshot=structuredClone(state.prestige.campaign);
state.combat.wave=getPrestigeGate(state);performPrestige(state);
assert.deepEqual(state.prestige.campaign,snapshot);
assert.deepEqual(parseSave(serializeState(state)).prestige.campaign,snapshot);

// Complete a full deterministic save without any linked/rare skills: the alternatives must work.
const complete=createInitialState();
complete.skills=Array.from({length:84},()=>({...SKILL_POOL[0]}));
complete.prestige.bestWave=40;complete.prestige.runs=30;complete.ship.engine=11;
complete.prestige.expeditions.counters={bosses:175,activeOre:1600000};
complete.prestige.campaign.counters={drillOre:18000,lanceKills:70,syncBosses:8};
for(const entry of PERMANENT_RESEARCH)complete.ship.workshop.researchLevels[entry.id]=5;
for(const entry of CAMPAIGN)assert.equal(claimCampaign(complete,entry.id).ok,true,entry.id);
assert.equal(currentMission(complete),null);
assert.equal(complete.prestige.routes.claimed.length,8);
assert.equal(equipRoute(complete,'route_launch_15').ok,true);
const rewards=JSON.stringify({loot:complete.loot,profile:complete.profile});
for(const entry of CAMPAIGN)assert.equal(claimCampaign(complete,entry.id).ok,false);
assert.equal(JSON.stringify({loot:complete.loot,profile:complete.profile}),rewards);
assert.equal(parseSave(serializeState(complete)).prestige.campaign.claimed.length,30);

for(const wave of [35,40,45,50,55,60]) {
  const s=createInitialState();s.prestige.runs=1;s.combat.wave=wave;s.combat.maxAsteroidHp=getWaveConfig(wave).hp;s.combat.asteroidHp=s.combat.maxAsteroidHp;
  assert.equal(getEncounter(s).pattern,getWaveConfig(wave).bossId);
  const first=getEncounter(s);s.combat.asteroidHp=s.combat.maxAsteroidHp/2;
  assert.notEqual(getEncounter(s).module,first.module);
}
const research=createInitialState();research.ship.engine=2;research.loot.relic=200;
while(upgradeWorkshop(research,'research','res_launch_03').ok){}
assert.equal(getWorkshopEffects(research).critMultiplierBonus,0.25);
assert.equal(getDerivedStats(research).critMultiplier,2.45);
research.skills=Array.from({length:30},()=>({...SKILL_POOL.find((x)=>x.critBonus>0)}));
assert.equal(getDerivedStats(research).critChance,0.65);
while(upgradeWorkshop(research,'research','res_launch_04').ok){}
research.combat.asteroidHp=0;
const ore=research.profile.ore;
assert.equal(advanceCombat(research,0,()=>0)[0].oreReward,32);
assert.equal(research.profile.ore-ore,32);
assert.equal(selectShipColor(research,'supporter_color_02',false),false);
research.settings.supporterColor='supporter_color_02';assert.equal(shipColor(research,false),'#67e8f9');
assert.equal(shipColor(parseSave(serializeState(research)),false),'#67e8f9');
assert.equal(selectShipColor(research,'supporter_color_03',true),true);
assert.equal(shipColor(research,true),'#34d399');
for(const route of ROUTES.filter((r)=>r.id.startsWith('route_launch_')))for(const locale of ['ko','en','ja'])assert.ok(catalogs[locale][`routes.${route.id}.name`]);
console.log('Campaign/content checks passed: 5×6 tasks, data counts, reward references, sequential claims, deterministic alternatives, module counters, migration, prestige, 8 cosmetics, new bosses/research and entitlement boundaries.');
