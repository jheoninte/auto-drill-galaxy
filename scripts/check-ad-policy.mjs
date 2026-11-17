import assert from 'node:assert/strict';
import { createInitialState } from '../web-prototype/game/state.js';
import { parseSave, serializeState } from '../web-prototype/game/storage.js';
import { getDerivedStats } from '../web-prototype/game/systems.js';
import { createPlatformServices } from '../web-prototype/platform/services.js';
import { AD_POLICY } from '../web-prototype/platform/catalog.js';
import { createInterstitialWindow } from '../web-prototype/platform/interstitial-window.js';
import { createI18n } from '../web-prototype/i18n/index.js';
import { formatResult } from '../web-prototype/i18n/result.js';
import { getGachaCost, SKILL_POOL } from '../web-prototype/game/balance.js';

let clock=1000000,shown=true,ads=0,rewardId=0;
const provider={
  async initialize(){return {capabilities:{rewardedAds:true,interstitialAds:true},consent:{canRequestAds:true}};},
  async showInterstitial(){ads++;return {shown};},
  async showRewarded(){return {rewardEarned:true,rewardId:`test-${++rewardId}`};}
};
function make(state=createInitialState()) {
  return createPlatformServices({state,provider,now:()=>clock,persist:()=>{}});
}
const state=createInitialState(),service=make(state);
await service.initialize();
assert.equal((await service.showRewarded()).messageKey,'ads.supplyLocked');
assert.equal(state.profile.ore,0);
state.ship.engine=2;
assert.equal(service.getRewardedStatus().ready,true);
assert.equal(service.getRewardedStatus().ore,Math.floor(getDerivedStats(state).miningRate*120));
assert.equal((await service.showRewarded()).ok,true);
assert.equal(service.getRewardedStatus().remainingMs,300000);
const restored=make(parseSave(serializeState(state)));
await restored.initialize();assert.equal(restored.getRewardedStatus().ready,false,'Reload must preserve supply cooldown');
clock+=299999;assert.equal(service.getRewardedStatus().ready,false);
const wait=await service.showRewarded();
for(const locale of ['ko','en','ja'])assert.ok(!/\{\w+\}/.test(formatResult(createI18n({preference:locale}),wait)));
clock++;assert.equal(service.getRewardedStatus().ready,true);

const lateState=createInitialState();lateState.ship.engine=2;
lateState.skills=Array.from({length:60},()=>({...SKILL_POOL[0]}));
const late=make(lateState);await late.initialize();
const lateQuote=late.getRewardedStatus().ore;
assert.equal(lateQuote,Math.floor(getGachaCost(lateState)*0.20),'Late supply preserves a meaningful share of the next draw cost');
assert.equal((await late.showRewarded()).ok,true);assert.equal(lateState.profile.ore,lateQuote);
const cappedState=createInitialState();cappedState.ship.engine=2;cappedState.profile.ore=Number.MAX_SAFE_INTEGER-12;
const capped=make(cappedState);await capped.initialize();
assert.equal(capped.getRewardedStatus().ore,12);
await capped.showRewarded();assert.equal(cappedState.profile.ore,Number.MAX_SAFE_INTEGER);
clock+=AD_POLICY.rewardedCooldownMs;
assert.equal(capped.getRewardedStatus().ready,false);assert.equal((await capped.showRewarded()).messageKey,'ads.supplyFull');

const limited=make();await limited.initialize();
clock+=86400000;
assert.equal(limited.canShowInterstitial('prestige'),false,'Wall time/background must not earn active warmup');
for(const value of [-100,NaN,Infinity])limited.advanceActiveTime(value);
limited.advanceActiveTime(599999);assert.equal(limited.canShowInterstitial('prestige'),false);
limited.advanceActiveTime(1);assert.equal(limited.canShowInterstitial('combat'),false);
assert.equal((await limited.showInterstitial('prestige')).ok,true);
assert.equal(limited.canShowInterstitial('prestige'),false);
await limited.initialize();clock+=86400000;
assert.equal(limited.canShowInterstitial('prestige'),false,'Reinitialization and wall time must not reset spacing');
limited.advanceActiveTime(479999);assert.equal(limited.canShowInterstitial('prestige'),false);
limited.advanceActiveTime(1);assert.equal((await limited.showInterstitial('prestige')).ok,true);
limited.advanceActiveTime(86400000);await limited.initialize();
assert.equal(limited.canShowInterstitial('prestige'),false,'Session cap survives SDK reinitialization');
assert.equal(ads,2);

const failure=make();await failure.initialize();failure.advanceActiveTime(600000);
shown=false;assert.equal((await failure.showInterstitial('prestige')).ok,false);
assert.equal(failure.canShowInterstitial('prestige'),false);
failure.advanceActiveTime(59999);assert.equal(failure.canShowInterstitial('prestige'),false);
failure.advanceActiveTime(1);shown=true;
assert.equal((await failure.showInterstitial('prestige')).ok,true,'No fill does not spend a shown-ad slot');
failure.advanceActiveTime(480000);assert.equal((await failure.showInterstitial('prestige')).ok,true);
failure.advanceActiveTime(480000);assert.equal(failure.canShowInterstitial('prestige'),false);

const guardedState=createInitialState();guardedState.ship.engine=2;
const guarded=make(guardedState);await guarded.initialize();guarded.advanceActiveTime(600000);
await guarded.showRewarded();
assert.equal(guarded.canShowInterstitial('prestige'),false,'Avoid interstitial immediately after optional supply');
clock+=119999;assert.equal(guarded.canShowInterstitial('prestige'),false);
clock++;assert.equal(guarded.canShowInterstitial('prestige'),true);

let finish;
provider.showRewarded=()=>new Promise((resolve)=>{finish=resolve;});
clock+=AD_POLICY.rewardedCooldownMs;
const expected=guarded.getRewardedStatus().ore;
const before=guardedState.profile.ore;
const pending=guarded.showRewarded();
assert.equal(guarded.busy,true);
guardedState.ship.engine+=10; // Even an external state change cannot alter an in-flight quote.
finish({rewardEarned:true,rewardId:'snapshot'});await pending;
assert.ok(Math.abs(guardedState.profile.ore-before-expected)<1e-8);
assert.equal(guardedState.prestige.campaign.counters.drillOre,0);
assert.equal(guardedState.prestige.expeditions.counters.activeOre,0);

const window=createInterstitialWindow();
assert.equal(window.tick(1,{blocked:false,eligible:true}),false,'No prestige means no request');
window.enqueue();assert.equal(window.tick(4500,{blocked:true,eligible:true}),false);
assert.equal(window.tick(1,{blocked:false,eligible:true}),true);
assert.equal(window.tick(1,{blocked:false,eligible:true}),false,'Only one attempt per prestige window');
window.enqueue();assert.equal(window.tick(15000,{blocked:true,eligible:true}),false);
assert.equal(window.tick(1,{blocked:false,eligible:true}),false,'Long help/tutorial/restore must not leave a queued ad');
window.enqueue();window.cancel();assert.equal(window.tick(1,{blocked:false,eligible:true}),false);
window.enqueue();assert.equal(window.tick(1,{blocked:false,eligible:false}),false);
assert.equal(window.tick(10000,{blocked:false,eligible:true}),false,'An ineligible prestige does not become an arbitrary later ad');
console.log('Ad policy checks passed: merge unlock, quote snapshot, persisted supply cooldown, foreground warmup, spacing, cap, no-fill retry, reward buffer and cancellable feedback window.');
