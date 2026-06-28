import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { resources, type SupportedLanguage } from './resources';

const storageKey = 'atmosphere_language';

function normalizeLanguage(value: string | null | undefined): SupportedLanguage | null {
  if (!value) return null;
  const lower = value.trim().toLowerCase();
  if (lower === 'cn') return 'zh-CN';
  if (lower.startsWith('zh')) return 'zh-CN';
  if (lower.startsWith('en')) return 'en-US';
  return null;
}

function getUrlLanguage(): SupportedLanguage | null {
  const params = new URLSearchParams(window.location.search);
  return normalizeLanguage(params.get('lang'));
}

function shortLanguageParam(language: SupportedLanguage) {
  return language === 'zh-CN' ? 'zh' : 'en';
}

function syncUrlLanguageParam(language: SupportedLanguage) {
  const currentUrl = new URL(window.location.href);
  if (!currentUrl.searchParams.has('lang')) return;

  const nextValue = shortLanguageParam(language);
  if (currentUrl.searchParams.get('lang') === nextValue) return;

  currentUrl.searchParams.set('lang', nextValue);
  window.history.replaceState(null, '', `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`);
}

const urlLanguage = getUrlLanguage();
const savedLanguage = normalizeLanguage(localStorage.getItem(storageKey));
const browserLanguage = normalizeLanguage(navigator.language);
const initialLanguage = urlLanguage || savedLanguage || browserLanguage || 'zh-CN';

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: initialLanguage,
    fallbackLng: 'zh-CN',
    interpolation: {
      escapeValue: false,
    },
  });

function syncLanguageAttributes(language: string) {
  const normalized = normalizeLanguage(language) || 'zh-CN';
  document.documentElement.lang = normalized;
  localStorage.setItem(storageKey, normalized);
  syncUrlLanguageParam(normalized);
}

syncLanguageAttributes(initialLanguage);
i18n.on('languageChanged', syncLanguageAttributes);

export { i18n };
export type { SupportedLanguage };
