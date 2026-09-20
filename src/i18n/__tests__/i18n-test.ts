import type { Locale } from "expo-localization";

import {
  createI18n,
  getPreferredLanguage,
  i18n,
  i18nReady,
  supportedLanguages,
} from "../index";
import { en } from "../locales/en";
import { es } from "../locales/es";

const requiredKeys = [
  "trainingPreferences.firstRun.title",
  "trainingPreferences.firstRun.description",
  "trainingPreferences.firstRun.rpeOptionLabel",
  "trainingPreferences.firstRun.rpeOptionDescription",
  "trainingPreferences.firstRun.rirOptionLabel",
  "trainingPreferences.firstRun.rirOptionDescription",
  "trainingPreferences.firstRun.saveButtonLabel",
  "trainingPreferences.settings.title",
  "trainingPreferences.settings.description",
  "trainingPreferences.settings.currentMetric",
  "trainingPreferences.settings.saveButtonLabel",
  "trainingPreferences.loading.label",
  "trainingPreferences.validation.invalidMetric",
  "trainingPreferences.errors.loadFailed",
  "trainingPreferences.errors.saveFailed",
  "trainingPreferences.errors.retry",
  "trainingPreferences.accessibility.selected",
  "trainingPreferences.accessibility.notSelected",
  "trainingPreferences.accessibility.saving",
  "trainingPreferences.metric.rpe",
  "trainingPreferences.metric.rir",
] as const;

function locale(languageCode: string | null): Locale {
  return { languageCode } as Locale;
}

describe("getPreferredLanguage", () => {
  it("selects Spanish from the first device locale", () => {
    expect(getPreferredLanguage([locale("es"), locale("en")])).toBe("es");
    expect(getPreferredLanguage([locale("es-MX")])).toBe("es");
  });

  it("falls back to English for unsupported or missing locales", () => {
    expect(getPreferredLanguage([locale("fr")])).toBe("en");
    expect(getPreferredLanguage([locale(null)])).toBe("en");
    expect(getPreferredLanguage([])).toBe("en");
  });
});

describe("translation resources", () => {
  it("contain every required training preference key in both languages", () => {
    for (const key of requiredKeys) {
      expect(key.split(".").reduce<unknown>((value, segment) => {
        if (typeof value !== "object" || value === null) {
          return undefined;
        }

        return (value as Record<string, unknown>)[segment];
      }, en)).toEqual(expect.any(String));
      expect(key.split(".").reduce<unknown>((value, segment) => {
        if (typeof value !== "object" || value === null) {
          return undefined;
        }

        return (value as Record<string, unknown>)[segment];
      }, es)).toEqual(expect.any(String));
    }
  });
});

describe("i18n", () => {
  it("initializes from the supported device language", async () => {
    await i18nReady;

    expect(supportedLanguages).toEqual(["en", "es"]);
    expect(i18n.t("trainingPreferences.firstRun.title")).toBe(
      en.trainingPreferences.firstRun.title,
    );
  });

  it("uses English for unsupported languages and missing Spanish keys", async () => {
    const instance = await createI18n([locale("fr")], {
      en: { translation: en },
      es: {
        translation: {
          trainingPreferences: {
            firstRun: { title: es.trainingPreferences.firstRun.title },
          },
        },
      },
    });

    expect(instance.language).toBe("en");
    expect(instance.t("trainingPreferences.firstRun.title")).toBe(
      en.trainingPreferences.firstRun.title,
    );

    await instance.changeLanguage("es");
    expect(instance.t("trainingPreferences.loading.label")).toBe(
      en.trainingPreferences.loading.label,
    );
  });
});
