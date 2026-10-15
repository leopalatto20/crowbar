import { sql } from "drizzle-orm";

import type { Database } from "./database";
import { CROWBAR_APPLICATION_ID, LATEST_MIGRATION, lastAppliedMigration } from "./open";

// VACUUM INTO reads one consistent snapshot through this connection, WAL included, so a Backup
// taken mid-Workout holds every committed set without pausing the Workout.
export function writeBackup(db: Database, path: string) {
  db.run(sql`VACUUM INTO ${path}`);
}

// The lifter's own calendar day, so a Backup exported late at night isn't dated by UTC's tomorrow.
export function backupFileName(now: Date) {
  const day = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
  return `Crowbar backup ${day}.crowbar`;
}

export type DataSummary = { workouts: number; lastWorkoutAt: number | null };

export type BackupProblem = "foreign" | "corrupt" | "newer";

export type BackupInspection =
  | ({ valid: true } & DataSummary)
  | { valid: false; problem: BackupProblem };

export const BACKUP_HEADER_BYTES = 100;

// `header` is the file's first BACKUP_HEADER_BYTES. The application_id is read from it directly:
// damage that reaches the schema makes SQLite refuse the whole file, which would hide a damaged
// Crowbar Backup among foreign files. The file is attached to the live connection rather than
// opened on its own, so the same code reads it on expo-sqlite and bun:sqlite.
export function inspectBackup(db: Database, path: string, header: Uint8Array): BackupInspection {
  if (applicationIdOf(header) !== CROWBAR_APPLICATION_ID)
    return { valid: false, problem: "foreign" };
  try {
    db.run(sql`ATTACH DATABASE ${path} AS backup`);
  } catch {
    return { valid: false, problem: "corrupt" };
  }
  try {
    if (!passesQuickCheck(db)) return { valid: false, problem: "corrupt" };
    if (lastAppliedMigration(db, "backup") > LATEST_MIGRATION)
      return { valid: false, problem: "newer" };
    return { valid: true, ...summarizeData(db, "backup") };
  } finally {
    db.run(sql`DETACH DATABASE backup`);
  }
}

const SQLITE_MAGIC = "SQLite format 3\0";

// Per the SQLite file format: a 16-byte magic string, then the application_id as a big-endian
// integer at offset 68.
function applicationIdOf(header: Uint8Array) {
  if (header.length < BACKUP_HEADER_BYTES) return undefined;
  if (String.fromCharCode(...header.subarray(0, 16)) !== SQLITE_MAGIC) return undefined;
  return new DataView(header.buffer, header.byteOffset).getUint32(68);
}

// quick_check reports damage as rows, but damage bad enough stops it with an error instead.
function passesQuickCheck(db: Database) {
  try {
    const rows = db.all<{ quick_check: string }>(sql`PRAGMA backup.quick_check`);
    return rows.length === 1 && rows[0]!.quick_check === "ok";
  } catch {
    return false;
  }
}

// A Backup from before Workouts existed has no workout table to count.
export function summarizeData(db: Database, schema: "main" | "backup" = "main"): DataSummary {
  const from = sql.identifier(schema);
  const [{ count }] = db.all<{ count: number }>(
    sql`SELECT count(*) AS count FROM ${from}.sqlite_master WHERE type = 'table' AND name = 'workout'`,
  ) as [{ count: number }];
  if (count === 0) return { workouts: 0, lastWorkoutAt: null };
  const [row] = db.all<DataSummary>(
    sql`SELECT count(*) AS workouts, max(started_at) AS lastWorkoutAt FROM ${from}.workout`,
  );
  return row!;
}
