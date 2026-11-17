// Shared normalization for saves and UI; no browser or game-state dependency.
export const SUPPORTED_LOCALES = Object.freeze(['ko', 'en', 'ja']);
export function normalizeLocale(value) {
  if (typeof value !== 'string') return null;
  const code = value.toLowerCase().split(/[-_]/)[0];
  return SUPPORTED_LOCALES.includes(code) ? code : null;
}
export function detectLocale(languages = []) {
  for (const language of languages) {
    const locale = normalizeLocale(language);
    if (locale) return locale;
  }
  return 'en';
}
