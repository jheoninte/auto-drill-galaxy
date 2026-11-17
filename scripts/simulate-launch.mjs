import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
import {createInitialState} from '../web-prototype/game/state.js';
import {getGachaCost,getPrestigeGate} from '../web-prototype/game/balance.js';
import {advanceMining,advanceCombat,applyOfflineProgress,performGacha,performMerge,performPrestige} from '../web-prototype/game/systems.js';
import {upgradeWorkshop,selectWorkshopModule,PERMANENT_RESEARCH} from '../web-prototype/game/workshop.js';
import {MILESTONES,CONTRACTS,claimExpeditionReward} from '../web-prototype/game/expeditions.js';
import {currentMission,claimCampaign,missionProgress,campaignMetric} from '../web-prototype/game/campaign.js';

const quick=process.argv.includes('--quick');
const seeds=quick?3:20;
const scenarios=[{id:'guided-standard',visits:2,seconds:360},{id:'guided-light',visits:1,seconds:300},{id:'guided-focused',visits:2,seconds:900}];
const median=(values)=>values.length?[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)]:null;
const results=[];
for(const scenario of scenarios) {
  const sessions=[];
  for(let seed=1;seed<=seeds;seed++) {
    let value=seed;
    const random=()=>((value=(Math.imul(value,1664525)+1013904223)>>>0)/4294967296);
    const state=createInitialState();state.profile.lastSeenAt=0;
    const reached={};const checkpoints=[];
    let firstMerge=null,firstUnlock=null,firstUnlockActive=null,firstModule=null,activeSeconds=0;
    for(let day=0;day<30;day++) {
      for(let visit=0;visit<scenario.visits;visit++) {
        const start=day*86400000+visit*86400000/scenario.visits;
        applyOfflineProgress(state,start);
        for(let second=0;second<scenario.seconds;second++) {
          const now=start+(second+1)*1000;
          activeSeconds++;
          advanceMining(state,1000);advanceCombat(state,1000,random);
          let mission=currentMission(state);
          while(mission && claimCampaign(state,mission.id).ok) {
            reached[mission.id]=now/86400000;
            mission=currentMission(state);
          }
          for(const entry of MILESTONES)claimExpeditionReward(state,'milestone',entry.id);
          for(const entry of CONTRACTS)claimExpeditionReward(state,'contract',entry.id);
          while(state.profile.ore>=getGachaCost(state))performGacha(state,random);
          while(performMerge(state).ok)firstMerge??=now/1000;
          // Follow the current task's explicit module requirement; otherwise use combat.
          const moduleId={drillOre:'drill',lanceKills:'lance',syncBosses:'sync'}[mission?.metric] || 'lance';
          while(upgradeWorkshop(state,'module',moduleId).ok){}
          if(state.ship.workshop.activeModule!==moduleId)selectWorkshopModule(state,moduleId);
          if(state.ship.workshop.activeModule)firstModule??=now/1000;
          for(const entry of PERMANENT_RESEARCH)while(upgradeWorkshop(state,'research',entry.id).ok){}
          if(state.combat.wave>=getPrestigeGate(state)) {
            firstUnlock??=now/1000;
            firstUnlockActive??=activeSeconds;
            assert.equal(performPrestige(state).ok,true);
          }
          assert.ok(Number.isFinite(state.profile.ore)&&state.profile.ore>=0);
          assert.ok(state.combat.asteroidHp>0&&Number.isFinite(state.combat.asteroidHp));
        }
        state.profile.lastSeenAt=start+scenario.seconds*1000;
      }
      if([1,3,7,14,21,30].includes(day+1))checkpoints.push({day:day+1,bestWave:state.prestige.bestWave,runs:state.prestige.runs,claimed:state.prestige.campaign.claimed.length,next:currentMission(state)?.id||null,metrics:Object.fromEntries(['activeOre','bosses','skills','merges','totalResearchLevels'].map((key)=>[key,campaignMetric(state,key)]))});
    }
    sessions.push({seed,firstMerge,firstUnlock,firstUnlockActive,firstModule,reached,checkpoints,next:currentMission(state)?.id||null,progress:currentMission(state)?missionProgress(state,currentMission(state)):null});
  }
  const summary={...scenario,seeds,completed:sessions.filter((s)=>s.next===null).length,conditionalMedianCompletionDay:median(sessions.map((s)=>s.reached.campaign_30).filter((v)=>v!==undefined)),firstMergeMedianSeconds:median(sessions.map((s)=>s.firstMerge)),firstUnlockMedianActiveSeconds:median(sessions.map((s)=>s.firstUnlockActive)),firstUnlockMedianWallSeconds:median(sessions.map((s)=>s.firstUnlock)),checkpoints:[1,3,7,14,21,30].map((day)=>{
    const points=sessions.map((s)=>s.checkpoints.find((p)=>p.day===day));return {day,bestWave:median(points.map((p)=>p.bestWave)),runs:median(points.map((p)=>p.runs)),claimed:median(points.map((p)=>p.claimed)),metrics:Object.fromEntries(['activeOre','bosses','skills','merges','totalResearchLevels'].map((key)=>[key,median(points.map((p)=>p.metrics[key]))]))};
  }),unfinished:sessions.filter((s)=>s.next).map((s)=>({seed:s.seed,next:s.next,progress:s.progress}))};
  results.push({summary,sessions});console.log(JSON.stringify(summary));
}
await mkdir(new URL('../tools/reports/',import.meta.url),{recursive:true});
await writeFile(new URL(`../tools/reports/launch-monthly${quick?'-quick':''}.json`,import.meta.url),JSON.stringify({seeds,days:30,stepMs:1000,ads:false,purchases:false,policy:'Guided: claim tasks/rewards, buy/merge/research immediately, buy and switch to the module required by the current mission, combat otherwise. Prestige immediately at gate. Offline mining only, cap 4h. Completion median excludes unfinished seeds; not a retention measurement.',results},null,2)+'\n');
