import { CAMPAIGN, missionProgress, currentMission, claimCampaign } from './campaign.js';
import { MILESTONES, CONTRACTS, isExpeditionUnlocked, getMilestoneProgress, claimExpeditionReward } from './expeditions.js';

// Preview only the contiguous completed campaign prefix. No auto spending or equipping.
export function getReadyRewardCount(state) {
  let count = 0;
  for (const entry of CAMPAIGN.slice(state.prestige.campaign.claimed.length)) {
    if (!missionProgress(state, entry).complete) break;
    count++;
  }
  if (!isExpeditionUnlocked(state)) return count;
  const exp = state.prestige.expeditions;
  count += MILESTONES.filter((entry) => !exp.claimed.includes(entry.id) && getMilestoneProgress(state, entry) >= entry.target).length;
  count += CONTRACTS.filter((entry) => !exp.contractClaimed.includes(entry.id) && exp.contractProgress[entry.id] >= entry.target).length;
  return count;
}

export function claimReadyRewards(state) {
  let count = 0;
  // Recheck every claim through the same guards as individual buttons.
  for (let i = 0; i < CAMPAIGN.length; i++) {
    const entry = currentMission(state);
    if (!entry || !claimCampaign(state, entry.id).ok) break;
    count++;
  }
  for (const [kind, entries] of [['milestone', MILESTONES], ['contract', CONTRACTS]]) {
    for (const entry of entries) if (claimExpeditionReward(state, kind, entry.id).ok) count++;
  }
  return { ok: count > 0, messageKey: count ? 'rewards.claimed' : 'rewards.none', messageParams: {count} };
}
