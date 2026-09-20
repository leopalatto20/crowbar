import type { SQLiteDatabase } from "expo-sqlite";

import { migrate, migrateDatabase } from "../migrate";

type FakeDatabaseState = {
  foreignKeysEnabled: boolean;
  journalMode: string | null;
  tableCreated: boolean;
  userVersion: number;
};

function createFakeDatabase(options?: { failTableCreationOnce?: boolean }) {
  const state: FakeDatabaseState = {
    foreignKeysEnabled: false,
    journalMode: null,
    tableCreated: false,
    userVersion: 0,
  };
  let shouldFailTableCreation = options?.failTableCreationOnce ?? false;
  let transactionCount = 0;

  const execute = async (sql: string): Promise<void> => {
    if (sql.includes("journal_mode = WAL")) {
      state.journalMode = "wal";
    }
    if (sql.includes("foreign_keys = ON")) {
      state.foreignKeysEnabled = true;
    }
    if (sql.includes("CREATE TABLE training_preferences")) {
      if (shouldFailTableCreation) {
        shouldFailTableCreation = false;
        throw new Error("migration failed");
      }
      state.tableCreated = true;
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

  it("initializes a fresh database with schema version 1", async () => {
    const fake = createFakeDatabase();

    await migrateDatabase(fake.database);

    expect(fake.getState()).toEqual({
      foreignKeysEnabled: true,
      journalMode: "wal",
      tableCreated: true,
      userVersion: 1,
    });
    expect(fake.getTransactionCount()).toBe(1);
  });

  it("does not rerun migrations for an already-current database", async () => {
    const fake = createFakeDatabase();
    fake.getState().userVersion = 1;

    await migrateDatabase(fake.database);

    expect(fake.getState().tableCreated).toBe(false);
    expect(fake.getTransactionCount()).toBe(0);
  });

  it("leaves a failed migration retryable", async () => {
    const fake = createFakeDatabase({ failTableCreationOnce: true });

    await expect(migrateDatabase(fake.database)).rejects.toThrow("migration failed");
    expect(fake.getState().userVersion).toBe(0);
    expect(fake.getState().tableCreated).toBe(false);

    await migrateDatabase(fake.database);

    expect(fake.getState().userVersion).toBe(1);
    expect(fake.getState().tableCreated).toBe(true);
    expect(fake.getTransactionCount()).toBe(2);
  });
});
