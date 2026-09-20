import { convertEffort, isValidEffort } from "../model/effort";

describe("isValidEffort", () => {
  it("accepts RPE boundaries and half-step values", () => {
    expect(isValidEffort("rpe", 5)).toBe(true);
    expect(isValidEffort("rpe", 10)).toBe(true);
    expect(isValidEffort("rpe", 7.5)).toBe(true);
  });

  it("accepts RIR boundaries and half-step values", () => {
    expect(isValidEffort("rir", 0)).toBe(true);
    expect(isValidEffort("rir", 5)).toBe(true);
    expect(isValidEffort("rir", 2.5)).toBe(true);
  });

  it("rejects quarter steps", () => {
    expect(isValidEffort("rpe", 7.25)).toBe(false);
    expect(isValidEffort("rir", 2.25)).toBe(false);
  });

  it("rejects non-finite and out-of-range values", () => {
    expect(isValidEffort("rpe", Number.NaN)).toBe(false);
    expect(isValidEffort("rpe", Number.POSITIVE_INFINITY)).toBe(false);
    expect(isValidEffort("rir", Number.NEGATIVE_INFINITY)).toBe(false);
    expect(isValidEffort("rpe", 4.5)).toBe(false);
    expect(isValidEffort("rir", 5.5)).toBe(false);
  });
});

describe("convertEffort", () => {
  it("returns the source value for identity conversion", () => {
    expect(convertEffort(7.5, "rpe", "rpe")).toBe(7.5);
    expect(convertEffort(2.5, "rir", "rir")).toBe(2.5);
  });

  it("converts between RPE and RIR using ten minus the source value", () => {
    expect(convertEffort(8, "rpe", "rir")).toBe(2);
    expect(convertEffort(2.5, "rir", "rpe")).toBe(7.5);
  });
});
