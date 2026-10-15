import { describe, expect, test } from "bun:test";

import { getSettings, markNotificationsAsked, seedSettings, updateSettings } from "./settings";
import { createTestDatabase } from "./test-database";

describe("seedSettings", () => {
  test("defaults the weight unit to lb in the US", async () => {
    const db = await createTestDatabase();
    seedSettings(db, "US");
    expect(getSettings(db).defaultWeightUnit).toBe("lb");
  });

  test("defaults the weight unit to kg outside the US", async () => {
    const db = await createTestDatabase();
    seedSettings(db, "MX");
    expect(getSettings(db).defaultWeightUnit).toBe("kg");
  });

  test("defaults the weight unit to kg when the region is unknown", async () => {
    const db = await createTestDatabase();
    seedSettings(db, null);
    expect(getSettings(db).defaultWeightUnit).toBe("kg");
  });

  test("starts with RIR, the Rest timer on and a 2:00 default rest", async () => {
    const db = await createTestDatabase();
    seedSettings(db, "US");
    expect(getSettings(db)).toMatchObject({
      effortScale: "RIR",
      restTimerEnabled: true,
      defaultRestSeconds: 120,
    });
  });
});

describe("updateSettings", () => {
  test("changes the Effort scale and default weight unit", async () => {
    const db = await createTestDatabase();
    seedSettings(db, "US");
    updateSettings(db, { effortScale: "RPE", defaultWeightUnit: "level" });
    expect(getSettings(db)).toMatchObject({ effortScale: "RPE", defaultWeightUnit: "level" });
  });

  test("changes the Rest timer and default rest", async () => {
    const db = await createTestDatabase();
    seedSettings(db, "US");
    updateSettings(db, { restTimerEnabled: false, defaultRestSeconds: 180 });
    expect(getSettings(db)).toMatchObject({ restTimerEnabled: false, defaultRestSeconds: 180 });
  });

  test("keeps changes when a later launch seeds again", async () => {
    const db = await createTestDatabase();
    seedSettings(db, "US");
    updateSettings(db, { effortScale: "RPE", defaultWeightUnit: "kg" });
    seedSettings(db, "US");
    expect(getSettings(db)).toMatchObject({ effortScale: "RPE", defaultWeightUnit: "kg" });
  });
});

describe("notification permission", () => {
  test("is asked about once, ever", async () => {
    const db = await createTestDatabase();
    seedSettings(db, "US");
    expect(getSettings(db).notificationsAsked).toBe(false);
    markNotificationsAsked(db);
    expect(getSettings(db).notificationsAsked).toBe(true);
  });
});
