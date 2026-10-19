import { Database as BunSqlite } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { copyFileSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { BACKUP_HEADER_BYTES, inspectBackup } from "./backups";
import { backupFixturePath } from "./fixtures/write-backup-fixtures";
import journal from "./migrations/meta/_journal.json";
import { createTestDatabase } from "./test-database";
import { currentWorkout, getLedger } from "./workouts";

const IN_PROGRESS_STARTED_AT = 1767855600000;

// Workouts each fixture holds: none before the workout table, then two, then a third from a Routine.
const EXPECTED_WORKOUTS: Record<string, number> = {
  "0000_settings": 0,
  "0001_exercise": 0,
  "0002_routine": 0,
  "0003_workout": 2,
  "0004_workout_in_progress": 2,
  "0005_workout_from_routine": 3,
  "0006_station_label_notes": 3,
  "0007_workout_edit": 3,
  "0008_station_retired": 3,
  "0009_rest": 3,
  "0010_notifications_asked": 3,
  "0011_list_menus_used": 3,
};

let directory: string;

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "crowbar-fixtures-"));
});

afterEach(() => rmSync(directory, { recursive: true }));

function readTables(sqlite: BunSqlite) {
  const tables = sqlite
    .query<{ name: string }, []>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name != '__drizzle_migrations'",
    )
    .all();
  return Object.fromEntries(
    tables.map(({ name }) => [
      name,
      sqlite.query<Record<string, unknown>, []>(`SELECT * FROM "${name}"`).all(),
    ]),
  );
}

describe.each(journal.entries.map((entry) => entry.tag))("the %s Backup", (tag) => {
  test("is valid, and summarizes its Workouts", async () => {
    const path = backupFixturePath(tag);
    const header = readFileSync(path).subarray(0, BACKUP_HEADER_BYTES);
    const workouts = EXPECTED_WORKOUTS[tag];

    expect(inspectBackup(await createTestDatabase(), path, header)).toEqual({
      valid: true,
      workouts,
      lastWorkoutAt: workouts === 0 ? null : IN_PROGRESS_STARTED_AT,
    });
  });

  test("migrates forward with every row intact", async () => {
    const before = new BunSqlite(backupFixturePath(tag), { readonly: true });
    const rows = readTables(before);
    before.close();
    const path = join(directory, "crowbar.db");
    copyFileSync(backupFixturePath(tag), path);

    await createTestDatabase(path);

    const after = new BunSqlite(path, { readonly: true });
    const migrated = readTables(after);
    for (const [table, tableRows] of Object.entries(rows)) {
      expect(migrated[table]).toEqual(tableRows.map((row) => expect.objectContaining(row)));
    }
    expect(after.query("PRAGMA quick_check").all()).toEqual([{ quick_check: "ok" }]);
    expect(after.query("PRAGMA foreign_key_check").all()).toEqual([]);
    after.close();
  });

  test.skipIf(EXPECTED_WORKOUTS[tag] === 0)("reopens its Workout in progress", async () => {
    const path = join(directory, "crowbar.db");
    copyFileSync(backupFixturePath(tag), path);

    const db = await createTestDatabase(path);

    const workout = currentWorkout(db);
    expect(workout?.startedAt).toBe(IN_PROGRESS_STARTED_AT);
    const [bench] = getLedger(db, workout!.id, "en")!.exercises;
    expect(bench?.sets.map(({ load, reps, done }) => ({ load, reps, done }))).toEqual([
      { load: 102.5, reps: 5, done: true },
      { load: null, reps: null, done: false },
    ]);
  });
});
