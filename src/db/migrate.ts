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
  {
    version: 2,
    migrate: async (database) => {
      await database.execAsync(`
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
                'chest',
                'upper-back',
                'lats',
                'shoulders',
                'biceps',
                'triceps',
                'forearms',
                'quads',
                'hamstrings',
                'glutes',
                'calves',
                'adductors',
                'core',
                'lower-back'
              )
          ),
          is_available INTEGER NOT NULL DEFAULT 1
            CHECK (is_available IN (0, 1))
        );
      `);

      await database.execAsync(`

        CREATE TABLE hidden_builtin_exercises (
          exercise_id TEXT PRIMARY KEY NOT NULL
            CHECK (
              length(exercise_id) = 32
              AND exercise_id NOT GLOB '*[^0-9a-f]*'
            )
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

  await pendingMigrations.reduce(
    (previousMigration, migration) =>
      previousMigration
        .then(() => migration.migrate(database))
        .then(() => database.execAsync(`PRAGMA user_version = ${migration.version}`)),
    Promise.resolve(),
  );
}
