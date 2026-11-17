import { formatResult } from '../i18n/result.js';
import { VOYAGE_MODULES, PERMANENT_RESEARCH, isWorkshopUnlocked, selectWorkshopModule, upgradeWorkshop } from '../game/workshop.js';
import { getDerivedStats } from '../game/systems.js';
import { getEncounter } from '../game/encounters.js';

export function createWorkshopUI(state, { onChange, isBusy, i18n }) {
  const dialog = document.getElementById('workshopDialog');
  const status = document.getElementById('workshopMessage');
  const cards = [];
  const t = (key, params) => i18n.t(key, params);
  const n = (value, digits = 0) => i18n.number(value, {minimumFractionDigits:digits, maximumFractionDigits:digits});
  function effectText(effect = {}) {
    const output = [];
    for (const key of ['miningMult','damageMult','miningBonus','damageBonus','critMultiplierBonus','oreRewardBonusMult']) {
      if (!effect[key]) continue;
      const percent = ['miningMult','damageMult','oreRewardBonusMult'].includes(key);
      let value = n(percent ? Math.round(effect[key] * 100) : effect[key], key === 'critMultiplierBonus' ? 2 : percent ? 0 : 2);
      if (['miningMult','damageMult'].includes(key) && effect[key] > 0) value = '+' + value;
      output.push(t('lab.effect.' + key, {value}));
    }
    return output.join(' · ') || t('lab.noEffect');
  }
  function act(action, soundCue = 'research') {
    if (isBusy() || document.hidden) return;
    const result = action();
    status.textContent = formatResult(i18n,result);
    if (result.ok) onChange({ ...result, soundCue });
    render();
  }
  for (const [entries, kind, target] of [[VOYAGE_MODULES, 'module', 'voyageModules'], [PERMANENT_RESEARCH, 'research', 'permanentResearch']]) {
    for (const entry of entries) {
      const card = document.createElement('section');
      card.className = 'product workshop-product';
      const title = document.createElement('h3');
      const effect = document.createElement('p');
      effect.className = 'stat';
      const preview = document.createElement('p');
      preview.className = 'stat';
      const upgrade = document.createElement('button');
      upgrade.onclick = () => act(() => upgradeWorkshop(state, kind, entry.id));
      card.append(title, effect, preview, upgrade);
      let select;
      if (kind === 'module') {
        select = document.createElement('button');
        select.className = 'alt';
        select.onclick = () => act(() => selectWorkshopModule(state, entry.id), 'equip');
        card.append(select);
      }
      document.getElementById(target).append(card);
      card.tabIndex=-1;
      cards.push({ entry, kind, card, title, effect, preview, upgrade, select });
    }
  }
  const basic = document.getElementById('basicModuleBtn');
  basic.onclick = () => act(() => selectWorkshopModule(state, null), 'equip');
  function open({moduleId, research=false} = {}) {
    dialog.showModal();
    render();
    dialog.scrollTop=0;
    const target=moduleId ? cards.find((item) => item.kind === 'module' && item.entry.id === moduleId)
      : research ? cards.find((item) => item.kind === 'research') : null;
    if(target) {
      target.card.focus({preventScroll:true});
      target.card.scrollIntoView({block:'start'});
    }
  }
  document.getElementById('workshopBtn').onclick = () => open();
  document.getElementById('closeWorkshopBtn').onclick = () => dialog.close();
  function render() {
    const lab = state.ship.workshop;
    const unlocked = isWorkshopUnlocked(state);
    const active = VOYAGE_MODULES.find((entry) => entry.id === lab.activeModule);
    const wait = Math.ceil(lab.switchRemainingMs / 1000);
    document.getElementById('workshopBtn').textContent = i18n.t(unlocked ? 'lab.open' : 'nav.labLocked');
    if (!dialog.open) return;
    const stats = getDerivedStats(state);
    const encounter = getEncounter(state);
    document.getElementById('workshopTactic').hidden = !encounter;
    if (encounter) document.getElementById('workshopTactic').textContent = t('lab.tactic',{name:t(`enemy.${encounter.pattern}`),module:t(`module.${encounter.module}`)});
    document.getElementById('workshopStatus').textContent = t('lab.resources',{status:unlocked ? t('lab.applied',{name:active ? t(`modules.${active.id}.name`) : t('lab.defaultName')}) : t('lab.locked'),plasma:n(state.loot.plasma),relic:n(state.loot.relic)});
    document.getElementById('workshopStats').textContent = t('lab.stats',{mining:n(stats.miningRate,1),damage:n(stats.combatDps,1)}) + (wait ? t('lab.wait',{seconds:n(wait)}) : '');
    basic.textContent = t(lab.activeModule ? 'lab.basicSwitch' : 'lab.basic');
    basic.disabled = !unlocked || !lab.activeModule || wait > 0 || isBusy();
    for (const card of cards) {
      const { entry, kind, title, effect, preview, upgrade, select } = card;
      const level = (kind === 'module' ? lab.moduleLevels : lab.researchLevels)[entry.id];
      const cost = entry.costs[level];
      const resource = kind === 'module' ? 'plasma' : 'relic';
      const resourceName = t('resource.' + resource);
      const name=i18n.t(`${kind === 'module' ? 'modules' : 'research'}.${entry.id}.name`);
      title.textContent = `${name} · ${n(level)}/${n(entry.levels.length)}`;
      effect.textContent = t('lab.currentEffect',{effect:effectText(entry.levels[level - 1])});
      if (encounter && kind === 'module' && level > 0) {
        const candidate = { ...state, ship: { ...state.ship, workshop: { ...lab, activeModule: entry.id } } };
        const derived = getDerivedStats(candidate);
        const damage = derived.combatDps * (1 + derived.critChance * (derived.critMultiplier - 1)) * getEncounter(candidate).damageMultiplier;
        effect.textContent += t('lab.phaseDamage',{damage:n(damage,1)});
      }
      preview.textContent = cost === undefined ? t('lab.max') : t('lab.nextEffect',{effect:effectText(entry.levels[level])});
      upgrade.textContent = cost === undefined ? t('lab.maxName',{name}) : t('lab.upgrade',{name,resource:resourceName,cost:n(cost)});
      upgrade.disabled = !unlocked || cost === undefined || state.loot[resource] < cost || isBusy();
      if (select) {
        select.textContent = t(lab.activeModule === entry.id ? 'lab.selected' : 'lab.select',{name});
        select.setAttribute('aria-pressed', String(lab.activeModule === entry.id));
        select.disabled = !unlocked || level === 0 || lab.activeModule === entry.id || wait > 0 || isBusy();
      }
    }
  }
  return { render, show:open, get open() { return dialog.open; } };
}
