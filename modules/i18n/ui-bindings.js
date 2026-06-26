import { i18n } from './dictionary.js';

let currentLang = 'en';

/**
 * Apply the selected language to every element tagged with data-i18n-key.
 * Also handles data-i18n-placeholder for input placeholder text.
 * Add data-i18n-key="<key>" to any new UI element; no further JS changes needed.
 */
export function setLanguage(lang) {
  if (!i18n[lang]) {
    console.warn(`i18n: unknown language "${lang}", falling back to "en"`);
    lang = 'en';
  }
  currentLang = lang;
  const dict = i18n[lang];

  document.querySelectorAll('[data-i18n-key]').forEach(el => {
    const key = el.getAttribute('data-i18n-key');
    if (key in dict) {
      el.textContent = dict[key];
    } else {
      console.warn(`i18n: missing key "${key}" for lang "${lang}"`);
    }
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (key in dict) {
      el.placeholder = dict[key];
    } else {
      console.warn(`i18n: missing placeholder key "${key}" for lang "${lang}"`);
    }
  });

  document.documentElement.setAttribute('lang', lang);
}

export function t(key) {
  const dict = i18n[currentLang] || i18n['en'];
  if (!(key in dict)) {
    console.warn(`i18n: missing key "${key}" for lang "${currentLang}"`);
    return key;
  }
  return dict[key];
}

export function getCurrentLang() {
  return currentLang;
}
