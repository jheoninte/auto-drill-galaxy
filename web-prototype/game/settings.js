import { normalizeLocale } from '../i18n/locale.js';
import { normalizeSupporterColor } from './cosmetics.js';

export const createSettings = () => ({ soundEnabled: false, soundVolume: 0.5, reduceMotion: false, locale: null, supporterColor:'violet' });

export function hydrateSettings(raw) {
  return { soundEnabled: raw?.soundEnabled === true,
    soundVolume: typeof raw?.soundVolume === 'number' && Number.isFinite(raw.soundVolume)
      ? Math.max(0, Math.min(1, raw.soundVolume)) : 0.5,
    reduceMotion: raw?.reduceMotion === true,
    locale: normalizeLocale(raw?.locale), supporterColor:normalizeSupporterColor(raw?.supporterColor) };
}

export const shouldReduceMotion = (settings, systemReduced) => Boolean(systemReduced || settings.reduceMotion);
