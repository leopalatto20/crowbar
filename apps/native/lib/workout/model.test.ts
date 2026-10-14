import { describe, expect, test } from "bun:test";

import { formatElapsed, fromEffortDisplay, parseSetValue, toEffortDisplay } from "./model";

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
