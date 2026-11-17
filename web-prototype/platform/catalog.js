export const PRODUCTS = [
  {
    id: 'autodrill.remove_ads',
    entitlement: 'removeAds',
    name: '광고 제거',
    description: '자동 전면 광고를 영구 제거합니다. 보상형 광고는 선택해서 이용할 수 있습니다.',
    type: 'non-consumable'
  },
  {
    id: 'autodrill.supporter',
    entitlement: 'supporter',
    name: '갤럭시 서포터',
    description: '함선 전용 색상 3종을 영구 해금합니다. 능력치 변화 없이 무료 항로 외형과 함께 사용할 수 있습니다.',
    type: 'non-consumable'
  }
];

export const AD_POLICY = {
  rewardedCooldownMs: 300000,
  rewardedMiningSeconds: 120,
  rewardedGachaFraction: 0.20,
  interstitialFirstDelayMs: 600000,
  interstitialCooldownMs: 480000,
  interstitialSessionLimit: 2,
  interstitialAfterRewardedMs: 120000,
  interstitialRetryMs: 60000,
  interstitialPlacement: 'prestige'
};
