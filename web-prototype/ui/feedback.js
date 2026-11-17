import { createI18n } from '../i18n/index.js';

export function describeStatChanges(before, after, i18n = createI18n({ preference: 'ko' })) {
  const changes = [];
  const mining = after.miningRate - before.miningRate;
  const damage = after.combatDps - before.combatDps;
  const crit = (after.critChance - before.critChance) * 100;
  const fixed = (value) => i18n.number(value, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  if (mining > 0.0001) changes.push(i18n.t('feedback.mining', { value: fixed(mining) }));
  if (damage > 0.0001) changes.push(i18n.t('feedback.damage', { value: fixed(damage) }));
  if (crit > 0.0001) changes.push(i18n.t('feedback.crit', { value: fixed(crit) }));
  return changes.join(' · ') || i18n.t('feedback.cap');
}

export function createRewardFeedback(element) {
  let remainingMs = 0;
  return {
    get active() { return remainingMs > 0; },
    show({ label, title, description, rarity = 'upgrade' }) {
      element.dataset.rarity = rarity;
      element.querySelector('.reward-label').textContent = label;
      element.querySelector('.reward-title').textContent = title;
      element.querySelector('.reward-description').textContent = description;
      element.hidden = false;
      remainingMs = 4500;
    },
    tick(dtMs) {
      if (remainingMs <= 0) return;
      remainingMs -= dtMs;
      if (remainingMs <= 0) element.hidden = true;
    }
  };
}
