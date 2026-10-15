import { describe, expect, test } from "bun:test";

import {
  ageOf,
  formatDecimal,
  formatEditableDecimal,
  formatDate,
  formatMonth,
  formatTime,
  parseDecimal,
  resolveLanguage,
} from "./locale";

describe("resolveLanguage", () => {
  test("uses Spanish for any Spanish region", () => {
    expect(resolveLanguage(["es-MX"])).toBe("es");
  });

  test("uses the first preferred language the app ships", () => {
    expect(resolveLanguage(["fr-FR", "es-ES", "en-US"])).toBe("es");
  });

  test("falls back to English when no preferred language is shipped", () => {
    expect(resolveLanguage(["fr-FR", "de-DE"])).toBe("en");
  });
});

describe("formatDecimal", () => {
  test("uses the locale's decimal separator", () => {
    expect(formatDecimal(102.5, "es-ES")).toBe("102,5");
    expect(formatDecimal(102.5, "en-US")).toBe("102.5");
  });

  test("shows whole numbers without decimals", () => {
    expect(formatDecimal(100, "en-US")).toBe("100");
  });

  test("keeps quarter-kilo plate increments", () => {
    expect(formatDecimal(101.25, "en-US")).toBe("101.25");
  });

  test("groups thousands the way the locale does", () => {
    expect(formatDecimal(12500, "en-US")).toBe("12,500");
    expect(formatDecimal(12500, "es-ES")).toBe("12.500");
  });
});

describe("parseDecimal", () => {
  test("accepts a decimal comma or point regardless of locale", () => {
    expect(parseDecimal("102,5")).toBe(102.5);
    expect(parseDecimal("102.5")).toBe(102.5);
  });

  test("reads an empty field as no value", () => {
    expect(parseDecimal("")).toBeNull();
  });

  test("rejects text that isn't a number", () => {
    expect(parseDecimal("abc")).toBeNaN();
  });

  test("reads back what an editable field shows", () => {
    expect(parseDecimal(formatEditableDecimal(1012.5, "es-ES"))).toBe(1012.5);
    expect(parseDecimal(formatEditableDecimal(1012.5, "en-US"))).toBe(1012.5);
  });
});

describe("formatTime", () => {
  const evening = new Date(2026, 9, 13, 18, 42).getTime();

  test("follows the device's 24-hour setting over the locale's default", () => {
    expect(formatTime(evening, "en-US", true)).toBe("18:42");
    expect(formatTime(evening, "es-ES", false)).toMatch(/^6:42\s?p/);
  });

  test("uses a 12-hour clock when the device does", () => {
    expect(formatTime(evening, "en-US", false)).toMatch(/^6:42\sPM$/);
  });
});

describe("dates in a Workout's time zone", () => {
  // 03:00 UTC on October 1 is still the evening of September 30 in Mexico City.
  const lateEvening = Date.UTC(2026, 9, 1, 3);

  test("formatTime reads the clock in the given zone", () => {
    expect(formatTime(lateEvening, "en-US", true, "America/Mexico_City")).toBe("21:00");
  });

  test("formatDate reads the day in the given zone", () => {
    expect(formatDate(lateEvening, "en-US", "America/Mexico_City")).toBe("Wed, Sep 30");
    expect(formatDate(lateEvening, "en-US", "Asia/Tokyo")).toBe("Thu, Oct 1");
  });

  test("formatMonth names the month and year in the locale", () => {
    expect(formatMonth(2026, 10, "en-US")).toBe("October 2026");
    expect(formatMonth(2026, 1, "es-ES")).toBe("enero de 2026");
  });
});

describe("ageOf", () => {
  const now = new Date(2026, 9, 14, 8, 0).getTime();
  const at = (day: number, hour = 20) => new Date(2026, 9, day, hour, 0).getTime();

  test("counts calendar days, so last night is yesterday this morning", () => {
    expect(ageOf(at(14, 6), now)).toEqual({ unit: "day", count: 0 });
    expect(ageOf(at(13, 23), now)).toEqual({ unit: "day", count: 1 });
    expect(ageOf(at(11), now)).toEqual({ unit: "day", count: 3 });
  });

  test("rounds down to whole weeks, months and years as the gap grows", () => {
    expect(ageOf(at(7), now)).toEqual({ unit: "week", count: 1 });
    expect(ageOf(new Date(2026, 8, 1).getTime(), now)).toEqual({ unit: "month", count: 1 });
    expect(ageOf(new Date(2024, 9, 1).getTime(), now)).toEqual({ unit: "year", count: 2 });
  });
});
