import assert from 'node:assert/strict';
import { createInitialState, hydrateState } from '../web-prototype/game/state.js';
import { createPlatformServices } from '../web-prototype/platform/services.js';
import { getDerivedStats } from '../web-prototype/game/systems.js';
import { AD_POLICY, PRODUCTS } from '../web-prototype/platform/catalog.js';

let clock = 1000000;
let saves = 0;
let interstitials = 0;
let rewardResult = { rewardEarned: false };
let purchaseResult = { status: 'cancelled' };
let restoredEntitlements = { removeAds: false, supporter: false };
const state = createInitialState();
state.prestige.runs=1;
const rewardOre=getDerivedStats(state).miningRate*AD_POLICY.rewardedMiningSeconds;
const provider = {
  async initialize() {
    return {
      capabilities: { purchases: true, rewardedAds: true, interstitialAds: true, gameCenter: false },
      entitlements: restoredEntitlements,
      consent: { canRequestAds: true, privacyOptionsRequired: false }
    };
  },
  async getProducts() { return { products: PRODUCTS.map((product) => ({ id: product.id, displayPrice: 'TEST PRICE' })) }; },
  async purchase() { return purchaseResult; },
  async restorePurchases() { return { verified: true, entitlements: restoredEntitlements }; },
  async showRewarded() { return rewardResult; },
  async showInterstitial() { interstitials += 1; return { shown: true }; }
};
const services = createPlatformServices({ state, provider, persist: () => { saves += 1; }, now: () => clock });
const browser = createPlatformServices({ state, persist: () => {} });
assert.equal((await browser.initialize()).ok, false);
assert.equal((await browser.purchase(PRODUCTS[0].id)).ok, false);
assert.equal((await browser.showRewarded()).ok, false);
assert.equal(state.profile.ore, 0);
assert.equal((await services.initialize()).ok, true);
assert.equal(services.products.length, 2);

assert.equal((await services.purchase(PRODUCTS[0].id)).ok, false);
purchaseResult = { status: 'pending' };
assert.equal((await services.purchase(PRODUCTS[0].id)).ok, false);
purchaseResult = { status: 'purchased', verified: false, entitlements: { removeAds: true } };
assert.equal((await services.purchase(PRODUCTS[0].id)).ok, false);
assert.equal(services.entitlements.removeAds, false);
purchaseResult = { status: 'purchased', verified: true, entitlements: { supporter: true } };
assert.equal((await services.purchase(PRODUCTS[0].id)).ok, false);
assert.equal(services.entitlements.removeAds, false);

assert.equal((await services.showRewarded()).ok, false);
assert.equal(state.profile.ore, 0);
rewardResult = { rewardEarned: true, rewardId: 'impression-1' };
assert.equal((await services.showRewarded()).ok, true);
assert.equal(state.profile.ore, rewardOre);
assert.equal(saves, 1);
assert.equal((await services.showRewarded()).ok, false);
clock += AD_POLICY.rewardedCooldownMs;
assert.equal((await services.showRewarded()).ok, false);
assert.equal(state.profile.ore, rewardOre);
rewardResult = { rewardEarned: true, rewardId: 'impression-2' };
assert.equal((await services.showRewarded()).ok, true);
assert.equal(state.profile.ore, rewardOre*2);
assert.deepEqual(hydrateState(JSON.parse(JSON.stringify(state))).monetization, state.monetization);

clock += AD_POLICY.interstitialAfterRewardedMs;
services.advanceActiveTime(AD_POLICY.interstitialFirstDelayMs);
assert.equal((await services.showInterstitial('combat')).skipped, true);
assert.equal((await services.showInterstitial('prestige')).ok, true);
assert.equal((await services.showInterstitial('prestige')).skipped, true);
purchaseResult = { status: 'purchased', verified: true, entitlements: { removeAds: true, supporter: true } };
assert.equal((await services.purchase(PRODUCTS[0].id)).ok, true);
assert.equal(services.entitlements.removeAds, true);
clock += AD_POLICY.interstitialCooldownMs;
assert.equal((await services.showInterstitial('prestige')).skipped, true);
assert.equal(interstitials, 1);
restoredEntitlements = { removeAds: true, supporter: true };
assert.equal((await services.restorePurchases()).ok, true);
assert.equal(state.profile.ore, rewardOre*2);

const early = createPlatformServices({ state: createInitialState(), provider, persist: () => {}, now: () => clock });
await early.initialize();
assert.equal((await early.showInterstitial('prestige')).skipped, true);

let finishAd;
provider.showRewarded = () => new Promise((resolve) => { finishAd = resolve; });
const pending = services.showRewarded();
assert.equal(services.busy, true);
assert.equal((await services.showRewarded()).ok, false);
finishAd({ rewardEarned: false });
await pending;
assert.equal(services.busy, false);
provider.showRewarded = async () => { throw new Error('no fill'); };
assert.equal((await services.showRewarded()).ok, false);
assert.equal(services.busy, false);
assert.equal(state.profile.ore, rewardOre*2);

// UMP results come from native memory, never the game save or an invented browser form.
assert.equal((await browser.showPrivacyOptions()).ok, false);
let privacyResult = {shown:true,consent:{canRequestAds:false,privacyOptionsRequired:true}};
const privacyProvider = {
  ...provider,
  async initialize() { return {capabilities:{rewardedAds:true,interstitialAds:true,privacyOptions:true},consent:{canRequestAds:true,privacyOptionsRequired:true}}; },
  async showPrivacyOptions() { return privacyResult; }
};
const privacy = createPlatformServices({state:createInitialState(),provider:privacyProvider,persist:()=>{}});
await privacy.initialize();
assert.equal(privacy.capabilities.rewardedAds, true);
assert.equal((await privacy.showPrivacyOptions()).ok, true);
assert.equal(privacy.capabilities.rewardedAds, false);
assert.equal(privacy.capabilities.interstitialAds, false);
assert.equal(privacy.capabilities.privacyOptions, true);
assert.equal((await privacy.showRewarded()).ok, false);
privacyResult = {shown:true,consent:{canRequestAds:true,privacyOptionsRequired:true}};
await privacy.showPrivacyOptions();
assert.equal(privacy.capabilities.rewardedAds, true);
privacyProvider.showPrivacyOptions = async () => { throw new Error('form unavailable'); };
assert.equal((await privacy.showPrivacyOptions()).ok, false);
assert.equal(privacy.capabilities.rewardedAds, false);
assert.equal(privacy.capabilities.privacyOptions, true);
const unknownConsent = createPlatformServices({state:createInitialState(),provider:{async initialize(){return {capabilities:{rewardedAds:true,interstitialAds:true}};}},persist:()=>{}});
await unknownConsent.initialize();
assert.equal(unknownConsent.capabilities.rewardedAds, false);

console.log('Platform checks passed: unavailable services, purchase cancellation/pending/verification, restore, earned-only rewards, cooldown, duplicate prevention, concurrency, ad failure and ad removal.');
