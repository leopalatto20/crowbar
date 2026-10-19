// Writes a Backup fixture for each schema version that has none yet: the database as that app
// version left it, VACUUM INTO'd like an export. Existing fixtures are never rewritten, since
// they stand for Backups already out in the world.
// When a migration is added, add the rows its schema introduces to DATA, then run:
//   bun db/fixtures/write-backup-fixtures.ts
import { Database as BunSqlite } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import journal from "../migrations/meta/_journal.json";
import { CROWBAR_APPLICATION_ID } from "../open";
import { MIGRATIONS_FOLDER } from "../test-database";

export const BACKUP_FIXTURES_FOLDER = join(import.meta.dir, "backups");

// Rows written right after each migration, in that version's schema, so every fixture holds
// everything the versions before it could hold. The Workout in progress stays in progress.
const DATA: Record<string, string[]> = {
  "0000_settings": [
    `INSERT INTO settings (id, effort_scale, default_weight_unit, rest_timer_enabled,
       default_rest_seconds, last_exported_at)
     VALUES (1, 'RPE', 'kg', 1, 150, 1767225600000)`,
  ],
  "0001_exercise": [
    `INSERT INTO exercise (id, name, name_es, equipment_type, load_type, unilateral, muscle_group, built_in)
     VALUES ('barbell-bench-press', 'Barbell Bench Press', 'Press de banca con barra', 'barbell',
       'external', 0, 'chest', 1)`,
    `INSERT INTO exercise (id, name, equipment_type, load_type, unilateral, muscle_group)
     VALUES ('0190a000-0000-7000-8000-000000000001', 'Hammer Strength Row', 'machine', 'external',
       1, 'lats')`,
  ],
  "0002_routine": [
    `INSERT INTO routine (id, name, position) VALUES ('0190a000-0000-7000-8000-000000000010', 'Push', 0)`,
    `INSERT INTO routine_exercise (id, routine_id, exercise_id, position, warmups, sets, rep_min,
       rep_max, rir_min, rir_max, rest_seconds)
     VALUES ('0190a000-0000-7000-8000-000000000011', '0190a000-0000-7000-8000-000000000010',
       'barbell-bench-press', 0, 1, 3, 5, 8, 1, 2, 180)`,
  ],
  "0003_workout": [
    `INSERT INTO gym (id, name) VALUES ('0190a000-0000-7000-8000-000000000020', 'Downtown Iron')`,
    `INSERT INTO station (id, exercise_id, gym_id, unit)
     VALUES ('0190a000-0000-7000-8000-000000000021', 'barbell-bench-press',
       '0190a000-0000-7000-8000-000000000020', 'kg')`,
    `INSERT INTO workout (id, gym_id, started_at, finished_at, time_zone)
     VALUES ('0190a000-0000-7000-8000-000000000030', '0190a000-0000-7000-8000-000000000020',
       1767250800000, 1767254400000, 'America/Mexico_City')`,
    `INSERT INTO workout_exercise (id, workout_id, exercise_id, station_id, position)
     VALUES ('0190a000-0000-7000-8000-000000000031', '0190a000-0000-7000-8000-000000000030',
       'barbell-bench-press', '0190a000-0000-7000-8000-000000000021', 0)`,
    `INSERT INTO "set" (id, workout_exercise_id, position, kind, load, reps, rir, done) VALUES
       ('0190a000-0000-7000-8000-000000000032', '0190a000-0000-7000-8000-000000000031', 0, 'warmup', 60, 8, NULL, 1),
       ('0190a000-0000-7000-8000-000000000033', '0190a000-0000-7000-8000-000000000031', 1, 'working', 100, 5, 2, 1)`,
    `INSERT INTO workout (id, gym_id, started_at, time_zone)
     VALUES ('0190a000-0000-7000-8000-000000000040', '0190a000-0000-7000-8000-000000000020',
       1767855600000, 'America/Mexico_City')`,
    `INSERT INTO workout_exercise (id, workout_id, exercise_id, station_id, position)
     VALUES ('0190a000-0000-7000-8000-000000000041', '0190a000-0000-7000-8000-000000000040',
       'barbell-bench-press', '0190a000-0000-7000-8000-000000000021', 0)`,
    `INSERT INTO "set" (id, workout_exercise_id, position, kind, load, reps, rir, done) VALUES
       ('0190a000-0000-7000-8000-000000000042', '0190a000-0000-7000-8000-000000000041', 0, 'working', 102.5, 5, 1, 1),
       ('0190a000-0000-7000-8000-000000000043', '0190a000-0000-7000-8000-000000000041', 1, 'working', NULL, NULL, NULL, 0)`,
  ],
  "0004_workout_in_progress": [],
  "0005_workout_from_routine": [
    `UPDATE workout SET routine_id = '0190a000-0000-7000-8000-000000000010', routine_name = 'Push'
     WHERE id = '0190a000-0000-7000-8000-000000000040'`,
    `UPDATE workout_exercise SET sets = 3, rep_min = 5, rep_max = 8, rir_min = 1, rir_max = 2,
       rest_seconds = 180
     WHERE id = '0190a000-0000-7000-8000-000000000041'`,
    `INSERT INTO workout (id, gym_id, routine_id, routine_name, started_at, finished_at, time_zone)
     VALUES ('0190a000-0000-7000-8000-000000000050', '0190a000-0000-7000-8000-000000000020',
       '0190a000-0000-7000-8000-000000000010', 'Push', 1767510000000, 1767513600000,
       'America/Mexico_City')`,
    `INSERT INTO workout_exercise (id, workout_id, exercise_id, station_id, position, sets)
     VALUES ('0190a000-0000-7000-8000-000000000051', '0190a000-0000-7000-8000-000000000050',
       'barbell-bench-press', '0190a000-0000-7000-8000-000000000021', 0, 3)`,
    `INSERT INTO "set" (id, workout_exercise_id, position, kind, load, reps, rir, done)
     VALUES ('0190a000-0000-7000-8000-000000000052', '0190a000-0000-7000-8000-000000000051', 0,
       'working', 100, 6, 2, 1)`,
  ],
  "0006_station_label_notes": [
    `UPDATE station SET label = 'Rack 3', notes = 'Bench height 4'
     WHERE id = '0190a000-0000-7000-8000-000000000021'`,
  ],
  "0007_workout_edit": [
    `UPDATE workout_exercise SET routine_exercise_id = '0190a000-0000-7000-8000-000000000011'
     WHERE id = '0190a000-0000-7000-8000-000000000041'`,
    `INSERT INTO workout_exercise (id, workout_id, exercise_id, position)
     VALUES ('0190a000-0000-7000-8000-000000000044', '0190a000-0000-7000-8000-000000000040',
       '0190a000-0000-7000-8000-000000000001', 1)`,
    `INSERT INTO workout_edit (id, workout_id, position, kind, workout_exercise_id)
     VALUES ('0190a000-0000-7000-8000-000000000045', '0190a000-0000-7000-8000-000000000040', 0,
       'add', '0190a000-0000-7000-8000-000000000044')`,
  ],
  "0008_station_retired": [
    `INSERT INTO station (id, exercise_id, gym_id, unit, label, retired)
     VALUES ('0190a000-0000-7000-8000-000000000022', 'barbell-bench-press',
       '0190a000-0000-7000-8000-000000000020', 'lb', 'Old rack', 1)`,
  ],
  "0009_rest": [
    `INSERT INTO rest (id, set_id, started_at, ends_at)
     VALUES (1, '0190a000-0000-7000-8000-000000000042', 1767856200000, 1767856380000)`,
  ],
  "0010_notifications_asked": [`UPDATE settings SET notifications_asked = 1`],
  "0011_list_menus_used": [
    `UPDATE settings SET routine_menu_used = 1, exercise_menu_used = 1, gym_menu_used = 1`,
  ],
};

export function backupFixturePath(tag: string) {
  return join(BACKUP_FIXTURES_FOLDER, `${tag}.crowbar`);
}

// Drizzle reads migrations from a folder's journal, so each version gets a folder whose journal
// stops at it.
function migrateUpTo(sqlite: BunSqlite, entryCount: number, scratch: string) {
  const folder = join(scratch, `migrations-${entryCount}`);
  mkdirSync(join(folder, "meta"), { recursive: true });
  const entries = journal.entries.slice(0, entryCount);
  writeFileSync(join(folder, "meta", "_journal.json"), JSON.stringify({ ...journal, entries }));
  for (const { tag } of entries) {
    cpSync(join(MIGRATIONS_FOLDER, `${tag}.sql`), join(folder, `${tag}.sql`));
  }
  migrate(drizzle(sqlite), { migrationsFolder: folder });
}

if (import.meta.main) {
  const scratch = mkdtempSync(join(tmpdir(), "crowbar-fixtures-"));
  mkdirSync(BACKUP_FIXTURES_FOLDER, { recursive: true });
  const sqlite = new BunSqlite(":memory:");
  sqlite.run(`PRAGMA application_id = ${CROWBAR_APPLICATION_ID}`);
  sqlite.run("PRAGMA foreign_keys = ON");
  journal.entries.forEach(({ tag }, index) => {
    const data = DATA[tag];
    if (!data) throw new Error(`Add the rows ${tag} introduces to DATA`);
    migrateUpTo(sqlite, index + 1, scratch);
    for (const statement of data) sqlite.run(statement);
    const path = backupFixturePath(tag);
    if (existsSync(path)) return;
    sqlite.run("VACUUM INTO ?", [path]);
    console.log(`Wrote ${path}`);
  });
  rmSync(scratch, { recursive: true });
}
