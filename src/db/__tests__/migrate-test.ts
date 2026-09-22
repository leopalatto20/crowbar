import type { SQLiteDatabase } from "expo-sqlite";
import { DatabaseSync } from "node:sqlite";

import { migrate, migrateDatabase } from "../migrate";

type FakeDatabaseState = {
  customExercisesTableCreated: boolean;
  foreignKeysEnabled: boolean;
  hiddenBuiltinExercisesTableCreated: boolean;
  journalMode: string | null;
  tableCreated: boolean;
  userVersion: number;
  executedSql: string[];
};

function createFakeDatabase(options?: {
  failTableCreationOnce?: "training_preferences" | "custom_exercises" | "hidden_builtin_exercises";
}) {
  const state: FakeDatabaseState = {
    customExercisesTableCreated: false,
    foreignKeysEnabled: false,
    hiddenBuiltinExercisesTableCreated: false,
    journalMode: null,
    tableCreated: false,
    userVersion: 0,
    executedSql: [],
  };
  let tableToFail = options?.failTableCreationOnce;
  let transactionCount = 0;

  const execute = async (sql: string): Promise<void> => {
    state.executedSql.push(sql);
    if (sql.includes("journal_mode = WAL")) {
      state.journalMode = "wal";
    }
    if (sql.includes("foreign_keys = ON")) {
      state.foreignKeysEnabled = true;
    }
    if (sql.includes("CREATE TABLE training_preferences")) {
      if (tableToFail === "training_preferences") {
        tableToFail = undefined;
        throw new Error("migration failed");
      }
      state.tableCreated = true;
    }
    if (sql.includes("CREATE TABLE custom_exercises")) {
      if (tableToFail === "custom_exercises") {
        tableToFail = undefined;
        throw new Error("migration failed");
      }
      state.customExercisesTableCreated = true;
    }
    if (sql.includes("CREATE TABLE hidden_builtin_exercises")) {
      if (tableToFail === "hidden_builtin_exercises") {
        tableToFail = undefined;
        throw new Error("migration failed");
      }
      state.hiddenBuiltinExercisesTableCreated = true;
    }
    const versionMatch = sql.match(/PRAGMA user_version = (\d+)/);
    if (versionMatch) {
      state.userVersion = Number(versionMatch[1]);
    }
  };

  const database = {
    execAsync: execute,
    getFirstAsync: async <T>(sql: string): Promise<T | null> => {
      if (sql === "PRAGMA user_version") {
        return { user_version: state.userVersion } as T;
      }
      return null;
    },
    withExclusiveTransactionAsync: async (
      callback: (transaction: typeof database) => Promise<void>,
    ): Promise<void> => {
      transactionCount += 1;
      const snapshot = { ...state };
      try {
        await callback(database);
      } catch (error) {
        Object.assign(state, snapshot);
        throw error;
      }
    },
  } as unknown as SQLiteDatabase;

  return { database, getState: () => state, getTransactionCount: () => transactionCount };
}

describe("migrateDatabase", () => {
  it("applies pending migrations in ascending version order", async () => {
    const appliedVersions: number[] = [];

    await migrate(
      {
        execAsync: async (sql) => {
          const versionMatch = sql.match(/PRAGMA user_version = (\d+)/);
          if (versionMatch) {
            appliedVersions.push(Number(versionMatch[1]));
          }
        },
        getFirstAsync: async () => null,
      },
      0,
      [
        { version: 2, migrate: async () => undefined },
        { version: 1, migrate: async () => undefined },
      ],
    );

    expect(appliedVersions).toEqual([1, 2]);
  });

  it("initializes a fresh database through schema version 2", async () => {
    const fake = createFakeDatabase();

    await migrateDatabase(fake.database);

    expect(fake.getState()).toEqual(expect.objectContaining({
      customExercisesTableCreated: true,
      foreignKeysEnabled: true,
      hiddenBuiltinExercisesTableCreated: true,
      journalMode: "wal",
      tableCreated: true,
      userVersion: 2,
    }));
    expect(fake.getTransactionCount()).toBe(1);

    const createStatements = fake
      .getState()
      .executedSql.filter((sql) => sql.includes("CREATE TABLE"));
    expect(createStatements).toHaveLength(3);
    expect(createStatements[0]).toContain(
      "singleton_id INTEGER PRIMARY KEY NOT NULL CHECK (singleton_id = 1)",
    );
    expect(createStatements[0]).toContain(
      "effort_metric TEXT NOT NULL CHECK (effort_metric IN ('rpe', 'rir'))",
    );

    const customDdl = createStatements.find((sql) =>
      sql.includes("CREATE TABLE custom_exercises"),
    );
    const hiddenDdl = createStatements.find((sql) =>
      sql.includes("CREATE TABLE hidden_builtin_exercises"),
    );

    expect(customDdl).toBeDefined();
    expect(hiddenDdl).toBeDefined();
    expect(normalizeSql(createStatements[0])).toBe(normalizeSql(`
      CREATE TABLE training_preferences (
        singleton_id INTEGER PRIMARY KEY NOT NULL CHECK (singleton_id = 1),
        effort_metric TEXT NOT NULL CHECK (effort_metric IN ('rpe', 'rir'))
      );
    `));
    expect(normalizeSql(customDdl)).toBe(normalizeSql(`
      CREATE TABLE custom_exercises (
        exercise_id TEXT PRIMARY KEY NOT NULL
          CHECK (
            length(exercise_id) = 32
            AND exercise_id NOT GLOB '*[^0-9a-f]*'
          ),
        display_name TEXT NOT NULL
          CHECK (length(display_name) BETWEEN 1 AND 80),
        name_key TEXT NOT NULL UNIQUE
          CHECK (length(name_key) > 0),
        muscle_group TEXT NOT NULL
          CHECK (
            muscle_group IN (
              'chest', 'upper-back', 'lats', 'shoulders', 'biceps', 'triceps',
              'forearms', 'quads', 'hamstrings', 'glutes', 'calves', 'adductors',
              'core', 'lower-back'
            )
          ),
        is_available INTEGER NOT NULL DEFAULT 1
          CHECK (is_available IN (0, 1))
      );
    `));
    expect(normalizeSql(hiddenDdl)).toBe(normalizeSql(`
      CREATE TABLE hidden_builtin_exercises (
        exercise_id TEXT PRIMARY KEY NOT NULL
          CHECK (
            length(exercise_id) = 32
            AND exercise_id NOT GLOB '*[^0-9a-f]*'
          )
      );
    `));
    expect(customDdl).toContain("exercise_id TEXT PRIMARY KEY NOT NULL");
    expect(customDdl).toContain("display_name TEXT NOT NULL");
    expect(customDdl).toContain("CHECK (length(display_name) BETWEEN 1 AND 80)");
    expect(customDdl).toContain("name_key TEXT NOT NULL UNIQUE");
    expect(customDdl).toContain("CHECK (length(name_key) > 0)");
    expect(customDdl).toContain("muscle_group IN (");
    for (const muscleGroup of [
      "chest",
      "upper-back",
      "lats",
      "shoulders",
      "biceps",
      "triceps",
      "forearms",
      "quads",
      "hamstrings",
      "glutes",
      "calves",
      "adductors",
      "core",
      "lower-back",
    ]) {
      expect(customDdl).toContain(`'${muscleGroup}'`);
    }
    expect(customDdl).toContain("is_available INTEGER NOT NULL DEFAULT 1");
    expect(customDdl).toContain("CHECK (is_available IN (0, 1))");
    expect(hiddenDdl).toContain("exercise_id TEXT PRIMARY KEY NOT NULL");
    expect(hiddenDdl).toContain("length(exercise_id) = 32");
    expect(hiddenDdl).not.toMatch(/INSERT\s+INTO/i);
  });

  it("applies only schema version 2 to a version-1 database", async () => {
    const fake = createFakeDatabase();
    fake.getState().userVersion = 1;
    fake.getState().tableCreated = true;

    await migrateDatabase(fake.database);

    expect(fake.getState()).toEqual(expect.objectContaining({
      customExercisesTableCreated: true,
      foreignKeysEnabled: true,
      hiddenBuiltinExercisesTableCreated: true,
      journalMode: "wal",
      tableCreated: true,
      userVersion: 2,
    }));
    expect(fake.getTransactionCount()).toBe(1);
    const createStatements = fake
      .getState()
      .executedSql.filter((sql) => sql.includes("CREATE TABLE"));
    expect(createStatements).toHaveLength(2);
    expect(createStatements.every((sql) => !sql.includes("training_preferences"))).toBe(true);
  });

  it("does not rerun migrations for an already-current database", async () => {
    const fake = createFakeDatabase();
    fake.getState().userVersion = 2;

    await migrateDatabase(fake.database);

    expect(fake.getState().customExercisesTableCreated).toBe(false);
    expect(fake.getState().hiddenBuiltinExercisesTableCreated).toBe(false);
    expect(fake.getTransactionCount()).toBe(0);
  });

  it.each(["custom_exercises", "hidden_builtin_exercises"] as const)(
    "rolls back both schema version 2 tables when creating %s fails",
    async (failedTable) => {
      const fake = createFakeDatabase({ failTableCreationOnce: failedTable });
      fake.getState().userVersion = 1;
      fake.getState().tableCreated = true;

      await expect(migrateDatabase(fake.database)).rejects.toThrow("migration failed");
      expect(fake.getState()).toEqual(expect.objectContaining({
        customExercisesTableCreated: false,
        foreignKeysEnabled: true,
        hiddenBuiltinExercisesTableCreated: false,
        journalMode: "wal",
        tableCreated: true,
        userVersion: 1,
      }));

      await migrateDatabase(fake.database);

      expect(fake.getState().userVersion).toBe(2);
      expect(fake.getState().customExercisesTableCreated).toBe(true);
      expect(fake.getState().hiddenBuiltinExercisesTableCreated).toBe(true);
      expect(fake.getTransactionCount()).toBe(2);
    },
  );

  it("rolls back a version 1 failure and retries the complete migration", async () => {
    const fake = createFakeDatabase({ failTableCreationOnce: "training_preferences" });

    await expect(migrateDatabase(fake.database)).rejects.toThrow("migration failed");
    expect(fake.getState().tableCreated).toBe(false);
    expect(fake.getState().userVersion).toBe(0);

    await migrateDatabase(fake.database);

    expect(fake.getState().tableCreated).toBe(true);
    expect(fake.getState().customExercisesTableCreated).toBe(true);
    expect(fake.getState().hiddenBuiltinExercisesTableCreated).toBe(true);
    expect(fake.getState().userVersion).toBe(2);
    expect(fake.getTransactionCount()).toBe(2);
  });

  it("enforces the schema constraints with a real SQLite database", async () => {
    const native = new DatabaseSync(":memory:");
    const { database, executedSql } = createNativeDatabase(native);

    await migrateDatabase(database);

    expect(native.prepare(
      "SELECT COUNT(*) AS count FROM custom_exercises",
    ).get()).toEqual({ count: 0 });
    expect(native.prepare(
      "SELECT COUNT(*) AS count FROM hidden_builtin_exercises",
    ).get()).toEqual({ count: 0 });

    native.prepare(
      "INSERT INTO custom_exercises (exercise_id, display_name, name_key, muscle_group) VALUES (?, ?, ?, ?)",
    ).run("0123456789abcdef0123456789abcdef", "Press", "press", "chest");
    expect(native.prepare(
      "SELECT is_available FROM custom_exercises WHERE exercise_id = ?",
    ).get("0123456789abcdef0123456789abcdef")).toEqual({ is_available: 1 });

    expect(() => native.prepare(
      "INSERT INTO custom_exercises (exercise_id, display_name, name_key, muscle_group) VALUES (?, ?, ?, ?)",
    ).run("fedcba9876543210fedcba9876543210", "Other", "press", "chest")).toThrow();
    expect(() => native.prepare(
      "INSERT INTO custom_exercises (exercise_id, display_name, name_key, muscle_group) VALUES (?, ?, ?, ?)",
    ).run("invalid", "Other", "other", "chest")).toThrow();
    expect(() => native.prepare(
      "INSERT INTO custom_exercises (exercise_id, display_name, name_key, muscle_group) VALUES (?, ?, ?, ?)",
    ).run("fedcba9876543210fedcba9876543210", "Other", "other", "chest")).not.toThrow();
    expect(() => native.prepare(
      "INSERT INTO custom_exercises (exercise_id, display_name, name_key, muscle_group) VALUES (?, ?, ?, ?)",
    ).run("fedcba9876543210fedcba9876543210", "Other", "other-1", "chest")).toThrow();
    expect(() => native.prepare(
      "INSERT INTO custom_exercises (exercise_id, display_name, name_key, muscle_group) VALUES (?, ?, ?, ?)",
    ).run("0123456789abcdef0123456789abcdeg", "Other", "other-2", "chest")).toThrow();
    expect(() => native.prepare(
      "INSERT INTO custom_exercises (exercise_id, display_name, name_key, muscle_group) VALUES (?, ?, ?, ?)",
    ).run("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "Other", "other-3", "not-a-group")).toThrow();
    expect(() => native.prepare(
      "INSERT INTO custom_exercises (exercise_id, display_name, name_key, muscle_group) VALUES (?, ?, ?, ?)",
    ).run("bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", "Other", "other-4", "chest")).not.toThrow();
    expect(() => native.prepare(
      "INSERT INTO custom_exercises (exercise_id, display_name, name_key, muscle_group, is_available) VALUES (?, ?, ?, ?, ?)",
    ).run("cccccccccccccccccccccccccccccccc", "Other", "other-5", "chest", 2)).toThrow();
    expect(() => native.prepare(
      "INSERT INTO custom_exercises (exercise_id, display_name, name_key, muscle_group, is_available) VALUES (?, ?, ?, ?, ?)",
    ).run("14141414141414141414141414141414", "Other", "other-11", "chest", null)).toThrow();
    expect(() => native.prepare(
      "INSERT INTO custom_exercises (exercise_id, display_name, name_key, muscle_group) VALUES (?, ?, ?, ?)",
    ).run("dddddddddddddddddddddddddddddddd", "", "other-6", "chest")).toThrow();
    expect(() => native.prepare(
      "INSERT INTO custom_exercises (exercise_id, display_name, name_key, muscle_group) VALUES (?, ?, ?, ?)",
    ).run("eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee", "x".repeat(81), "other-7", "chest")).toThrow();
    expect(() => native.prepare(
      "INSERT INTO custom_exercises (exercise_id, display_name, name_key, muscle_group) VALUES (?, ?, ?, ?)",
    ).run("ffffffffffffffffffffffffffffffff", "Other", "", "chest")).toThrow();
    expect(() => native.prepare(
      "INSERT INTO custom_exercises (exercise_id, display_name, name_key, muscle_group) VALUES (?, ?, ?, ?)",
    ).run("12121212121212121212121212121212", "Other", null, "chest")).toThrow();
    expect(() => native.prepare(
      "INSERT INTO custom_exercises (exercise_id, display_name, name_key, muscle_group) VALUES (?, ?, ?, ?)",
    ).run("13131313131313131313131313131313", "Other", "other-10", null)).toThrow();
    expect(() => native.prepare(
      "INSERT INTO custom_exercises (exercise_id, display_name, name_key, muscle_group) VALUES (?, ?, ?, ?)",
    ).run(null, "Other", "other-8", "chest")).toThrow();
    expect(() => native.prepare(
      "INSERT INTO custom_exercises (exercise_id, display_name, name_key, muscle_group) VALUES (?, ?, ?, ?)",
    ).run("11111111111111111111111111111111", null, "other-9", "chest")).toThrow();
    native.prepare(
      "INSERT INTO hidden_builtin_exercises (exercise_id) VALUES (?)",
    ).run("0123456789abcdef0123456789abcdef");
    expect(native.prepare(
      "SELECT COUNT(*) AS count FROM hidden_builtin_exercises",
    ).get()).toEqual({ count: 1 });
    expect(() => native.prepare(
      "INSERT INTO hidden_builtin_exercises (exercise_id) VALUES (?)",
    ).run("invalid")).toThrow();
    expect(() => native.prepare(
      "INSERT INTO hidden_builtin_exercises (exercise_id) VALUES (?)",
    ).run("0123456789abcdef0123456789abcdef")).toThrow();
    expect(() => native.prepare(
      "INSERT INTO hidden_builtin_exercises (exercise_id) VALUES (?)",
    ).run(null)).toThrow();
    expect(executedSql.join("\n")).not.toMatch(/INSERT\s+INTO/i);

    native.close();
  });

  it("rolls back both version-2 tables and user_version in real SQLite", async () => {
    const native = new DatabaseSync(":memory:");
    native.exec("CREATE TABLE training_preferences (singleton_id INTEGER PRIMARY KEY); PRAGMA user_version = 1;");
    const { database } = createNativeDatabase(native, "hidden_builtin_exercises");

    await expect(migrateDatabase(database)).rejects.toThrow("injected migration failure");

    expect(native.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('custom_exercises', 'hidden_builtin_exercises')",
    ).all()).toEqual([]);
    expect(native.prepare("PRAGMA user_version").get()).toEqual({ user_version: 1 });

    await migrateDatabase(database);

    expect(native.prepare(
      "SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name IN ('custom_exercises', 'hidden_builtin_exercises')",
    ).get()).toEqual({ count: 2 });
    expect(native.prepare("PRAGMA user_version").get()).toEqual({ user_version: 2 });
    native.close();
  });
});

function createNativeDatabase(
  native: DatabaseSync,
  failTable?: "hidden_builtin_exercises",
): { database: SQLiteDatabase; executedSql: string[] } {
  const executedSql: string[] = [];
  let shouldFail = failTable !== undefined;
  const database = {
    execAsync: async (sql: string) => {
      executedSql.push(sql);
      if (shouldFail && sql.includes(`CREATE TABLE ${failTable ?? "never"}`)) {
        shouldFail = false;
        throw new Error("injected migration failure");
      }
      native.exec(sql);
    },
    getFirstAsync: async <T>(sql: string) => native.prepare(sql).get() as T | null,
    withExclusiveTransactionAsync: async (
      callback: (transaction: SQLiteDatabase) => Promise<void>,
    ) => {
      native.exec("BEGIN EXCLUSIVE");
      try {
        await callback(database as SQLiteDatabase);
        native.exec("COMMIT");
      } catch (error) {
        native.exec("ROLLBACK");
        throw error;
      }
    },
  } as unknown as SQLiteDatabase;

  return { database, executedSql };
}

function normalizeSql(sql: string | undefined): string {
  return (sql ?? "").replace(/\s+/g, " ").trim();
}
