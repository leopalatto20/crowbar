import { useCalendars, useLocales } from "expo-localization";

import { en, type Messages } from "./en";
import { es } from "./es";
import {
  type Language,
  formatDecimal,
  formatDate,
  formatEditableDecimal,
  formatMonth,
  formatTime,
  resolveLanguage,
} from "./locale";

const CATALOGS: Record<Language, Messages> = { en, es };

// Hooks rather than module constants: Android can change the language without restarting the app.
export function useI18n() {
  const locales = useLocales();
  const [calendar] = useCalendars();
  // Formatting follows the device's own locale even when strings fall back to English.
  const { languageTag } = locales[0];
  const uses24HourClock = calendar.uses24hourClock ?? false;

  const language = resolveLanguage(locales.map((locale) => locale.languageTag));

  return {
    language,
    t: CATALOGS[language],
    formatDecimal: (value: number) => formatDecimal(value, languageTag),
    formatEditableDecimal: (value: number) => formatEditableDecimal(value, languageTag),
    formatTime: (epochMs: number, timeZone?: string) =>
      formatTime(epochMs, languageTag, uses24HourClock, timeZone),
    formatDate: (epochMs: number, timeZone: string) => formatDate(epochMs, languageTag, timeZone),
    formatMonth: (year: number, month: number) => formatMonth(year, month, languageTag),
  };
}

export type I18n = ReturnType<typeof useI18n>;
