import ko from './locales/ko.json' with { type: 'json' };
import en from './locales/en.json' with { type: 'json' };
import ja from './locales/ja.json' with { type: 'json' };
import { normalizeLocale, detectLocale } from './locale.js';

export const catalogs = { ko, en, ja };
export function createI18n({ preference = null, languages = [], messages = catalogs } = {}) {
  let selected = normalizeLocale(preference);
  let locale = selected || detectLocale(languages);
  const listeners = new Set();
  const formats = new Map();
  return {
    get locale() { return locale; },
    get preference() { return selected; },
    setLocale(value) {
      selected = normalizeLocale(value);
      locale = selected || detectLocale(languages);
      for (const listener of listeners) listener(locale);
    },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    t(key, params = {}) {
      const template = messages[locale]?.[key] ?? messages.en?.[key] ?? key;
      return template.replace(/\{([A-Za-z][\w]*)\}/g, (match, name) => Object.hasOwn(params, name) ? String(params[name]) : match);
    },
    number(value, options = {}) {
      const cacheKey = `${locale}:${JSON.stringify(options)}`;
      if (!formats.has(cacheKey)) formats.set(cacheKey, new Intl.NumberFormat(locale, options));
      return formats.get(cacheKey).format(value);
    },
    apply(root = document) {
      const html = root.documentElement;
      if (html) { html.lang = locale; html.dir = 'ltr'; }
      for (const element of root.querySelectorAll('[data-i18n]')) element.textContent = this.t(element.dataset.i18n);
      for (const element of root.querySelectorAll('[data-i18n-aria-label]')) element.setAttribute('aria-label', this.t(element.dataset.i18nAriaLabel));
    }
  };
}
