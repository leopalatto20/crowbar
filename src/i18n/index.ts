import { getLocales, type Locale } from "expo-localization";
import { createInstance, type i18n as I18nInstance, type Resource } from "i18next";

import { en } from "./locales/en";
import { es } from "./locales/es";

export const supportedLanguages = ["en", "es"] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];

const resources: Resource = {
  en: { translation: en },
  es: { translation: es },
};

export function getPreferredLanguage(
  locales: readonly Pick<Locale, "languageCode">[],
): SupportedLanguage {
  const languageCode = locales[0]?.languageCode?.split(/[-_]/)[0]?.toLowerCase();

  return languageCode === "es" ? "es" : "en";
}

export async function createI18n(
  locales: readonly Pick<Locale, "languageCode">[] = getLocales(),
  translationResources: Resource = resources,
): Promise<I18nInstance> {
  const instance = createInstance();

  await instance.init({
    lng: getPreferredLanguage(locales),
    fallbackLng: "en",
    supportedLngs: [...supportedLanguages],
    resources: translationResources,
    returnNull: false,
    interpolation: {
      escapeValue: false,
    },
  });

  return instance;
}

export const i18n = createInstance();
export const i18nReady = i18n.init({
  lng: getPreferredLanguage(getLocales()),
  fallbackLng: "en",
  supportedLngs: [...supportedLanguages],
  resources,
  returnNull: false,
  interpolation: {
    escapeValue: false,
  },
});
