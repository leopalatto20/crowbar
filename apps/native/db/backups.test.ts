import { Database as BunSqlite } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { backupFileName, writeBackup } from "./backups";
import type { BuiltInExercise } from "./built-in-exercises";
import { seedBuiltInExercises } from "./exercises";
import { createGym } from "./gyms";
import { addRoutineExercise, createRoutine, updateRoutineExercise } from "./routines";
import { seedSettings, updateSettings } from "./settings";
import { createTestDatabase } from "./test-database";
import { confirmSet, currentWorkout, getLedger, startWorkout } from "./workouts";

const benchPress: BuiltInExercise = {
  id: "barbell-bench-press",
  name: { en: "Barbell Bench Press", es: "Press de banca con barra" },
  equipmentType: "barbell",
  loadType: "external",
  unilateral: false,
  muscleGroup: "chest",
};

let directory: string;

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "crowbar-backup-"));
});

afterEach(() => rmSync(directory, { recursive: true }));

// Mid-Workout at Downtown Iron: one Bench Press set confirmed, so a Rest is running too.
async function midWorkout() {
  const db = await createTestDatabase(join(directory, "crowbar.db"));
  seedSettings(db, "MX");
  updateSettings(db, { effortScale: "RPE", defaultRestSeconds: 150 });
  seedBuiltInExercises(db, [benchPress]);
  const routineId = createRoutine(db, "Push");
  updateRoutineExercise(db, addRoutineExercise(db, routineId, benchPress.id), { sets: 2 });
  const gymId = createGym(db, "Downtown Iron");
  const workoutId = startWorkout(db, { gymId, timeZone: "America/Mexico_City", routineId });
  const [firstSet] = getLedger(db, workoutId, "en")!.exercises[0]!.sets;
  confirmSet(db, firstSet!.id, { load: 100, reps: 5 });
  return { db, workoutId };
}

function readAll(path: string) {
  const sqlite = new BunSqlite(path, { readonly: true });
  const tables = sqlite
    .query<{ name: string }, []>(
      "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
    )
    .all();
  const rows = Object.fromEntries(
    tables.map(({ name }) => [name, sqlite.query(`SELECT * FROM "${name}"`).all()]),
  );
  const [{ application_id }] = sqlite
    .query<{ application_id: number }, []>("PRAGMA application_id")
    .all() as [{ application_id: number }];
  const [{ quick_check }] = sqlite
    .query<{ quick_check: string }, []>("PRAGMA quick_check")
    .all() as [{ quick_check: string }];
  sqlite.close();
  return { rows, applicationId: application_id, quickCheck: quick_check };
}

describe("writeBackup", () => {
  test("taken mid-Workout, holds every row of every table, settings included", async () => {
    await midWorkout().then(({ db }) => writeBackup(db, join(directory, "backup.crowbar")));

    const live = readAll(join(directory, "crowbar.db"));
    const backup = readAll(join(directory, "backup.crowbar"));

    expect(backup.quickCheck).toBe("ok");
    expect(backup.applicationId).toBe(0x43524f57);
    expect(backup.rows).toEqual(live.rows);
    expect(backup.rows.settings).toMatchObject([{ effort_scale: "RPE" }]);
    expect(backup.rows.set).toContainEqual(
      expect.objectContaining({ load: 100, reps: 5, done: 1 }),
    );
  });

  test("opens as Crowbar's database with the Workout still in progress", async () => {
    const { db, workoutId } = await midWorkout();
    writeBackup(db, join(directory, "backup.crowbar"));

    const restored = await createTestDatabase(join(directory, "backup.crowbar"));

    expect(currentWorkout(restored)?.id).toBe(workoutId);
    expect(getLedger(restored, workoutId, "en")).toEqual(getLedger(db, workoutId, "en"));
  });
});

describe("backupFileName", () => {
  const zone = process.env.TZ;
  afterEach(() => {
    process.env.TZ = zone;
  });

  test("dates a late-night export by the lifter's day, not UTC's", () => {
    process.env.TZ = "America/Mexico_City";
    // 23:30 on Jan 5 in Mexico City, already Jan 6 in UTC.
    expect(backupFileName(new Date(Date.UTC(2026, 0, 6, 5, 30)))).toBe(
      "Crowbar backup 2026-01-05.crowbar",
    );
  });
});
