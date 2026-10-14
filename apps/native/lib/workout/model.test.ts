import { describe, expect, test } from "bun:test";

import { en } from "@/lib/i18n/en";
import { formatDecimal } from "@/lib/i18n/locale";

import {
  formatElapsed,
  formatPerformance,
  fromEffortDisplay,
  parseSetValue,
  readLoad,
  toEffortDisplay,
} from "./model";

describe("effort display", () => {
  test("shows a stored RIR of 2 as RPE 8", () => {
    expect(toEffortDisplay(2, "RPE")).toBe(8);
  });

  test("shows a stored RIR as itself on the RIR scale", () => {
    expect(toEffortDisplay(2, "RIR")).toBe(2);
  });

  test("stores an entered RPE 9 as RIR 1", () => {
    expect(fromEffortDisplay(9, "RPE")).toBe(1);
  });

  test("keeps stored effort within 0 to 10 RIR", () => {
    expect(fromEffortDisplay(11, "RPE")).toBe(0);
    expect(fromEffortDisplay(12, "RIR")).toBe(10);
  });

  test("leaves a missing effort missing", () => {
    expect(toEffortDisplay(null, "RPE")).toBeNull();
    expect(fromEffortDisplay(null, "RPE")).toBeNull();
  });
});

describe("readLoad", () => {
  test("reads External and Bodyweight load as logged", () => {
    expect(readLoad(80, "external")).toBe(80);
    expect(readLoad(20, "bodyweight")).toBe(20);
  });

  test("counts assistance as negative load, so less assistance reads higher", () => {
    expect(readLoad(30, "assisted")).toBe(-30);
    expect(readLoad(20, "assisted")).toBeGreaterThan(readLoad(30, "assisted"));
  });
});

describe("formatPerformance", () => {
  const i18n = { t: en, formatDecimal: (value: number) => formatDecimal(value, "en-US") };
  const external = { unit: "kg", loadType: "external", unilateral: false } as const;
  const set = (load: number, rir: number | null = null) => ({ load, reps: 8, rir });

  test("shows External load as the weight moved", () => {
    expect(formatPerformance(set(82.5, 2), external, "RIR", i18n)).toBe("82.5 × 8 @2");
  });

  test("shows a Stack-level Station's load as a level", () => {
    expect(formatPerformance(set(7), { ...external, unit: "level" }, "RIR", i18n)).toBe("L7 × 8");
  });

  test("shows Bodyweight with no added load as BW, and added load after it", () => {
    const bodyweight = { ...external, loadType: "bodyweight" } as const;
    expect(formatPerformance(set(0), bodyweight, "RIR", i18n)).toBe("BW × 8");
    expect(formatPerformance(set(20), bodyweight, "RIR", i18n)).toBe("BW +20 × 8");
  });

  test("shows assistance taken off bodyweight", () => {
    const assisted = { ...external, loadType: "assisted" } as const;
    expect(formatPerformance(set(30), assisted, "RIR", i18n)).toBe("BW −30 × 8");
    expect(formatPerformance(set(3), { ...assisted, unit: "level" }, "RIR", i18n)).toBe(
      "BW −L3 × 8",
    );
  });

  test("counts a Unilateral Exercise's reps per side", () => {
    expect(formatPerformance(set(20), { ...external, unilateral: true }, "RIR", i18n)).toBe(
      "20 × 8/side",
    );
  });
});

describe("parseSetValue", () => {
  test("reads a load typed with a decimal comma or point as 82.5", () => {
    expect(parseSetValue("load", "82,5", "RIR")).toBe(82.5);
    expect(parseSetValue("load", "82.5", "RIR")).toBe(82.5);
  });

  test("stores an effort typed as RPE 8 as RIR 2", () => {
    expect(parseSetValue("rir", "8", "RPE")).toBe(2);
  });

  test("reads an emptied field as no value", () => {
    expect(parseSetValue("reps", "", "RIR")).toBeNull();
  });

  test("rejects fractional reps and text that isn't a number", () => {
    expect(parseSetValue("reps", "8,5", "RIR")).toBeUndefined();
    expect(parseSetValue("load", "abc", "RIR")).toBeUndefined();
  });
});

describe("formatElapsed", () => {
  test("shows minutes and seconds within the first hour", () => {
    expect(formatElapsed(0)).toBe("0:00");
    expect(formatElapsed(59.9)).toBe("0:59");
    expect(formatElapsed(47 * 60 + 5)).toBe("47:05");
  });

  test("adds hours once a Workout runs past an hour", () => {
    expect(formatElapsed(3600)).toBe("1:00:00");
    expect(formatElapsed(2 * 3600 + 3 * 60 + 9)).toBe("2:03:09");
  });
});
