import { CAMPAIGN, SECTORS, currentMission, currentSector, missionProgress, claimCampaign } from '../game/campaign.js';
import { getCampaignGuidance } from '../game/guidance.js';

export function createCampaignUI(state,{i18n,onChange,isBusy,dialog,showPanel,onNavigate}) {
  const t=(key,params) => i18n.t(key,params);
  const n=(value) => i18n.number(value,{maximumFractionDigits:0});
  const local=(text) => text[i18n.locale] || text.en;
  const status=document.getElementById('campaignStatus');
  const selector=document.getElementById('campaignSectorSelect');
  const notice=document.getElementById('campaignNotice');
  const button=document.getElementById('campaignBtn');
  const showAll=document.getElementById('campaignShowAll');
  let selectedSector=null;
  showAll.onchange=() => render();
  const cards=CAMPAIGN.map((entry) => {
    const card=document.createElement('section');card.className='product';
    card.tabIndex=-1;
    const title=document.createElement('h3');
    const description=document.createElement('p');description.className='stat';
    const progress=document.createElement('p');progress.className='goal';
    const reward=document.createElement('p');reward.className='stat';
    const guide=document.createElement('p');guide.className='goal';
    const navigate=document.createElement('button');navigate.className='alt';
    navigate.onclick=() => {
      if (isBusy() || document.hidden || currentMission(state)?.id !== entry.id) return;
      const hint=getCampaignGuidance(state);
      if (hint?.action) onNavigate(hint);
    };
    const claim=document.createElement('button');
    claim.onclick=() => {
      if (isBusy() || document.hidden) return;
      const result=claimCampaign(state,entry.id);
      document.getElementById('expeditionMessage').textContent=t(result.messageKey);
      if (result.ok) {
        onChange({...result,message:t(result.messageKey),soundCue:'reward'});
        followCurrent();
      } else render();
    };
    card.append(title,description,progress,guide,reward,claim,navigate);
    document.getElementById('campaignList').append(card);
    return {entry,card,title,description,progress,reward,claim,guide,navigate};
  });
  for (const sector of SECTORS) { const option=document.createElement('option');option.value=sector.id;selector.append(option); }
  selector.onchange=() => {selectedSector=selector.value;render();};
  button.onclick=() => {selectedSector=null;showAll.checked=false;showPanel('campaign');dialog.showModal();render();};
  function followCurrent() {
    selectedSector=null;
    showAll.checked=false;
    render();
    // Only move focus after an explicit claim, never during background HUD updates.
    if (!document.getElementById('campaignPanel').hidden) {
      const target=cards.find((card) => card.entry.id === currentMission(state)?.id)?.card || status;
      target.tabIndex=-1;
      target.focus({preventScroll:true});
      target.scrollIntoView({block:'nearest'});
    }
  }
  function render() {
    const current=currentMission(state);
    const sector=currentSector(state);
    const count=state.prestige.campaign.claimed.length;
    const ready=current && missionProgress(state,current).complete;
    button.textContent=t(ready?'campaign.ready':'campaign.button',{count:n(count)});
    notice.textContent=current ? t('campaign.notice',{sector:local(sector.name),title:local(current.title)}) : t('campaign.finished');
    if (!dialog.open) return;
    const selected=selectedSector || sector.id;
    const hint=getCampaignGuidance(state);
    const params={...hint?.params};
    for (const key of Object.keys(params)) if (typeof params[key] === 'number') params[key]=n(params[key]);
    if(hint?.moduleId) params.module=t(`module.${hint.moduleId}`);
    status.textContent=t('campaign.status',{sector:n(sector.order),count:n(count)});
    for (const [index,option] of [...selector.options].entries()) {
      option.textContent=`${n(index+1)} · ${local(SECTORS[index].name)}`;
      option.disabled=SECTORS[index].order > sector.order;
    }
    selector.value=selected;
    for (const c of cards) {
      const {entry}=c;
      c.card.hidden=entry.sectorId !== selected || (selected === sector.id && current && !showAll.checked && entry.id !== current.id);
      if(c.card.hidden) continue;
      const completed=state.prestige.campaign.claimed.includes(entry.id);
      const active=current?.id === entry.id;
      const progress=missionProgress(state,entry);
      c.title.textContent=`${n(entry.order)} · ${local(entry.title)}`;
      c.description.textContent=local(entry.description);
      c.progress.textContent=completed ? t('campaign.done') : !active ? t('campaign.locked') : t('campaign.progress',{value:n(progress.value),target:n(entry.target)});
      if(active && entry.alternative) c.progress.textContent+=' · '+t('campaign.alternative',{value:n(progress.alternativeValue),target:n(entry.alternative.target)});
      c.reward.textContent=t('campaign.reward',{reward:[...Object.entries(entry.reward),...Object.entries(entry.bonusReward || {})].map(([key,value]) => key === 'route'
        ? t(`routes.${value}.name`) : `${t('resource.'+key)} +${n(value)}`).join(' · ')});
      c.claim.textContent=t(completed?'campaign.done':'campaign.claim');
      c.claim.hidden=active && !progress.complete;
      c.claim.disabled=!active || !progress.complete || isBusy();
      c.guide.hidden=!active;
      c.guide.textContent=active && hint ? t(hint.key,params) : '';
      c.navigate.hidden=!active || !hint?.action;
      if(active && hint?.action) c.navigate.textContent=t(hint.label,params);
      c.navigate.disabled=isBusy();
    }
  }
  return {render,followCurrent};
}
