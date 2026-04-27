/**
 * i18n - Internationalization module for Pro Badminton
 * Supports: EN (English), TH (Thai), ZH (Chinese)
 */
const I18n = (() => {
  const SUPPORTED_LANGS = new Set(['en', 'th', 'zh']);
  const STORAGE_KEY = 'probadminton_lang';
  let currentLang = localStorage.getItem(STORAGE_KEY) || 'en';
  let translations = {};
  let loaded = false;

  async function loadTranslations(lang) {
    if (!SUPPORTED_LANGS.has(lang)) lang = 'en';
    try {
      const res = await fetch(`/locales/${lang}.json`);
      if (!res.ok) throw new Error(`Failed to load ${lang} translations`);
      translations = await res.json();
      currentLang = lang;
      localStorage.setItem(STORAGE_KEY, lang);
      loaded = true; // eslint-disable-line no-unused-vars
    } catch (err) {
      console.error('[i18n] Load failed:', err);
      if (lang !== 'en') await loadTranslations('en');
    }
  }

  function t(key) {
    const keys = key.split('.');
    let val = translations;
    for (const k of keys) {
      if (val && typeof val === 'object' && k in val) {
        val = val[k];
      } else {
        return key; // fallback: return the key itself
      }
    }
    return val;
  }

  function translatePage() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      const translated = t(key);
      if (translated !== key) {
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          el.placeholder = translated;
        } else {
          el.textContent = translated;
        }
      }
    });
    // Update lang picker active state
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === currentLang);
    });
  }

  function getLang() { return currentLang; }

  async function setLang(lang) {
    await loadTranslations(lang);
    translatePage();
  }

  async function init() {
    await loadTranslations(currentLang);
    translatePage();
  }

  // Auto-init on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { t, setLang, getLang, init, translatePage };
})();

// Expose globally
globalThis.I18n = I18n;
