import { Database as BunSqlite } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { copyFileSync, existsSync, mkdtempSync, renameSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { Database } from "./database";
import { backupFixturePath } from "./fixtures/write-backup-fixtures";
import { createGym, listGyms } from "./gyms";
import { openDatabase } from "./open";
import {
  DATABASE_FILE,
  type DatabaseHost,
  PRE_MIGRATION_FILE,
  STAGED_BACKUP_FILE,
  restoreBackup,
  undoRestore,
} from "./restore";
import * as schema from "./schema";
import { getSettings, seedSettings, updateSettings } from "./settings";
import { MIGRATIONS_FOLDER } from "./test-database";
import { currentWorkout, logPastWorkout } from "./workouts";

const REPLACED_AT = Date.UTC(2026, 9, 15, 18);

let directory: string;

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "crowbar-restore-"));
});

afterEach(() => rmSync(directory, { recursive: true }));

// Opens the database file the way the app's startup does, and tracks the open connection so a
// test reads whatever the last restore or undo reopened.
function hostIn(folder: string) {
  const path = (file: string) => join(folder, file);
  let client: BunSqlite | null = null;
  const host = {
    db: null as unknown as Database,
    path,
    exists: (file: string) => existsSync(path(file)),
    remove: (file: string) => rmSync(path(file)),
    move: async (from: string, to: string) => renameSync(path(from), path(to)),
    close: async () => client?.close(),
    open: async () => {
      const opened = new BunSqlite(path(DATABASE_FILE));
      const db = drizzle(opened, { schema });
      const snapshot = path(PRE_MIGRATION_FILE);
      try {
        await openDatabase(db, {
          migrate: () => migrate(db, { migrationsFolder: MIGRATIONS_FOLDER }),
          snapshot: {
            path: snapshot,
            exists: () => existsSync(snapshot),
            delete: () => rmSync(snapshot),
          },
        });
      } catch (error) {
        opened.close();
        throw error;
      }
      seedSettings(db, "MX");
      client = opened;
      host.db = db;
      return db;
    },
  } satisfies DatabaseHost & { db: Database };
  return host;
}

// The lifter's current data: their own Gym, a finished Workout there and their own settings.
async function currentData() {
  const host = hostIn(directory);
  const db = await host.open();
  updateSettings(db, { defaultRestSeconds: 90 });
  const gymId = createGym(db, "Home Garage");
  logPastWorkout(db, { gymId, timeZone: "America/Mexico_City", startedAt: REPLACED_AT - 86400000 });
  return host;
}

function stage(source: string) {
  copyFileSync(source, join(directory, STAGED_BACKUP_FILE));
}

// Every row of every table, read on a connection of its own.
function readAll() {
  const sqlite = new BunSqlite(join(directory, DATABASE_FILE), { readonly: true });
  const tables = sqlite
    .query<{ name: string }, []>("SELECT name FROM sqlite_master WHERE type = 'table'")
    .all();
  const rows = Object.fromEntries(
    tables.map(({ name }) => [
      name,
      sqlite.query<Record<string, unknown>, []>(`SELECT * FROM "${name}"`).all(),
    ]),
  );
  sqlite.close();
  return rows;
}

describe("restoreBackup", () => {
  test("replaces everything with the Backup, migrated forward, and offers to undo", async () => {
    const host = await currentData();
    stage(backupFixturePath("0003_workout"));

    expect(await restoreBackup(host.db, host, REPLACED_AT)).toBe("restored");

    expect(listGyms(host.db).map((gym) => gym.name)).toEqual(["Downtown Iron"]);
    expect(getSettings(host.db)).toMatchObject({
      effortScale: "RPE",
      defaultRestSeconds: 150,
      undoRestorePath: expect.any(String),
      undoRestoreReplacedAt: REPLACED_AT,
    });
    expect(currentWorkout(host.db)?.startedAt).toBe(1767855600000);
    expect(host.exists(STAGED_BACKUP_FILE)).toBe(false);
  });

  test("a Backup that fails to migrate leaves the current data, and its undo, as they were", async () => {
    const host = await currentData();
    stage(backupFixturePath("0003_workout"));
    await restoreBackup(host.db, host, REPLACED_AT);
    const before = readAll();
    // Two Workouts in progress, which the next migration's one-in-progress index refuses.
    stage(backupFixturePath("0003_workout"));
    const staged = new BunSqlite(join(directory, STAGED_BACKUP_FILE));
    staged.run(
      "INSERT INTO workout (id, gym_id, started_at, time_zone) VALUES ('second', '0190a000-0000-7000-8000-000000000020', 1, 'UTC')",
    );
    staged.close();

    expect(await restoreBackup(host.db, host, REPLACED_AT + 1000)).toBe("failed");

    expect(readAll()).toEqual(before);
    expect(getSettings(host.db).undoRestoreReplacedAt).toBe(REPLACED_AT);
    expect(host.exists(PRE_MIGRATION_FILE)).toBe(false);
  });

  test("with no Backup staged, changes nothing", async () => {
    const host = await currentData();
    const before = readAll();

    expect(await restoreBackup(host.db, host, REPLACED_AT)).toBe("failed");

    expect(readAll()).toEqual(before);
    expect(listGyms(host.db).map((gym) => gym.name)).toEqual(["Home Garage"]);
  });
});

describe("undoRestore", () => {
  test("returns exactly the data the restore replaced", async () => {
    const host = await currentData();
    const before = readAll();
    stage(backupFixturePath("0010_notifications_asked"));
    await restoreBackup(host.db, host, REPLACED_AT);

    expect(await undoRestore(host.db, host)).toBe("restored");

    expect(readAll()).toEqual(before);
  });

  test("after a second restore, returns the data that one replaced", async () => {
    const host = await currentData();
    stage(backupFixturePath("0003_workout"));
    await restoreBackup(host.db, host, REPLACED_AT);
    const between = readAll();
    stage(backupFixturePath("0010_notifications_asked"));
    await restoreBackup(host.db, host, REPLACED_AT + 1000);

    await undoRestore(host.db, host);

    expect(readAll()).toEqual({
      ...between,
      settings: [
        { ...between.settings![0], undo_restore_path: null, undo_restore_replaced_at: null },
      ],
    });
  });

  test("with its replaced data gone, gives up and stops offering to undo", async () => {
    const host = await currentData();
    stage(backupFixturePath("0003_workout"));
    await restoreBackup(host.db, host, REPLACED_AT);
    host.remove(getSettings(host.db).undoRestorePath!);

    expect(await undoRestore(host.db, host)).toBe("failed");

    expect(listGyms(host.db).map((gym) => gym.name)).toEqual(["Downtown Iron"]);
    expect(getSettings(host.db).undoRestoreReplacedAt).toBeNull();
  });
});
