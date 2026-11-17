import { formatResult } from './i18n/result.js';
import { createI18n } from './i18n/index.js';
import { SKILL_POOL } from './game/balance.js';
import { SUPPORTER_COLORS, selectShipColor } from './game/cosmetics.js';
import { loadState, saveState, saveStore } from './game/storage.js';
import { createLifecycle } from './game/lifecycle.js';
import { createSaveUI } from './ui/save.js';
import {
  advanceCombat,
  advanceMining,
  getDerivedStats,
  performGacha,
  performMerge,
  performPrestige
} from './game/systems.js';
import { ECONOMY, getGachaCost, getPrestigeGate, getWaveConfig } from './game/balance.js';
import { createTutorial } from './game/tutorial.js';
import { PRODUCTS } from './platform/catalog.js';
import { createNativeProvider } from './platform/native.js';
import { createPlatformServices } from './platform/services.js';
import { createInterstitialWindow } from './platform/interstitial-window.js';
import { createScene } from './ui/scene.js';
import { createAudioFeedback } from './ui/audio.js';
import { createSettingsUI } from './ui/settings.js';
import { createRewardFeedback, describeStatChanges } from './ui/feedback.js';
import { createWorkshopUI } from './ui/workshop.js';
import { createExpeditionUI } from './ui/expeditions.js';
import { getEncounter, getSkillLinks } from './game/encounters.js';

const canvas = document.getElementById('canvas');
const sceneRenderer = createScene(canvas);
const stats = document.getElementById('stats');
const parts = document.getElementById('parts');
const skills = document.getElementById('skills');
const loot = document.getElementById('loot');
const events = document.getElementById('events');
const scene = document.querySelector('.scene');
const shopDialog = document.getElementById('shopDialog');
const rewardedButton = document.getElementById('rewardedBtn');
const leaderboardButton = document.getElementById('leaderboardBtn');

const state = loadState();
const interstitialWindow = createInterstitialWindow();
const i18n = createI18n({ preference: state.settings.locale, languages: navigator.languages || [navigator.language] });
const t = (key, params) => i18n.t(key, params);
const n = (value, digits = 0) => i18n.number(value, { minimumFractionDigits: digits, maximumFractionDigits: digits });
const skillName = (skill) => SKILL_POOL.some((entry) => entry.id === skill.id) ? t('skills.' + skill.id) : skill.name;
const enemyName = (wave) => t(wave.isBoss ? `enemy.${wave.bossId}` : 'enemy.asteroid');
function recordResult(result) {
  state.session.lastRewardSummary = result.message;
  state.session.lastRewardEvent = result;
}
const resultMessage = (result) => formatResult(i18n, result);
state.session.timeScale = 1;
const platform = createPlatformServices({ state, provider: createNativeProvider(), persist: persistState });
const tutorial = createTutorial(state, persistState);
const audio = createAudioFeedback(() => state.settings.soundEnabled, () => state.settings.soundVolume);
const settingsUI = createSettingsUI(state, { audio, persist: persistState, i18n });
const feedback = createRewardFeedback(document.getElementById('rewardCard'));
const lifecycle = createLifecycle(state, persistState);
const saveUI = createSaveUI(state, { i18n, isBusy: () => platform.busy, onRestore: () => {
  interstitialWindow.cancel();
  currentTutorialId = null;
  state.session.lastRewardEvent = null;
  i18n.setLocale(state.settings.locale);
  audio.suspend();
  audio.sync();
  settingsUI.render();
  lastFrameAt = performance.now();
  lastSaveAt = lastFrameAt;
  renderHud();
} });
const workshopUI = createWorkshopUI(state, {
  i18n,
  isBusy: () => platform.busy,
  onChange: (result) => {
    recordResult(result);
    audio.play(result.soundCue || 'research', { fromGesture: true });
    persistState();
  }
});
const expeditionUI = createExpeditionUI(state, {
  i18n,
  onNavigate: (hint) => {
    document.getElementById('expeditionDialog').close();
    if(hint.action === 'workshop') {
      workshopUI.show({moduleId:hint.moduleId,research:!hint.moduleId});
      return;
    }
    const id={gacha:'gachaBtn',merge:'mergeBtn',prestige:'prestigeBtn',skills:'skillSummary'}[hint.action];
    const target=document.getElementById(id);
    if(!target) return;
    if(hint.action === 'skills') target.parentElement.open=true;
    const focus=target.disabled ? target.closest('.controls') : target;
    if(focus !== target) focus.tabIndex=-1;
    focus.focus({preventScroll:true});
    target.scrollIntoView({block:'center'});
  },
  isBusy: () => platform.busy,
  onChange: (result) => {
    recordResult(result);
    audio.play(result.soundCue || 'reward', { fromGesture: true });
    persistState();
  }
});
const tutorialBanner = document.getElementById('tutorialBanner');
let currentTutorialId = null;
let lastFrameAt = performance.now();
let lastSaveAt = performance.now();
let lastHudAt = -Infinity;

function persistState() {
  const saved = saveState(state);
  if (!saved) recordResult({ message: t('errors.progress'), messageKey: 'errors.progress' });
  return saved;
}

function resize() {
  sceneRenderer.resize();
}

function renderHud() {
  document.getElementById('saveNotice').textContent = saveStore.messageKey ? t(saveStore.messageKey) : '';
  workshopUI.render();
  expeditionUI.render();
  const derived = getDerivedStats(state);
  const wave = getWaveConfig(state.combat.wave);
  const encounter = getEncounter(state);
  scene.classList.toggle('encounter-scene', Boolean(encounter));
  const bossTactic = document.getElementById('bossTactic');
  bossTactic.hidden = !encounter;
  if (encounter) bossTactic.textContent = t('boss.tactic', {phase:n(encounter.phaseIndex + 1),name:t(`phase.${encounter.pattern}.${encounter.phaseIndex}`), module:t(`module.${encounter.module}`), damage:n(encounter.damageMultiplier,2)})
    + (encounter.moduleBonus ? t('boss.active') : '') + (encounter.linkBonus ? t('boss.link',{name:t(`link.${encounter.link.id}`)}) : '');
  const skillLinks = document.getElementById('skillLinks');
  skillLinks.hidden = state.prestige.runs < 1;
  if (!skillLinks.hidden) skillLinks.textContent = t('boss.links',{links:getSkillLinks(state).map((link) => t('boss.linkEntry',{name:t(`link.${link.id}`),skills:link.skills.map((id) => t(`skills.${id}`)).join(' + '),count:n(link.count)})).join(' · ')});
  document.getElementById('enemyName').textContent = enemyName(wave);
  document.getElementById('enemyTag').textContent = `${wave.isBoss ? 'BOSS' : 'WAVE'} ${state.combat.wave}`;
  document.getElementById('enemyPanel').classList.toggle('boss', wave.isBoss);
  document.getElementById('enemyHealth').value = Math.max(0, state.combat.asteroidHp) / state.combat.maxAsteroidHp;
  document.getElementById('enemyHpText').textContent = `${n(Math.ceil(Math.max(0, state.combat.asteroidHp)))} / ${n(state.combat.maxAsteroidHp)}`;
  const audible = state.settings.soundEnabled && state.settings.soundVolume > 0;
  document.getElementById('soundBtn').textContent = audible ? '🔊' : '🔇';
  document.getElementById('soundBtn').setAttribute('aria-pressed', String(audible));
  document.getElementById('soundBtn').setAttribute('aria-label', audible ? t('sound.off') : t('sound.on'));
  stats.textContent = [
    t('hud.wave', {value:n(state.combat.wave)}), t('hud.ore', {value:n(Math.floor(state.profile.ore))}),
    t('hud.darkMatter', {value:n(state.profile.darkMatter)}), t('hud.mining', {value:n(derived.miningRate,1)}),
    t('hud.damage', {value:n(derived.combatDps,1)}), t('hud.crit', {value:n(derived.critChance * 100)})
  ].join(' · ');
  parts.textContent = [t('hud.hull',{value:n(state.ship.hull)}), t('hud.engine',{value:n(state.ship.engine)}),
    t('hud.reactor',{value:n(state.ship.reactor)}), t('hud.bestWave',{value:n(state.prestige.bestWave)})].join(' / ');
  loot.textContent = Object.entries(state.loot).map(([key,value]) => t('resource.' + key) + ' ' + n(value)).join(' · ');
  const counts = new Map();
  for (const skill of state.skills) {
    const key = SKILL_POOL.some((entry) => entry.id === skill.id) ? skill.id : skill.name;
    const item = counts.get(key) || {skill, count:0}; item.count++; counts.set(key,item);
  }
  skills.textContent = state.skills.length ? [...counts.values()].map(({skill,count}) => skillName(skill) + ' ×' + n(count)).join(' · ') : t('hud.emptySkills');
  document.getElementById('skillSummary').textContent = t('hud.skillCount',{value:n(state.skills.length)});
  const lastEvent = state.session.lastRewardEvent;
  const message = lastEvent && lastEvent.message === state.session.lastRewardSummary
    ? resultMessage(lastEvent) : state.session.lastRewardSummary || t('hud.idle');
  if (events.textContent !== message) events.textContent = message;
  const gachaCost = getGachaCost(state);
  const prestigeGate = getPrestigeGate(state);
  document.getElementById('gachaBtn').textContent = t('hud.gacha',{cost:n(gachaCost)});
  document.getElementById('gachaBtn').disabled = state.profile.ore < gachaCost || platform.busy;
  document.getElementById('mergeBtn').disabled = state.loot.iron < ECONOMY.mergeIronCost || state.loot.crystal < ECONOMY.mergeCrystalCost || platform.busy;
  document.getElementById('prestigeBtn').disabled = state.combat.wave < prestigeGate || platform.busy;
  document.getElementById('prestigeBtn').textContent = state.combat.wave >= prestigeGate
    ? t('hud.prestigeReward',{value:n(Math.floor(state.combat.wave / 4))}) : t('hud.prestigeGate',{wave:n(prestigeGate)});
  document.getElementById('nextGoal').textContent = state.skills.length === 0 ? t('goal.first')
    : state.ship.engine === 1 ? t('goal.merge') : state.combat.wave < prestigeGate
      ? t('goal.prestige',{wave:n(prestigeGate)}) : t('goal.ready');
  const supply=platform.getRewardedStatus();
  rewardedButton.hidden=!platform.capabilities.rewardedAds;
  rewardedButton.disabled=!supply.ready;
  rewardedButton.textContent=supply.unlocked && supply.ore <= 0 ? t('ads.supplyFull') : !supply.unlocked ? t('ads.supplyLocked')
    : supply.remainingMs > 0 ? t('ads.supplyWait',{seconds:n(Math.ceil(supply.remainingMs/1000))})
      : t('ads.supplyReady',{ore:n(supply.ore)});
}

function renderTutorial(dtMs) {
  const step = tutorial.tick(dtMs);
  tutorialBanner.hidden = !step;
  if ((step?.id || null) === currentTutorialId && tutorialBanner.dataset.locale === i18n.locale) return;
  tutorialBanner.dataset.locale = i18n.locale;
  currentTutorialId = step?.id || null;
  tutorialBanner.textContent = step ? t('tutorial.' + (step.id === 'merge' && state.ship.engine > 1 && !(state.loot.iron >= ECONOMY.mergeIronCost && state.loot.crystal >= ECONOMY.mergeCrystalCost) ? 'merged' : step.id)) : '';
  for (const buttonId of ['gachaBtn', 'mergeBtn', 'prestigeBtn','workshopBtn','claimReadyBtn']) {
    document.getElementById(buttonId).classList.toggle('tutorial-target', step?.targetId === buttonId);
  }
}

function updateLoop(now) {
  const dtMs = Math.min(250, now - lastFrameAt);
  lastFrameAt = now;

  if (document.hidden) {
    requestAnimationFrame(updateLoop);
    return;
  }

  if (!platform.busy) {
    platform.advanceActiveTime(dtMs);
    advanceMining(state, dtMs);
    const clearedWaves = advanceCombat(state, dtMs);
    for (const cleared of clearedWaves) {
      sceneRenderer.burst(cleared.isBoss);
      if (cleared.isBoss) {
        feedback.show({ label: 'BOSS CLEAR', title: t('feedback.boss',{name:enemyName(cleared)}), description: t('feedback.bossLoot',{ore:n(cleared.oreReward)}) + (cleared.bonusLoot.relic ? t('feedback.relic') : ''), rarity: 'boss' });
        audio.play('boss');
      }
    }
    if (!shopDialog.open && !workshopUI.open && !expeditionUI.open && !saveUI.open && !settingsUI.open) {
      feedback.tick(dtMs);
      if (feedback.active) tutorialBanner.hidden = true;
      else renderTutorial(dtMs);
    }
  }
  const blocked=platform.busy || feedback.active || !tutorialBanner.hidden || Boolean(document.querySelector('dialog[open]'));
  if(interstitialWindow.tick(dtMs,{blocked,eligible:platform.canShowInterstitial('prestige')})) {
    audio.suspend();
    platform.showInterstitial('prestige').then(() => {
      lastFrameAt=performance.now();
      renderStore();
    });
  }
  sceneRenderer.draw(state, dtMs, platform.entitlements.supporter);
  if (now - lastHudAt >= 100) {
    renderHud();
    lastHudAt = now;
  }

  if (now - lastSaveAt >= 5000) {
    persistState();
    lastSaveAt = now;
  }

  requestAnimationFrame(updateLoop);
}

document.getElementById('gachaBtn').onclick = () => {
  const before = getDerivedStats(state);
  const result = performGacha(state);
  recordResult(result);
  if (result.ok) {
    const count = state.skills.filter((skill) => skill.id === result.skill.id).length;
    feedback.show({ label: t('feedback.draw',{rarity:result.skill.rarity,count:n(count)}), title: skillName(result.skill), description: describeStatChanges(before, getDerivedStats(state), i18n), rarity: result.skill.rarity });
    audio.play('gacha', { rarity: result.skill.rarity, fromGesture: true });
  }
  persistState();
};

document.getElementById('mergeBtn').onclick = () => {
  const before = getDerivedStats(state);
  const result = performMerge(state);
  recordResult(result);
  if (result.ok) {
    feedback.show({ label: t('feedback.parts',{engine:n(state.ship.engine),reactor:n(state.ship.reactor)}), title: t('feedback.merge'), description: describeStatChanges(before, getDerivedStats(state), i18n) });
    sceneRenderer.burst();
    audio.play('merge', { fromGesture: true });
  }
  persistState();
};

document.getElementById('prestigeBtn').onclick = () => {
  const result = performPrestige(state);
  recordResult(result);
  if (result.ok) {
    feedback.show({ label: 'PRESTIGE', title: t('feedback.voyage'), description: resultMessage(result) + (state.prestige.runs === 1 ? t('feedback.unlock') : '') });
    audio.play('prestige', { fromGesture: true });
    interstitialWindow.enqueue();
  }
  persistState();
};

function renderStore() {
  const container = document.getElementById('products');
  container.replaceChildren();
  document.getElementById('storeStatus').textContent = platform.capabilities.purchases
    ? t('shop.available') : t('shop.unavailable');
  for (const entry of PRODUCTS) {
    const product = platform.products.find((item) => item.id === entry.id);
    const owned = platform.entitlements[entry.entitlement];
    const card = document.createElement('section');
    card.className = 'product';
    const title = document.createElement('h3');
    title.textContent = t('shop.' + entry.entitlement + '.name');
    const description = document.createElement('p');
    description.className = 'stat';
    description.textContent = t('shop.' + entry.entitlement + '.description');
    const button = document.createElement('button');
    button.textContent = owned ? t('shop.owned') : product?.displayPrice || t('shop.appOnly');
    button.disabled = owned || !product || platform.busy;
    button.onclick = () => storeAction(() => platform.purchase(entry.id));
    card.append(title, description, button);
    if (entry.entitlement === 'supporter') {
      for (const color of SUPPORTER_COLORS) {
        const select=document.createElement('button');select.className='alt';
        select.textContent=t(`cosmetics.${color.id}`);
        select.setAttribute('aria-pressed',String(state.settings.supporterColor === color.id));
        select.disabled=!owned || platform.busy;
        select.onclick=() => {
          if (platform.busy || !selectShipColor(state,color.id,platform.entitlements.supporter)) return;
          audio.play('equip',{fromGesture:true});persistState();renderStore();
        };
        card.append(select);
      }
    }
    container.append(card);
  }
  document.getElementById('restoreBtn').disabled = !platform.capabilities.purchases || platform.busy;
  rewardedButton.hidden = !platform.capabilities.rewardedAds;
  leaderboardButton.hidden = !platform.capabilities.gameCenter;
  document.getElementById('privacyOptionsBtn').hidden = !platform.capabilities.privacyOptions;
  document.getElementById('privacyOptionsBtn').disabled = platform.busy;
}

document.getElementById('privacyOptionsBtn').onclick = async () => {
  audio.suspend();
  const pending = platform.showPrivacyOptions();
  renderStore();
  const result = await pending;
  document.getElementById('privacyOptionsMessage').textContent = resultMessage(result);
  renderStore();
};

async function storeAction(action) {
  const promise = action();
  renderStore();
  const result = await promise;
  document.getElementById('shopMessage').textContent = resultMessage(result);
  renderStore();
}

document.getElementById('shopBtn').onclick = () => {
  renderStore();
  shopDialog.showModal();
};
document.getElementById('closeShopBtn').onclick = () => shopDialog.close();
document.getElementById('soundBtn').onclick = () => {
  state.settings.soundEnabled = !(state.settings.soundEnabled && state.settings.soundVolume > 0);
  if (state.settings.soundEnabled && state.settings.soundVolume === 0) state.settings.soundVolume = 0.5;
  audio.sync();
  if (state.settings.soundEnabled) audio.play('gacha', { fromGesture: true });
  else audio.suspend();
  persistState();
  settingsUI.render();
  renderHud();
};
document.getElementById('restoreBtn').onclick = () => storeAction(() => platform.restorePurchases());
rewardedButton.onclick = async () => {
  interstitialWindow.cancel();
  audio.suspend();
  const result = await platform.showRewarded();
  recordResult(result);
  lastFrameAt=performance.now();
  renderHud();
};
leaderboardButton.onclick = async () => {
  const result = await platform.showLeaderboard();
  recordResult(result);
};

addEventListener('resize', resize);
new ResizeObserver(resize).observe(scene);
addEventListener('pagehide', () => {
  interstitialWindow.cancel();
  lifecycle.suspend({ busy: platform.busy });
});
addEventListener('pageshow', () => {
  if (!document.hidden) lifecycle.resume({ busy: platform.busy });
  lastFrameAt = performance.now();
  lastSaveAt = lastFrameAt;
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    interstitialWindow.cancel();
    audio.suspend();
    lifecycle.suspend({ busy: platform.busy });
  } else {
    lifecycle.resume({ busy: platform.busy });
    lastFrameAt = performance.now();
    lastSaveAt = lastFrameAt;
    platform.initialize().then(renderStore);
  }
});

i18n.subscribe(() => {
  for (const id of ['shopMessage','privacyOptionsMessage','expeditionMessage','workshopMessage']) document.getElementById(id).textContent='';
  i18n.apply();
  settingsUI.render();
  renderStore();
  renderHud();
});
i18n.apply();
resize();
renderStore();
renderHud();
platform.initialize().then(renderStore);
requestAnimationFrame(updateLoop);
