import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { createI18n, catalogs } from '../web-prototype/i18n/index.js';
import { detectLocale, normalizeLocale } from '../web-prototype/i18n/locale.js';
import { createInitialState, hydrateState } from '../web-prototype/game/state.js';
import { parseSave, serializeState } from '../web-prototype/game/storage.js';
import { getDerivedStats, advanceCombat, advanceMining } from '../web-prototype/game/systems.js';
import { SKILL_POOL } from '../web-prototype/game/balance.js';
import { BOSS_PATTERNS, SKILL_LINKS } from '../web-prototype/game/encounters.js';
import { formatResult } from '../web-prototype/i18n/result.js';
import { upgradeWorkshop, selectWorkshopModule } from '../web-prototype/game/workshop.js';
import { ROUTES, claimRoute, equipRoute, trackRoute } from '../web-prototype/game/routes.js';
import { MILESTONES, CONTRACTS, claimExpeditionReward } from '../web-prototype/game/expeditions.js';
import { createPlatformServices } from '../web-prototype/platform/services.js';
import { createSaveStore, BACKUP_KEY } from '../web-prototype/game/storage.js';
import { SAVE_KEY } from '../web-prototype/game/state.js';
import { applyOfflineProgress } from '../web-prototype/game/systems.js';

const keys = Object.keys(catalogs.en).sort();
const params = (value) => [...new Set([...value.matchAll(/\{([A-Za-z][\w]*)\}/g)].map((match) => match[1]))].sort();
for (const [locale, messages] of Object.entries(catalogs)) {
  assert.deepEqual(Object.keys(messages).sort(), keys, `Missing/extra keys: ${locale}`);
  for (const key of keys) {
    assert.equal(typeof messages[key], 'string');
    assert.ok(messages[key].trim(), `${locale}:${key} is blank`);
    assert.deepEqual(params(messages[key]), params(catalogs.en[key]), `${locale}:${key} placeholders`);
  }
}
for (const skill of SKILL_POOL) assert.ok(catalogs.en[`skills.${skill.id}`]);
for (const pattern of BOSS_PATTERNS) {
  assert.ok(catalogs.en[`enemy.${pattern.id}`]);
  for (const [index] of pattern.phases.entries()) assert.ok(catalogs.en[`phase.${pattern.id}.${index}`]);
}
for (const link of SKILL_LINKS) assert.ok(catalogs.en[`link.${link.id}`]);
for (const entry of [...MILESTONES,...CONTRACTS]) assert.ok(catalogs.en[`exp.${entry.id}.name`]);
for (const route of ROUTES) {
  for (const field of route.metric === 'campaignClaims' ? ['name','description'] : ['name','title','description','motto']) {
    assert.ok(catalogs.en[`routes.${route.id}.${field}`]);
  }
}
assert.equal(normalizeLocale('JA-jp'), 'ja');
for (const invalid of [null, {}, [], 1, '__proto__', 'fr']) assert.equal(normalizeLocale(invalid), null);
assert.equal(detectLocale(['fr-FR','ja-JP','en-US']), 'ja');
assert.equal(detectLocale(['fr-FR']), 'en');
const i18n = createI18n({languages:['ja-JP']});
assert.equal(i18n.locale, 'ja');
i18n.setLocale('ko'); assert.equal(i18n.locale, 'ko');
i18n.setLocale(null); assert.equal(i18n.locale, 'ja');
const fallback = createI18n({preference:'ja', messages:{en:{test:'Hello {name}'},ja:{}}});
assert.equal(fallback.t('test',{name:'<b>$&</b>'}), 'Hello <b>$&</b>');
assert.equal(fallback.t('unknown'), 'unknown');
assert.equal(fallback.t('test'), 'Hello {name}');
let notifications = 0;
const stop = i18n.subscribe(() => notifications++);
i18n.setLocale('en'); stop(); i18n.setLocale('ja'); assert.equal(notifications, 1);
assert.equal(i18n.number(1234.5,{minimumFractionDigits:1}), new Intl.NumberFormat('ja',{minimumFractionDigits:1}).format(1234.5));

// Real DOM bindings use textContent, never innerHTML, including interpolated values.
const text = {dataset:{i18n:'nav.shop'}};
const label = {dataset:{i18nAriaLabel:'nav.health'},setAttribute(key,value) {this[key]=value;}};
const root = {documentElement:{},querySelectorAll(selector) {return selector === '[data-i18n]' ? [text] : [label];}};
i18n.apply(root);
assert.equal(text.textContent,catalogs.ja['nav.shop']);
assert.equal(label['aria-label'],catalogs.ja['nav.health']);
assert.equal(root.documentElement.lang,'ja');

const html = await readFile(new URL('../web-prototype/index.html',import.meta.url),'utf8');
for (const [,key] of html.matchAll(/data-i18n(?:-aria-label)?="([^"]+)"/g)) assert.ok(catalogs.en[key], `HTML key: ${key}`);
assert.ok(!/<option[^>]*>\s*<span/.test(html), 'Options must remain text-only');
for (const dir of ['ui','i18n']) {
  for (const name of await readdir(new URL(`../web-prototype/${dir}/`,import.meta.url))) {
    if (!name.endsWith('.js')) continue;
    const source = await readFile(new URL(`../web-prototype/${dir}/${name}`,import.meta.url),'utf8');
    for (const [,key] of source.matchAll(/\bt\('([^']+)'\s*[,)]/g)) assert.ok(catalogs.en[key], `${name}:${key}`);
  }
}
const app = await readFile(new URL('../web-prototype/app.js',import.meta.url),'utf8');
for (const [,key] of app.matchAll(/\bt\('([^']+)'\s*[,)]/g)) assert.ok(catalogs.en[key], `app:${key}`);

assert.equal(hydrateState({settings:{locale:'fr'}}).settings.locale,null);
assert.equal(hydrateState({settings:{locale:'en-US'}}).settings.locale,'en');
assert.equal(hydrateState({}).settings.locale,null);
const baseline = createInitialState();
for (const locale of ['ko','en','ja']) {
  const state = hydrateState(baseline);
  state.settings.locale = locale;
  assert.equal(parseSave(serializeState(state)).settings.locale,locale);
  const reference = hydrateState(baseline);
  for (const candidate of [state, reference]) {advanceMining(candidate,10000); advanceCombat(candidate,10000,()=>0.1);}
  assert.deepEqual(getDerivedStats(state),getDerivedStats(reference));
  assert.deepEqual(state.combat,reference.combat);
  assert.deepEqual(state.profile,reference.profile);
}

// Exercise actual result contracts rather than testing catalog strings in isolation.
const results = [];
const locked = createInitialState();
results.push(upgradeWorkshop(locked,'research','unknown'), upgradeWorkshop(locked,'module','drill'));
results.push(selectWorkshopModule(locked,'drill'),claimRoute(locked,'sector-25'),claimExpeditionReward(locked,'milestone','first-rebirth'));
const active = createInitialState(); active.prestige.runs = 5;
results.push(upgradeWorkshop(active,'module','drill'),selectWorkshopModule(active,'drill'));
active.loot.plasma = 100; active.loot.relic = 100;
results.push(upgradeWorkshop(active,'module','drill'),selectWorkshopModule(active,'drill'),selectWorkshopModule(active,null));
active.ship.workshop.switchRemainingMs = 0;
results.push(selectWorkshopModule(active,null), selectWorkshopModule(active,'drill'));
for (let i=0; i<4; i++) results.push(upgradeWorkshop(active,'module','drill'));
results.push(upgradeWorkshop(active,'research','res_launch_03'));
results.push(claimExpeditionReward(active,'milestone','first-rebirth'),claimExpeditionReward(active,'milestone','first-rebirth'));
results.push(claimExpeditionReward(active,'contract','boss-hunt'),claimRoute(active,'sector-25'),equipRoute(active,'sector-25'));
active.prestige.bestWave = 25;
results.push(claimRoute(active,'sector-25'),claimRoute(active,'sector-25'),equipRoute(active,'sector-25'),equipRoute(active,null));
results.push(trackRoute(active,'bad'),trackRoute(active,'sector-25'),trackRoute(active,null));
const browser = createPlatformServices({state:active,persist:()=>{}});
results.push(await browser.initialize(),await browser.purchase('bad'),await browser.showRewarded(),await browser.showPrivacyOptions());
for (const duration of [5000,65_000,3600_000,3660_000]) {
  const away=createInitialState(); away.profile.lastSeenAt=1000;
  applyOfflineProgress(away,1000+duration); results.push(away.session.lastRewardEvent);
}
const battle=createInitialState();
advanceCombat(battle,200_000,()=>0.1); results.push(battle.session.lastRewardEvent);
for (const result of results) {
  assert.ok(catalogs.en[result.messageKey], `Missing result key: ${result.messageKey}`);
  for (const key of Object.values(result.messageParamKeys || {})) assert.ok(catalogs.en[key],key);
  const original=structuredClone(result);
  for (const locale of ['ko','en','ja']) {
    const text=formatResult(createI18n({preference:locale}),result);
    assert.ok(text && !/\{\w+\}/.test(text),text);
    if(locale!=='ko') assert.ok(!/[가-힣]/.test(text),`${locale}: ${text}`);
  }
  assert.deepEqual(result,original,'Rendering must not mutate action results');
}
// A version error uses a stable code, and still blocks overwrite of a newer save.
const data=new Map([[SAVE_KEY,JSON.stringify({format:'auto-drill-galaxy',version:99})],[BACKUP_KEY,serializeState(active)]]);
const store=createSaveStore(()=>({getItem:(key)=>data.get(key),setItem:(key,value)=>data.set(key,value)}));
store.load();assert.equal(store.messageKey,'save.blockedVersion');assert.equal(store.save(active),false);
assert.equal(JSON.parse(data.get(SAVE_KEY)).version,99);
for (const [text,key] of [['{','save.invalidFormat'],['{}','save.notGame'],['x'.repeat(2_000_001),'save.invalidSize'],[JSON.stringify({format:'auto-drill-galaxy',version:99}),'save.unsupportedVersion']]) {
  assert.throws(()=>parseSave(text),(error)=>error.messageKey===key);
}
assert.equal(formatResult(createI18n({preference:'en'}),null),'');
console.log(`i18n checks passed: ${keys.length} keys × 3 locales, placeholders, bindings, localized results/errors, save protection and economy independence.`);
