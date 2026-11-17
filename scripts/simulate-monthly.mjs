import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import {createInitialState} from '../web-prototype/game/state.js';
import {getGachaCost, getPrestigeGate} from '../web-prototype/game/balance.js';
import {advanceMining, advanceCombat, applyOfflineProgress, performGacha, performMerge, performPrestige} from '../web-prototype/game/systems.js';
import {upgradeWorkshop, PERMANENT_RESEARCH} from '../web-prototype/game/workshop.js';
import {MILESTONES, CONTRACTS, claimExpeditionReward} from '../web-prototype/game/expeditions.js';

const median = (values) => values.length ? [...values].sort((a,b)=>a-b)[Math.floor(values.length/2)] : null;
const milestones = [25,32,40,45,50,55,60];
const policies = ['drill','lance','sync'];
const seeds = process.argv.includes('--quick') ? 3 : 20;
const results = [];
for (const moduleId of policies) {
  const sessions = [];
  for (let seed=1;seed<=seeds;seed++) {
    let randomState=seed;
    const random=()=>((randomState=(Math.imul(randomState,1664525)+1013904223)>>>0)/4294967296);
    const state=createInitialState();
    state.profile.lastSeenAt=0;
    const reached={};
    const checkpoints=[];
    let prestigeCount=0;
    let activeSeconds=0;
    for (let day=0;day<30;day++) {
      for (let visit=0;visit<2;visit++) {
        const start=day*86400000+visit*43200000;
        applyOfflineProgress(state,start);
        for (let second=0;second<360;second++) {
          advanceMining(state,1000);
          advanceCombat(state,1000,random);
          activeSeconds++;
          const now=start+(second+1)*1000;
          for (const wave of milestones) if (state.prestige.bestWave>=wave) reached[wave]??={day:now/86400000,activeSeconds};
          for (const entry of MILESTONES) claimExpeditionReward(state,'milestone',entry.id);
          for (const entry of CONTRACTS) claimExpeditionReward(state,'contract',entry.id);
          while (state.profile.ore>=getGachaCost(state)) performGacha(state,random);
          while (performMerge(state).ok) { /* Fixed material costs. */ }
          while (upgradeWorkshop(state,'module',moduleId).ok) { /* Each voyage buys this module only. */ }
          for (const entry of PERMANENT_RESEARCH) while (upgradeWorkshop(state,'research',entry.id).ok) {}
          if (state.combat.wave>=getPrestigeGate(state)) {
            assert.equal(performPrestige(state).ok,true);
            prestigeCount++;
          }
          assert.ok(Number.isFinite(state.profile.ore)&&state.profile.ore>=0);
          assert.ok(state.combat.asteroidHp>0&&Number.isFinite(state.combat.asteroidHp));
        }
        state.profile.lastSeenAt=start+360000;
      }
      if ([1,3,7,14,21,30].includes(day+1)) checkpoints.push({day:day+1,activeSeconds,bestWave:state.prestige.bestWave,runs:state.prestige.runs,skills:state.skills.length,research:{...state.ship.workshop.researchLevels}});
    }
    sessions.push({seed,prestigeCount,reached,checkpoints});
  }
  const summary={moduleId,checkpoints:[1,3,7,14,21,30].map((day)=>{
    const points=sessions.map((s)=>s.checkpoints.find((p)=>p.day===day));
    return {day,bestWave:median(points.map((p)=>p.bestWave)),runs:median(points.map((p)=>p.runs)),skills:median(points.map((p)=>p.skills))};
  }),waveReached:Object.fromEntries(milestones.map((wave)=>{
    const points=sessions.map((s)=>s.reached[wave]).filter(Boolean);
    return [wave,{count:points.length,medianDay:median(points.map((p)=>p.day)),medianActiveSeconds:median(points.map((p)=>p.activeSeconds))}];
  }))};
  results.push({summary,sessions});
  console.log(JSON.stringify(summary));
}
await mkdir(new URL('../tools/reports/',import.meta.url),{recursive:true});
await writeFile(new URL('../tools/reports/monthly-without-campaign.json',import.meta.url),JSON.stringify({
  status:'Current launch skills, bosses and research, with campaign rewards deliberately NOT claimed. Use balance:launch for the guided campaign model. The historical monthly-baseline.json is retained unchanged.',
  seeds,days:30,visitsPerDay:2,secondsPerVisit:360,stepMs:1000,ads:false,purchases:false,
  policy:'Start at 0h/12h daily; at each return mining-only offline cap 4h; every active second claim existing milestones/contracts, buy skills/merge/module/research and prestige at current gate. No decisions while absent. Upper median; milestones sampled before prestige.',
  results
},null,2)+'\n');
