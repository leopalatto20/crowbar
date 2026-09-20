import type { SQLiteDatabase } from "expo-sqlite";

type MigrationDatabase = Pick<SQLiteDatabase, "execAsync" | "getFirstAsync">;

type Migration = {
  version: number;
  migrate: (database: MigrationDatabase) => Promise<void>;
};

const migrations: readonly Migration[] = [
  {
    version: 1,
    migrate: async (database) => {
      await database.execAsync(`
        CREATE TABLE training_preferences (
          singleton_id INTEGER PRIMARY KEY NOT NULL CHECK (singleton_id = 1),
          effort_metric TEXT NOT NULL CHECK (effort_metric IN ('rpe', 'rir'))
        );
      `);
    },
  },
];

export async function migrateDatabase(database: SQLiteDatabase): Promise<void> {
  await database.execAsync("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");

  const versionRow = await database.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version",
  );
  const currentVersion = versionRow?.user_version ?? 0;
  const pendingMigrations = getPendingMigrations(currentVersion);

  if (pendingMigrations.length === 0) {
    return;
  }

  await database.withExclusiveTransactionAsync((transaction) =>
    migrate(transaction, currentVersion, pendingMigrations),
  );
}

function getPendingMigrations(
  currentVersion: number,
  availableMigrations: readonly Migration[] = migrations,
): Migration[] {
  return availableMigrations
    .filter((migration) => migration.version > currentVersion)
    .sort((left, right) => left.version - right.version);
}

export async function migrate(
  database: MigrationDatabase,
  currentVersion: number,
  availableMigrations: readonly Migration[] = migrations,
): Promise<void> {
  const pendingMigrations = getPendingMigrations(currentVersion, availableMigrations);

  if (pendingMigrations.length === 0) {
    return;
  }

  for (const migration of pendingMigrations) {
    await migration.migrate(database);
    await database.execAsync(`PRAGMA user_version = ${migration.version}`);
  }
}
