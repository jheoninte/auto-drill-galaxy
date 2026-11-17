import { AD_POLICY, PRODUCTS } from './catalog.js';
import { getDerivedStats } from '../game/systems.js';
import { isWorkshopUnlocked } from '../game/workshop.js';
import { getGachaCost } from '../game/balance.js';

const unavailable = () => ({ ok: false, messageKey: 'platform.unavailable', message: '이 기능은 앱 버전에서 지원합니다.' });

export function createPlatformServices({ state, provider = null, persist, now = Date.now, policy = AD_POLICY }) {
  let busy = false;
  let products = [];
  let entitlements = { removeAds: false, supporter: false };
  let nativeCapabilities = {};
  let consent = { canRequestAds: false, privacyOptionsRequired: false };
  let capabilities = { purchases: false, rewardedAds: false, interstitialAds: false, gameCenter: false, privacyOptions: false };
  let activeMs = 0;
  let lastInterstitialAt = -Infinity;
  let lastInterstitialAttemptAt = -Infinity;
  let interstitialsShown = 0;

  function getRewardedStatus() {
    const hasReward = state.monetization.lastRewardedAt > 0 || state.monetization.rewardIds.length > 0;
    const remainingMs = hasReward ? Math.max(0, state.monetization.lastRewardedAt + policy.rewardedCooldownMs - now()) : 0;
    const unlocked = isWorkshopUnlocked(state);
    const ore = Math.max(0,Math.min(Math.floor(Number.MAX_SAFE_INTEGER-state.profile.ore),Math.floor(Math.max(
      getDerivedStats(state).miningRate * policy.rewardedMiningSeconds, getGachaCost(state) * policy.rewardedGachaFraction))));
    return {unlocked, remainingMs, ore, ready:unlocked && ore > 0 && remainingMs === 0 && capabilities.rewardedAds && !busy};
  }

  function canShowInterstitial(placement) {
    const recentReward = state.monetization.lastRewardedAt > 0 || state.monetization.rewardIds.length > 0;
    return capabilities.interstitialAds && !entitlements.removeAds && !busy
      && placement === policy.interstitialPlacement && activeMs >= policy.interstitialFirstDelayMs
      && interstitialsShown < policy.interstitialSessionLimit
      && activeMs - lastInterstitialAt >= policy.interstitialCooldownMs
      && activeMs - lastInterstitialAttemptAt >= policy.interstitialRetryMs
      && (!recentReward || now() - state.monetization.lastRewardedAt >= policy.interstitialAfterRewardedMs);
  }

  function updateEntitlements(value) {
    entitlements = { removeAds: value?.removeAds === true, supporter: value?.supporter === true };
  }

  function refreshCapabilities() {
    capabilities = {
      purchases: nativeCapabilities.purchases === true,
      rewardedAds: nativeCapabilities.rewardedAds === true && consent.canRequestAds,
      interstitialAds: nativeCapabilities.interstitialAds === true && consent.canRequestAds,
      gameCenter: nativeCapabilities.gameCenter === true,
      privacyOptions: nativeCapabilities.privacyOptions === true && consent.privacyOptionsRequired
    };
  }

  async function exclusive(action) {
    if (busy) return { ok: false, messageKey: 'platform.busy', message: '진행 중인 요청이 있습니다.' };
    busy = true;
    try {
      return await action();
    } catch {
      return { ok: false, messageKey: 'platform.connection', message: '연결을 확인한 뒤 다시 시도해 주세요.' };
    } finally {
      busy = false;
    }
  }

  return {
    get busy() { return busy; },
    get entitlements() { return { ...entitlements }; },
    get capabilities() { return { ...capabilities }; },
    get products() { return products.map((product) => ({ ...product })); },
    getRewardedStatus,
    canShowInterstitial,
    advanceActiveTime(dtMs) {
      if (!busy && Number.isFinite(dtMs) && dtMs > 0) activeMs = Math.min(Number.MAX_SAFE_INTEGER, activeMs + dtMs);
    },

    async initialize() {
      if (!provider) return unavailable();
      return exclusive(async () => {
        const result = await provider.initialize();
        nativeCapabilities = result.capabilities || {};
        consent = { canRequestAds: result.consent?.canRequestAds === true, privacyOptionsRequired: result.consent?.privacyOptionsRequired === true };
        refreshCapabilities();
        updateEntitlements(result.entitlements);
        if (capabilities.purchases) {
          const response = await provider.getProducts({ productIds: PRODUCTS.map((product) => product.id) });
          products = (Array.isArray(response.products) ? response.products : []).filter((product) =>
            PRODUCTS.some((entry) => entry.id === product.id) && typeof product.displayPrice === 'string'
          );
        }
        return { ok: true, messageKey: 'platform.ready', message: '앱 서비스가 준비되었습니다.' };
      });
    },

    async showPrivacyOptions() {
      if (!capabilities.privacyOptions || typeof provider?.showPrivacyOptions !== 'function') return unavailable();
      return exclusive(async () => {
        consent.canRequestAds = false;
        refreshCapabilities();
        const result = await provider.showPrivacyOptions();
        if (result.shown !== true || typeof result.consent?.canRequestAds !== 'boolean' || typeof result.consent?.privacyOptionsRequired !== 'boolean') {
          return { ok: false, messageKey: 'platform.privacyFailed', message: '개인정보 선택을 확인하지 못했습니다. 다시 시도해 주세요.' };
        }
        consent = { canRequestAds: result.consent.canRequestAds, privacyOptionsRequired: result.consent.privacyOptionsRequired };
        refreshCapabilities();
        return { ok: true, messageKey: 'platform.privacyUpdated', message: '개인정보 선택을 업데이트했습니다.' };
      });
    },

    async purchase(productId) {
      if (!capabilities.purchases || !products.some((product) => product.id === productId)) return unavailable();
      if (entitlements[PRODUCTS.find((product) => product.id === productId).entitlement]) {
        return { ok: false, messageKey: 'platform.owned', message: '이미 보유한 상품입니다.' };
      }
      return exclusive(async () => {
        const result = await provider.purchase({ productId });
        if (result.status === 'pending') return { ok: false, messageKey: 'platform.pending', message: '구매 승인을 기다리고 있습니다.' };
        if (result.status !== 'purchased' || result.verified !== true) {
          return { ok: false, messageKey: 'platform.purchaseIncomplete', message: '구매가 완료되지 않았습니다.' };
        }
        const entitlement = PRODUCTS.find((product) => product.id === productId).entitlement;
        if (result.entitlements?.[entitlement] !== true) {
          return { ok: false, messageKey: 'platform.unverified', message: '구매 권한을 확인하지 못했습니다. 구매 복원을 시도해 주세요.' };
        }
        updateEntitlements(result.entitlements);
        return { ok: true, messageKey: 'platform.purchased', message: '구매가 완료되었습니다.' };
      });
    },

    async restorePurchases() {
      if (!capabilities.purchases) return unavailable();
      return exclusive(async () => {
        const result = await provider.restorePurchases();
        if (result.verified !== true) return { ok: false, messageKey: 'platform.restoreFailed', message: '구매 내역을 확인하지 못했습니다.' };
        updateEntitlements(result.entitlements);
        return { ok: true, messageKey: 'platform.restored', message: '구매 내역을 복원했습니다.' };
      });
    },

    async showRewarded() {
      if (!capabilities.rewardedAds) return unavailable();
      const status = getRewardedStatus();
      if (!status.unlocked) return {ok:false,messageKey:'ads.supplyLocked',message:'첫 파츠 합성 후 보급품을 이용할 수 있습니다.'};
      if (status.ore <= 0) return {ok:false,messageKey:'ads.supplyFull',message:'광석 보유 한도에 도달했습니다.'};
      if (status.remainingMs > 0) {
        return { ok: false, messageKey: 'platform.rewardWait', messageParams:{seconds:Math.ceil(status.remainingMs/1000)}, message: '보급품 대기 중입니다.' };
      }
      // Fix the rate at the user's request, before the SDK opens.
      const ore = status.ore;
      return exclusive(async () => {
        const result = await provider.showRewarded({ placement: 'supply' });
        if (result.rewardEarned !== true || typeof result.rewardId !== 'string' || !result.rewardId) {
          return { ok: false, messageKey: 'platform.rewardMissing', message: '광고 보상이 지급되지 않았습니다.' };
        }
        if (state.monetization.rewardIds.includes(result.rewardId)) {
          return { ok: false, messageKey: 'platform.rewardDuplicate', message: '이미 지급된 보상입니다.' };
        }
        state.profile.ore = Math.min(Number.MAX_SAFE_INTEGER,state.profile.ore+ore);
        state.profile.totalOreMined = Math.min(Number.MAX_SAFE_INTEGER,state.profile.totalOreMined+ore);
        state.monetization.lastRewardedAt = now();
        state.monetization.rewardIds = [...state.monetization.rewardIds, result.rewardId].slice(-100);
        persist(state);
        return { ok: true, messageKey:'platform.rewarded', messageParams:{ore:Math.floor(ore)}, message: `보급품 수령: 광석 +${Math.floor(ore)}` };
      });
    },

    async showInterstitial(placement) {
      if (!canShowInterstitial(placement)) return {ok:false,skipped:true};
      return exclusive(async () => {
        lastInterstitialAttemptAt = activeMs;
        const result = await provider.showInterstitial({ placement });
        if (result.shown === true) { lastInterstitialAt = activeMs; interstitialsShown++; }
        return { ok: result.shown === true };
      });
    },

    async showLeaderboard() {
      if (!capabilities.gameCenter) return unavailable();
      return exclusive(async () => {
        const result = await provider.showLeaderboard();
        return { ok: result.shown === true, messageKey:result.shown === true ? 'platform.leaderboard' : 'platform.signIn', message: result.shown === true ? '리더보드를 열었습니다.' : '로그인 상태를 확인해 주세요.' };
      });
    }
  };
}
