import assert from 'node:assert/strict';
import { createInitialState, hydrateState } from '../web-prototype/game/state.js';
import { CAMPAIGN, claimCampaign, missionProgress } from '../web-prototype/game/campaign.js';
import { MILESTONES, CONTRACTS, claimExpeditionReward } from '../web-prototype/game/expeditions.js';
import { getReadyRewardCount, claimReadyRewards } from '../web-prototype/game/reward-claims.js';
import { getCampaignGuidance } from '../web-prototype/game/guidance.js';
import { createTutorial, TUTORIAL_IDS } from '../web-prototype/game/tutorial.js';
import { SKILL_POOL } from '../web-prototype/game/balance.js';
import { PERMANENT_RESEARCH } from '../web-prototype/game/workshop.js';
import { serializeState, parseSave } from '../web-prototype/game/storage.js';
import { createI18n } from '../web-prototype/i18n/index.js';
import { getPrestigeGate } from '../web-prototype/game/balance.js';
import { performPrestige } from '../web-prototype/game/systems.js';

const empty=createInitialState();
assert.equal(getReadyRewardCount(empty),0);
assert.equal(claimReadyRewards(empty).ok,false);
empty.skills=[{...SKILL_POOL[0]}];
assert.equal(getReadyRewardCount(empty),1);
assert.equal(claimReadyRewards(empty).messageParams.count,1);
assert.equal(getReadyRewardCount(empty),0,'Must stop at first unfinished campaign task');
assert.deepEqual(empty.prestige.expeditions.claimed,[],'Pre-prestige rewards stay locked');

const prepared=createInitialState();
prepared.skills=Array.from({length:84},()=>({...SKILL_POOL[0]}));
prepared.prestige.runs=30;prepared.prestige.bestWave=40;prepared.ship.engine=20;
prepared.prestige.expeditions.counters={bosses:175,activeOre:1600000};
prepared.prestige.campaign.counters={drillOre:18000,lanceKills:70,syncBosses:8};
for(const item of PERMANENT_RESEARCH) prepared.ship.workshop.researchLevels[item.id]=5;
for(const contract of CONTRACTS)prepared.prestige.expeditions.contractProgress[contract.id]=contract.target;
const original=structuredClone(prepared);
assert.equal(getReadyRewardCount(prepared),40);
assert.deepEqual(prepared,original,'Preview must not grant rewards');
const manual=structuredClone(prepared);
for(const mission of CAMPAIGN)assert.equal(claimCampaign(manual,mission.id).ok,true);
for(const [kind,entries] of [['milestone',MILESTONES],['contract',CONTRACTS]]) {
  for(const entry of entries)assert.equal(claimExpeditionReward(manual,kind,entry.id).ok,true);
}
assert.equal(claimReadyRewards(prepared).messageParams.count,40);
assert.deepEqual(prepared,manual,'Batch must match guarded manual claims exactly');
assert.equal(prepared.prestige.routes.claimed.length,8,'Only campaign cosmetics are granted');
assert.equal(prepared.prestige.routes.equipped,null,'Never auto-equip a style');
const once=structuredClone(prepared);
assert.equal(claimReadyRewards(prepared).ok,false);
assert.deepEqual(prepared,once,'Repeated taps cannot duplicate grants');
assert.equal(getReadyRewardCount(parseSave(serializeState(prepared))),0);

// Navigation hints are derived, read-only, and cover every campaign metric in every language.
for(const [index,entry] of CAMPAIGN.entries()) {
  const state=createInitialState();state.prestige.campaign.claimed=CAMPAIGN.slice(0,index).map((item)=>item.id);
  const before=structuredClone(state);
  const hint=getCampaignGuidance(state);
  assert.ok(hint.key,entry.id);
  for(const locale of ['ko','en','ja']) {
    const i18n=createI18n({preference:locale});
    const params={...hint.params,module:i18n.t('module.'+(hint.moduleId || 'drill'))};
    const text=i18n.t(hint.key,params);
    assert.ok(text!==hint.key && !/\{\w+\}/.test(text),`${entry.id}:${locale}`);
    if(hint.label)assert.notEqual(i18n.t(hint.label,params),hint.label);
  }
  assert.deepEqual(state,before,'Hints must not spend, switch, draw or prestige');
}
const moduleTask=CAMPAIGN.findIndex((entry)=>entry.metric==='drillOre');
const guided=createInitialState();guided.prestige.campaign.claimed=CAMPAIGN.slice(0,moduleTask).map((item)=>item.id);
assert.equal(getCampaignGuidance(guided).key,'guide.labLocked');
guided.ship.engine=2;assert.equal(getCampaignGuidance(guided).key,'guide.moduleBuy');
guided.ship.workshop.moduleLevels.drill=1;assert.equal(getCampaignGuidance(guided).key,'guide.moduleSelect');
guided.ship.workshop.switchRemainingMs=5000;assert.equal(getCampaignGuidance(guided).key,'guide.moduleWait');
guided.ship.workshop.activeModule='drill';assert.equal(getCampaignGuidance(guided).key,'guide.moduleActive');
guided.prestige.campaign.counters.drillOre=18000;
assert.equal(missionProgress(guided,CAMPAIGN[moduleTask]).complete,true);
assert.equal(getCampaignGuidance(guided).key,'guide.ready');
assert.equal(getCampaignGuidance(prepared),null);
prepared.combat.wave=getPrestigeGate(prepared);
assert.equal(performPrestige(prepared).ok,true);
assert.equal(getReadyRewardCount(prepared),0,'Prestige must not reopen lifetime claims or completed contracts');
assert.equal(claimReadyRewards(prepared).ok,false);

const novice=createInitialState();novice.skills=[{...SKILL_POOL[0]}];
novice.ship.engine=2;
novice.tutorial.seen=TUTORIAL_IDS.filter((id)=>!['campaign','lab'].includes(id));
let saves=0;const tutorial=createTutorial(novice,()=>saves++);
assert.equal(tutorial.tick(0).id,'campaign');
tutorial.tick(4000);assert.equal(tutorial.tick(0).id,'lab');
assert.equal(saves,2);
const resumed=createTutorial(hydrateState(novice));
assert.equal(resumed.tick(0),null,'New hints remain one-time after reload');
console.log('Player flow checks passed: guarded batch/manual parity, locked/duplicate claims, backup persistence, read-only localized guidance and one-time onboarding.');
