import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import {createInitialState} from '../web-prototype/game/state.js';
import {getGachaCost, getPrestigeGate} from '../web-prototype/game/balance.js';
import {advanceMining, advanceCombat, applyOfflineProgress, performGacha, performMerge, performPrestige} from '../web-prototype/game/systems.js';
import {upgradeWorkshop, selectWorkshopModule, PERMANENT_RESEARCH} from '../web-prototype/game/workshop.js';
import {MILESTONES, CONTRACTS, claimExpeditionReward} from '../web-prototype/game/expeditions.js';
import {currentMission, claimCampaign} from '../web-prototype/game/campaign.js';
import {createPlatformServices} from '../web-prototype/platform/services.js';
import {AD_POLICY} from '../web-prototype/platform/catalog.js';

const quick=process.argv.includes('--quick');
const seeds=quick ? 3 : 20;
const adSeconds=30;
const median=(values)=>values.length ? [...values].sort((a,b)=>a-b)[Math.floor(values.length/2)] : null;
const arms=[
  {id:'no-ads',ads:false,maxSupplies:0,policy:AD_POLICY},
  {id:'legacy-cadence',ads:true,maxSupplies:Infinity,policy:{...AD_POLICY,rewardedMiningSeconds:60,rewardedGachaFraction:0,rewardedCooldownMs:180000,interstitialFirstDelayMs:180000,interstitialCooldownMs:180000,interstitialSessionLimit:Infinity,interstitialAfterRewardedMs:0}},
  {id:'mining-only-once-per-visit',ads:true,maxSupplies:1,policy:{...AD_POLICY,rewardedGachaFraction:0}},
  {id:'launch-once-per-visit',ads:true,maxSupplies:1,policy:AD_POLICY},
  {id:'launch-max-supply',ads:true,maxSupplies:Infinity,policy:AD_POLICY}
];
const scenarios=[{id:'standard',visits:2,seconds:360},{id:'focused',visits:2,seconds:900}];
const results=[];
for(const scenario of scenarios) for(const arm of arms) {
  const runs=[];
  for(let seed=1;seed<=seeds;seed++) {
    let value=seed,clock=0,activeSeconds=0,supplyCount=0,interstitialCount=0,adTime=0,completionDay=null,firstMerge=null,supplyUnlocksDraw=0,coverageTotal=0;
    const random=()=>((value=(Math.imul(value,1664525)+1013904223)>>>0)/4294967296);
    const state=createInitialState();state.profile.lastSeenAt=0;
    const checkpoints=[];
    for(let day=0;day<30;day++) {
      for(let visit=0;visit<scenario.visits;visit++) {
        const start=day*86400000+visit*86400000/scenario.visits;
        applyOfflineProgress(state,start);
        let visitSupplies=0,pendingAt=null,receipt=0;
        // Model-only provider. No browser/native success path is added to the game.
        const platform=createPlatformServices({state,now:()=>clock,persist:()=>{},policy:arm.policy,provider:{
          async initialize(){return {capabilities:{rewardedAds:arm.ads,interstitialAds:arm.ads},consent:{canRequestAds:true}};},
          async showRewarded(){clock+=adSeconds*1000;return {rewardEarned:true,rewardId:`model-${day}-${visit}-${++receipt}`};},
          async showInterstitial(){clock+=adSeconds*1000;return {shown:true};}
        }});
        await platform.initialize();
        for(let second=0;second<scenario.seconds;second++) {
          clock=start+(second+1)*1000;
          platform.advanceActiveTime(1000);activeSeconds++;
          advanceMining(state,1000);advanceCombat(state,1000,random);
          let mission=currentMission(state);
          while(mission && claimCampaign(state,mission.id).ok) {
            if(mission.id==='campaign_30')completionDay??=clock/86400000;
            mission=currentMission(state);
          }
          for(const entry of MILESTONES)claimExpeditionReward(state,'milestone',entry.id);
          for(const entry of CONTRACTS)claimExpeditionReward(state,'contract',entry.id);
          while(state.profile.ore>=getGachaCost(state))performGacha(state,random);
          while(performMerge(state).ok)firstMerge??=activeSeconds;
          const moduleId={drillOre:'drill',lanceKills:'lance',syncBosses:'sync'}[mission?.metric] || 'lance';
          while(upgradeWorkshop(state,'module',moduleId).ok){}
          if(state.ship.workshop.activeModule!==moduleId)selectWorkshopModule(state,moduleId);
          for(const entry of PERMANENT_RESEARCH)while(upgradeWorkshop(state,'research',entry.id).ok){}
          if(state.combat.wave>=getPrestigeGate(state)) {
            assert.equal(performPrestige(state).ok,true);pendingAt=activeSeconds+5;
          }
          const hasTime=second+adSeconds<scenario.seconds;
          if(hasTime && visitSupplies<arm.maxSupplies && platform.getRewardedStatus().ready) {
            const drawCost=getGachaCost(state);
            coverageTotal+=Math.min(1,platform.getRewardedStatus().ore/drawCost);
            assert.equal((await platform.showRewarded()).ok,true);
            if(state.profile.ore>=drawCost)supplyUnlocksDraw++;
            visitSupplies++;supplyCount++;adTime+=adSeconds;second+=adSeconds;pendingAt=null;
          } else if(pendingAt!==null && activeSeconds>=pendingAt) {
            pendingAt=null;
            if(hasTime && platform.canShowInterstitial('prestige')) {
              assert.equal((await platform.showInterstitial('prestige')).ok,true);
              interstitialCount++;adTime+=adSeconds;second+=adSeconds;
            }
          }
          assert.ok(Number.isFinite(state.profile.ore)&&state.profile.ore>=0);
        }
        state.profile.lastSeenAt=start+scenario.seconds*1000;
      }
      if([1,7,14,21,30].includes(day+1))checkpoints.push({day:day+1,claimed:state.prestige.campaign.claimed.length,bestWave:state.prestige.bestWave});
    }
    runs.push({seed,completionDay,firstMergeActiveSeconds:firstMerge,activeSeconds,supplyCount,interstitialCount,adSeconds:adTime,supplyUnlocksDraw,meanSupplyDrawCoverage:supplyCount ? coverageTotal/supplyCount : null,claimed:state.prestige.campaign.claimed.length,checkpoints});
  }
  const summary={profile:scenario.id,arm:arm.id,seeds,completed:runs.filter((r)=>r.completionDay!==null).length,
    conditionalMedianCompletionDay:median(runs.map((r)=>r.completionDay).filter((v)=>v!==null)),
    medianClaims:median(runs.map((r)=>r.claimed)),medianSupplyAds:median(runs.map((r)=>r.supplyCount)),
    medianInterstitials:median(runs.map((r)=>r.interstitialCount)),medianAdMinutes:median(runs.map((r)=>r.adSeconds/60)),
    medianImmediateDrawSupplyFraction:median(runs.filter((r)=>r.supplyCount).map((r)=>r.supplyUnlocksDraw/r.supplyCount)),
    medianSupplyDrawCostCoverage:median(runs.map((r)=>r.meanSupplyDrawCoverage).filter((v)=>v!==null)),
    medianFirstMergeActiveSeconds:median(runs.map((r)=>r.firstMergeActiveSeconds)),
    checkpoints:[1,7,14,21,30].map((day)=>({day,claimed:median(runs.map((r)=>r.checkpoints.find((p)=>p.day===day).claimed))}))};
  if(scenario.id==='standard' && arm.id.startsWith('launch'))assert.ok(summary.completed>=Math.ceil(seeds*0.85),'Launch supply must retain the standard 30-day completion target');
  results.push({summary,runs});console.log(JSON.stringify(summary));
}
await mkdir(new URL('../tools/reports/',import.meta.url),{recursive:true});
await writeFile(new URL(`../tools/reports/monetization-monthly${quick?'-quick':''}.json`,import.meta.url),JSON.stringify({seeds,days:30,stepMs:1000,adDurationSeconds:adSeconds,
  assumptions:'Fixed visit budgets include ad time. Gameplay stops during each 30s ad. All ads fill and complete; no purchases. All supply variants unlock after first merge. Legacy-cadence compares old frequency/reward amounts under that same unlock rule, not the entire old implementation. Interstitial opportunity is 5 active seconds after prestige, without extra tutorial/card delays. New platform instance per visit. Same guided spending and 4h offline cap as launch model. Completion median excludes unfinished seeds. This is a model, not measured retention, ad acceptance or revenue.',
  results},null,2)+'\n');
