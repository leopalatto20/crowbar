import type { SQLiteDatabase } from "expo-sqlite";

import {
  createTrainingPreferencesRepository,
  type TrainingPreferencesRepository,
} from "../data/training-preferences-repository";

type FakeDatabase = {
  database: SQLiteDatabase;
  getFirstAsync: jest.Mock;
  runAsync: jest.Mock;
};

function createFakeDatabase(row: unknown = null): FakeDatabase {
  const getFirstAsync = jest.fn().mockResolvedValue(row);
  const runAsync = jest.fn().mockResolvedValue(undefined);

  return {
    database: { getFirstAsync, runAsync } as unknown as SQLiteDatabase,
    getFirstAsync,
    runAsync,
  };
}

function createRepository(fake: FakeDatabase): TrainingPreferencesRepository {
  return createTrainingPreferencesRepository(fake.database);
}

describe("TrainingPreferencesRepository", () => {
  it("returns null when no preference row exists", async () => {
    const fake = createFakeDatabase();

    await expect(createRepository(fake).read()).resolves.toBeNull();
  });

  it("returns valid persisted metrics", async () => {
    const fake = createFakeDatabase({ singleton_id: 1, effort_metric: "rir" });

    await expect(createRepository(fake).read()).resolves.toBe("rir");
  });

  it("returns null for an invalid persisted metric", async () => {
    const fake = createFakeDatabase({ singleton_id: 1, effort_metric: "unknown" });

    await expect(createRepository(fake).read()).resolves.toBeNull();
  });

  it("propagates read failures", async () => {
    const error = new Error("read failed");
    const fake = createFakeDatabase();
    fake.getFirstAsync.mockRejectedValue(error);

    await expect(createRepository(fake).read()).rejects.toBe(error);
  });

  it("saves a metric with a bound parameter", async () => {
    const fake = createFakeDatabase();
    const repository = createRepository(fake);

    await expect(repository.save("rpe")).resolves.toBeUndefined();
    expect(fake.runAsync).toHaveBeenCalledWith(
      expect.stringContaining("ON CONFLICT(singleton_id)"),
      "rpe",
    );
  });

  it("allows idempotent saves", async () => {
    const fake = createFakeDatabase();
    const repository = createRepository(fake);

    await repository.save("rpe");
    await repository.save("rpe");

    expect(fake.runAsync).toHaveBeenCalledTimes(2);
  });

  it("propagates write failures", async () => {
    const error = new Error("write failed");
    const fake = createFakeDatabase();
    fake.runAsync.mockRejectedValue(error);

    await expect(createRepository(fake).save("rir")).rejects.toBe(error);
  });
});
