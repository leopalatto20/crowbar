import type { SQLiteDatabase } from "expo-sqlite";

import { builtinExercises } from "../data/builtin-exercises";
import {
  createExerciseCatalogRepository,
  InvalidPersistedExerciseCatalogError,
  type ExerciseCatalogRepository,
} from "../data/exercise-catalog-repository";
import type { ExerciseId } from "../model/catalog";

const customExerciseId = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as ExerciseId;
const unknownExerciseId = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as ExerciseId;

const customRow = {
  exercise_id: customExerciseId,
  display_name: "Incline Landmine Press",
  name_key: "incline landmine press",
  muscle_group: "shoulders",
  is_available: 1,
};

type FakeDatabase = {
  database: SQLiteDatabase;
  getAllAsync: jest.Mock;
  getFirstAsync: jest.Mock;
  runAsync: jest.Mock;
  transactionGetFirstAsync: jest.Mock;
  transactionRunAsync: jest.Mock;
  withExclusiveTransactionAsync: jest.Mock;
  rolledBack: () => boolean;
};

function createFakeDatabase(): FakeDatabase {
  const getAllAsync = jest.fn().mockResolvedValue([]);
  const getFirstAsync = jest.fn().mockResolvedValue(null);
  const runAsync = jest.fn().mockResolvedValue({ changes: 1, lastInsertRowId: 1 });
  const transactionGetFirstAsync = jest.fn().mockResolvedValue(customRow);
  const transactionRunAsync = jest.fn().mockResolvedValue({ changes: 1, lastInsertRowId: 1 });
  let didRollBack = false;

  const transaction = {
    getFirstAsync: transactionGetFirstAsync,
    runAsync: transactionRunAsync,
  };
  const withExclusiveTransactionAsync = jest.fn(async (task) => {
    try {
      await task(transaction);
    } catch (error: unknown) {
      didRollBack = true;
      throw error;
    }
  });

  return {
    database: {
      getAllAsync,
      getFirstAsync,
      runAsync,
      withExclusiveTransactionAsync,
    } as unknown as SQLiteDatabase,
    getAllAsync,
    getFirstAsync,
    runAsync,
    transactionGetFirstAsync,
    transactionRunAsync,
    withExclusiveTransactionAsync,
    rolledBack: () => didRollBack,
  };
}

function createRepository(fake: FakeDatabase): ExerciseCatalogRepository {
  return createExerciseCatalogRepository(fake.database);
}

describe("ExerciseCatalogRepository", () => {
  it("loads every valid custom row and hidden built-in ID as one snapshot", async () => {
    const fake = createFakeDatabase();
    const hiddenBuiltinId = builtinExercises[0].id;
    fake.getAllAsync
      .mockResolvedValueOnce([customRow])
      .mockResolvedValueOnce([{ exercise_id: hiddenBuiltinId }]);

    await expect(createRepository(fake).read()).resolves.toEqual({
      customExercises: [
        {
          id: customExerciseId,
          displayName: "Incline Landmine Press",
          nameKey: "incline landmine press",
          muscleGroup: "shoulders",
          isAvailable: true,
        },
      ],
      hiddenBuiltinIds: [hiddenBuiltinId],
    });
  });

  it.each([
    ["invalid custom ID", [{ ...customRow, exercise_id: "invalid" }], []],
    ["invalid custom display name", [{ ...customRow, display_name: "  " }], []],
    [
      "untrimmed custom display name",
      [{ ...customRow, display_name: "  Incline Landmine Press  " }],
      [],
    ],
    ["custom row with a mismatched duplicate key", [{ ...customRow, name_key: "other" }], []],
    ["invalid custom muscle group", [{ ...customRow, muscle_group: "unknown" }], []],
    ["invalid custom row", [{ ...customRow, is_available: 2 }], []],
    ["invalid hidden built-in ID", [], [{ exercise_id: "invalid" }]],
    ["unknown hidden built-in ID", [], [{ exercise_id: unknownExerciseId }]],
  ])("rejects the complete snapshot for an %s", async (_name, customRows, hiddenRows) => {
    const fake = createFakeDatabase();
    fake.getAllAsync.mockResolvedValueOnce(customRows).mockResolvedValueOnce(hiddenRows);

    await expect(createRepository(fake).read()).rejects.toBeInstanceOf(
      InvalidPersistedExerciseCatalogError,
    );
  });

  it.each([
    [
      "duplicate custom ID",
      [
        customRow,
        {
          ...customRow,
          display_name: "Landmine Press",
          name_key: "landmine press",
        },
      ],
      [],
    ],
    [
      "duplicate custom name key",
      [{ ...customRow }, { ...customRow, exercise_id: unknownExerciseId }],
      [],
    ],
    [
      "duplicate hidden built-in ID",
      [],
      [{ exercise_id: builtinExercises[0].id }, { exercise_id: builtinExercises[0].id }],
    ],
  ])("rejects the complete snapshot for a %s", async (_name, customRows, hiddenRows) => {
    const fake = createFakeDatabase();
    fake.getAllAsync.mockResolvedValueOnce(customRows).mockResolvedValueOnce(hiddenRows);

    await expect(createRepository(fake).read()).rejects.toBeInstanceOf(
      InvalidPersistedExerciseCatalogError,
    );
  });

  it("propagates custom and hidden-row read failures", async () => {
    const customReadError = new Error("custom read failed");
    const customReadFake = createFakeDatabase();
    customReadFake.getAllAsync.mockRejectedValueOnce(customReadError);

    await expect(createRepository(customReadFake).read()).rejects.toBe(customReadError);

    const hiddenReadError = new Error("hidden read failed");
    const hiddenReadFake = createFakeDatabase();
    hiddenReadFake.getAllAsync.mockResolvedValueOnce([]).mockRejectedValueOnce(hiddenReadError);

    await expect(createRepository(hiddenReadFake).read()).rejects.toBe(hiddenReadError);
  });

  it("creates a custom exercise atomically and returns the validated durable row", async () => {
    const fake = createFakeDatabase();
    const repository = createRepository(fake);

    await expect(
      repository.createCustom({
        displayName: "Incline Landmine Press",
        nameKey: "incline landmine press",
        muscleGroup: "shoulders",
      }),
    ).resolves.toEqual({
      id: customExerciseId,
      displayName: "Incline Landmine Press",
      nameKey: "incline landmine press",
      muscleGroup: "shoulders",
      isAvailable: true,
    });

    expect(fake.withExclusiveTransactionAsync).toHaveBeenCalledTimes(1);
    expect(fake.transactionRunAsync).toHaveBeenCalledWith(
      expect.stringContaining("lower(hex(randomblob(16)))"),
      "Incline Landmine Press",
      "incline landmine press",
      "shoulders",
    );
    expect(fake.transactionGetFirstAsync).toHaveBeenCalledWith(
      expect.stringContaining("WHERE name_key = ?"),
      "incline landmine press",
    );
  });

  it("propagates duplicate-name writes", async () => {
    const duplicateError = new Error("UNIQUE constraint failed: custom_exercises.name_key");
    const fake = createFakeDatabase();
    fake.transactionRunAsync.mockRejectedValue(duplicateError);

    await expect(
      createRepository(fake).createCustom({
        displayName: "Incline Landmine Press",
        nameKey: "incline landmine press",
        muscleGroup: "shoulders",
      }),
    ).rejects.toBe(duplicateError);
  });

  it("rolls back custom creation when durable read-back fails", async () => {
    const readBackError = new Error("read-back failed");
    const fake = createFakeDatabase();
    fake.transactionGetFirstAsync.mockRejectedValue(readBackError);

    await expect(
      createRepository(fake).createCustom({
        displayName: "Incline Landmine Press",
        nameKey: "incline landmine press",
        muscleGroup: "shoulders",
      }),
    ).rejects.toBe(readBackError);
    expect(fake.rolledBack()).toBe(true);
  });

  it("updates a custom exercise in place with bound values", async () => {
    const fake = createFakeDatabase();
    fake.transactionGetFirstAsync.mockResolvedValue({
      ...customRow,
      display_name: "Incline Chest Press",
      name_key: "incline chest press",
      muscle_group: "chest",
    });

    await expect(
      createRepository(fake).updateCustom(customExerciseId, {
        displayName: "Incline Chest Press",
        nameKey: "incline chest press",
        muscleGroup: "chest",
      }),
    ).resolves.toEqual({
      id: customExerciseId,
      displayName: "Incline Chest Press",
      nameKey: "incline chest press",
      muscleGroup: "chest",
      isAvailable: true,
    });

    expect(fake.transactionRunAsync).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE custom_exercises"),
      "Incline Chest Press",
      "incline chest press",
      "chest",
      customExerciseId,
    );
  });

  it("returns null when custom updates affect no row", async () => {
    const fake = createFakeDatabase();
    fake.transactionRunAsync.mockResolvedValue({ changes: 0, lastInsertRowId: 0 });

    await expect(
      createRepository(fake).updateCustom(unknownExerciseId, {
        displayName: "Unknown",
        nameKey: "unknown",
        muscleGroup: "chest",
      }),
    ).resolves.toBeNull();
  });

  it("archives and restores custom exercises, including repeated availability changes", async () => {
    const fake = createFakeDatabase();
    fake.transactionGetFirstAsync
      .mockResolvedValueOnce({ ...customRow, is_available: 0 })
      .mockResolvedValueOnce({ ...customRow, is_available: 0 })
      .mockResolvedValueOnce({ ...customRow, is_available: 1 });
    const repository = createRepository(fake);

    await expect(repository.setCustomAvailability(customExerciseId, false)).resolves.toEqual({
      id: customExerciseId,
      displayName: "Incline Landmine Press",
      nameKey: "incline landmine press",
      muscleGroup: "shoulders",
      isAvailable: false,
    });
    await expect(repository.setCustomAvailability(customExerciseId, false)).resolves.toEqual(
      expect.objectContaining({ isAvailable: false }),
    );
    await expect(repository.setCustomAvailability(customExerciseId, true)).resolves.toEqual(
      expect.objectContaining({ isAvailable: true }),
    );

    expect(fake.transactionRunAsync).toHaveBeenCalledTimes(3);
    expect(fake.transactionRunAsync).toHaveBeenLastCalledWith(
      expect.stringContaining("UPDATE custom_exercises"),
      1,
      customExerciseId,
    );
  });

  it("returns null when a custom availability change affects no row", async () => {
    const fake = createFakeDatabase();
    fake.transactionRunAsync.mockResolvedValue({ changes: 0, lastInsertRowId: 0 });

    await expect(
      createRepository(fake).setCustomAvailability(unknownExerciseId, false),
    ).resolves.toBeNull();
  });

  it("rejects unvalidated write arguments before changing durable state", async () => {
    const fake = createFakeDatabase();
    const repository = createRepository(fake);

    await expect(
      repository.createCustom({
        displayName: "  Incline Landmine Press  ",
        nameKey: "incline landmine press",
        muscleGroup: "shoulders",
      }),
    ).rejects.toBeInstanceOf(InvalidPersistedExerciseCatalogError);
    await expect(
      repository.updateCustom("invalid" as ExerciseId, {
        displayName: "Incline Landmine Press",
        nameKey: "incline landmine press",
        muscleGroup: "shoulders",
      }),
    ).rejects.toBeInstanceOf(InvalidPersistedExerciseCatalogError);
    await expect(
      repository.setCustomAvailability(customExerciseId, "false" as unknown as boolean),
    ).rejects.toBeInstanceOf(InvalidPersistedExerciseCatalogError);
    await expect(
      repository.setBuiltinAvailability(builtinExercises[0].id, "false" as unknown as boolean),
    ).rejects.toBeInstanceOf(InvalidPersistedExerciseCatalogError);

    expect(fake.withExclusiveTransactionAsync).not.toHaveBeenCalled();
    expect(fake.runAsync).not.toHaveBeenCalled();
  });

  it("rolls back custom updates when durable read-back fails", async () => {
    const readBackError = new Error("read-back failed");
    const fake = createFakeDatabase();
    fake.transactionGetFirstAsync.mockRejectedValue(readBackError);

    await expect(
      createRepository(fake).setCustomAvailability(customExerciseId, false),
    ).rejects.toBe(readBackError);
    expect(fake.rolledBack()).toBe(true);
  });

  it("hides and restores known built-ins idempotently with bound IDs", async () => {
    const fake = createFakeDatabase();
    const repository = createRepository(fake);
    const builtinId = builtinExercises[0].id;

    await expect(repository.setBuiltinAvailability(builtinId, false)).resolves.toEqual({
      id: builtinId,
      isAvailable: false,
    });
    await expect(repository.setBuiltinAvailability(builtinId, false)).resolves.toEqual({
      id: builtinId,
      isAvailable: false,
    });
    await expect(repository.setBuiltinAvailability(builtinId, true)).resolves.toEqual({
      id: builtinId,
      isAvailable: true,
    });

    expect(fake.withExclusiveTransactionAsync).toHaveBeenCalledTimes(3);
    expect(fake.transactionRunAsync).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("INSERT OR IGNORE"),
      builtinId,
    );
    expect(fake.transactionRunAsync).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining("DELETE FROM hidden_builtin_exercises"),
      builtinId,
    );
  });

  it("rolls back a built-in visibility mutation with an impossible row count", async () => {
    const fake = createFakeDatabase();
    fake.transactionRunAsync.mockResolvedValue({ changes: 2, lastInsertRowId: 0 });

    await expect(
      createRepository(fake).setBuiltinAvailability(builtinExercises[0].id, true),
    ).rejects.toBeInstanceOf(InvalidPersistedExerciseCatalogError);
    expect(fake.rolledBack()).toBe(true);
  });

  it("rejects unknown built-in IDs before writing", async () => {
    const fake = createFakeDatabase();

    await expect(
      createRepository(fake).setBuiltinAvailability(unknownExerciseId, false),
    ).rejects.toBeInstanceOf(InvalidPersistedExerciseCatalogError);
    expect(fake.runAsync).not.toHaveBeenCalled();
  });

  it("propagates update, availability, and built-in visibility write failures", async () => {
    const writeError = new Error("write failed");
    const updateFake = createFakeDatabase();
    updateFake.transactionRunAsync.mockRejectedValue(writeError);

    await expect(
      createRepository(updateFake).updateCustom(customExerciseId, {
        displayName: "Incline Chest Press",
        nameKey: "incline chest press",
        muscleGroup: "chest",
      }),
    ).rejects.toBe(writeError);

    const availabilityFake = createFakeDatabase();
    availabilityFake.transactionRunAsync.mockRejectedValue(writeError);
    await expect(
      createRepository(availabilityFake).setCustomAvailability(customExerciseId, false),
    ).rejects.toBe(writeError);

    const builtinFake = createFakeDatabase();
    builtinFake.transactionRunAsync.mockRejectedValue(writeError);
    await expect(
      createRepository(builtinFake).setBuiltinAvailability(builtinExercises[0].id, false),
    ).rejects.toBe(writeError);
  });
});
