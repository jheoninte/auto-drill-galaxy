import { formatResult } from '../i18n/result.js';
import { MILESTONES, CONTRACTS, isExpeditionUnlocked, getMilestoneProgress, claimExpeditionReward } from '../game/expeditions.js';
import { createRouteUI } from './routes.js';
import { ROUTES, isRouteUnlocked, getRouteProgress } from '../game/routes.js';
import { createCampaignUI } from './campaign.js';
import { getReadyRewardCount, claimReadyRewards } from '../game/reward-claims.js';

export function createExpeditionUI(state, { onChange, isBusy, i18n, onNavigate }) {
  const dialog = document.getElementById('expeditionDialog');
  const openButton = document.getElementById('expeditionBtn');
  const routeUI = createRouteUI(state, {onChange, isBusy, dialog, i18n});
  const campaignUI = createCampaignUI(state,{onChange,isBusy,dialog,i18n,showPanel,onNavigate});
  const cards = [];
  const t = (key,params) => i18n.t(key,params);
  const n = (value) => i18n.number(Math.floor(value));
  const rewardText = (reward) => Object.entries(reward).map(([key,value]) => `${t('resource.'+key)} +${n(value)}`).join(' · ');
  function claimAll() {
    if(isBusy() || document.hidden) return;
    const result=claimReadyRewards(state);
    const message=formatResult(i18n,result);
    document.getElementById('expeditionMessage').textContent=message;
    if(result.ok) onChange({...result,message,soundCue:'reward'});
    render();
    if(dialog.open) campaignUI.followCurrent();
  }
  for(const id of ['claimAllBtn','claimReadyBtn']) document.getElementById(id).onclick=claimAll;
  for (const [entries, kind, container] of [[MILESTONES, 'milestone', 'milestoneList'], [CONTRACTS, 'contract', 'contractList']]) {
    for (const entry of entries) {
      const card = document.createElement('section');
      card.className = 'product';
      const title = document.createElement('h3');
      const description = document.createElement('p');
      description.className = 'stat';
      const progress = document.createElement('p');
      progress.className = 'stat';
      const button = document.createElement('button');
      button.onclick = () => {
        if (isBusy() || document.hidden) return;
        const result = claimExpeditionReward(state, kind, entry.id);
        document.getElementById('expeditionMessage').textContent = formatResult(i18n,result);
        if (result.ok) onChange(result);
        render();
      };
      card.append(title, description, progress, button);
      document.getElementById(container).append(card);
      cards.push({ entry, kind, progress, button, title, description });
    }
  }
  function showPanel(kind) {
    for (const id of ['milestone', 'contract', 'route','campaign']) {
      document.getElementById(`${id}Panel`).hidden = id !== kind;
      document.getElementById(`${id}TabBtn`).setAttribute('aria-pressed', String(id === kind));
    }
    dialog.scrollTop = 0;
  }
  document.getElementById('milestoneTabBtn').onclick = () => showPanel('milestone');
  document.getElementById('contractTabBtn').onclick = () => showPanel('contract');
  document.getElementById('routeTabBtn').onclick = () => showPanel('route');
  document.getElementById('campaignTabBtn').onclick = () => {showPanel('campaign');render();};
  openButton.onclick = () => {
    showPanel(MILESTONES.some((entry) => !state.prestige.expeditions.claimed.includes(entry.id) && getMilestoneProgress(state, entry) >= entry.target) ? 'milestone'
      : isRouteUnlocked(state) && ROUTES.some((entry) => !state.prestige.routes.claimed.includes(entry.id) && getRouteProgress(state, entry) >= entry.target) ? 'route' : 'contract');
    dialog.showModal(); render();
  };
  document.getElementById('closeExpeditionBtn').onclick = () => dialog.close();
  function render() {
    const rewardCount=getReadyRewardCount(state);
    for(const id of ['claimAllBtn','claimReadyBtn']) {
      const button=document.getElementById(id);
      button.textContent=rewardCount ? t('rewards.claimAll',{count:n(rewardCount)}) : t('rewards.none');
      button.disabled=!rewardCount || isBusy();
      button.hidden=!rewardCount;
    }
    campaignUI.render();
    for (const id of ['milestone','contract','route']) document.getElementById(`${id}TabBtn`).hidden=!isExpeditionUnlocked(state);
    const readyRoutes = routeUI.render();
    const unlocked = isExpeditionUnlocked(state);
    openButton.hidden = !unlocked;
    document.getElementById('voyageNotice').hidden = !unlocked;
    if (!unlocked) return;
    const expedition = state.prestige.expeditions;
    let ready = readyRoutes;
    let readyContracts = 0;
    for (const card of cards) {
      const { entry, kind, button, progress, title, description } = card;
      const claimed = (kind === 'milestone' ? expedition.claimed : expedition.contractClaimed).includes(entry.id);
      const value = kind === 'milestone' ? getMilestoneProgress(state, entry) : expedition.contractProgress[entry.id];
      const complete = value >= entry.target;
      if (complete && !claimed) { ready++; if (kind === 'contract') readyContracts++; }
      if (!dialog.open) continue;
      const name=t(`exp.${entry.id}.name`);
      title.textContent=name;
      description.textContent=`${t(kind === 'contract' ? `exp.${entry.id}.description` : `exp.metric.${entry.metric}`,{target:n(entry.target)})} · ${rewardText(entry.reward)}`;
      progress.textContent = `${n(value)} / ${n(entry.target)}` + (kind === 'contract' && !claimed ? t(state.ship.workshop.activeModule === entry.moduleId ? 'exp.moduleActive' : 'exp.moduleNeeded') : '');
      button.textContent = t(claimed ? 'exp.claimed' : 'exp.claim',{name});
      button.disabled = claimed || !complete || isBusy();
    }
    openButton.textContent = ready ? i18n.t('exp.ready',{count:i18n.number(ready)}) : i18n.t('nav.expeditions');
    document.getElementById('contractResetNotice').textContent = readyContracts
      ? t('exp.unclaimed',{count:n(readyContracts)})
      : t('exp.reset');
    document.getElementById('voyageNotice').textContent = readyContracts
      ? t('exp.readyNotice',{count:n(readyContracts)})
      : t('exp.resetNotice');
  }
  return { render, get open() { return dialog.open; } };
}
