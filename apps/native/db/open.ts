import { type SQL, sql } from "drizzle-orm";

import type { Database } from "./database";
import journal from "./migrations/meta/_journal.json";

// "CROW" in ASCII. Backup validation reads it to reject SQLite files that aren't Crowbar's.
export const CROWBAR_APPLICATION_ID = 0x43524f57;

export type Snapshot = { path: string; exists: () => boolean; delete: () => void };

// Opens Crowbar's database for use: sets the connection pragmas, then runs pending migrations
// behind a VACUUM INTO snapshot. The snapshot is removed only once migrating succeeds, so a
// failure leaves it beside the database; nothing here ever deletes or recreates the database.
export async function openDatabase(
  db: Database,
  { migrate, snapshot }: { migrate: () => void | Promise<void>; snapshot: Snapshot },
) {
  // all(), not run(): this pragma returns a row, and expo-sqlite's run() leaves such a statement
  // open mid-step, which makes SQLite refuse the COMMIT of every later transaction.
  db.all(sql`PRAGMA journal_mode = WAL`);
  db.run(sql`PRAGMA synchronous = FULL`);
  db.run(sql`PRAGMA foreign_keys = ON`);
  db.run(sql.raw(`PRAGMA application_id = ${CROWBAR_APPLICATION_ID}`));

  if (!hasPendingMigrations(db)) return;
  // A snapshot left by an earlier failed attempt already holds the pre-migration data, since a
  // failed migration rolls back.
  if (holdsData(db) && !snapshot.exists()) db.run(sql`VACUUM INTO ${snapshot.path}`);
  await migrate();
  if (snapshot.exists()) snapshot.delete();
}

// Drizzle marks each migration by its journal timestamp. It applies those newer than the last one
// recorded and silently accepts a database recording ones it doesn't bundle.
export const LATEST_MIGRATION = Math.max(...journal.entries.map((entry) => entry.when));

function hasPendingMigrations(db: Database) {
  if (countTables(db, sql`name = '__drizzle_migrations'`) === 0) return true;
  return lastAppliedMigration(db, "main") < LATEST_MIGRATION;
}

export function lastAppliedMigration(db: Database, schema: "main" | "backup") {
  const [last] = db.all<{ createdAt: number | null }>(
    sql`SELECT max(created_at) AS createdAt FROM ${sql.identifier(schema)}.__drizzle_migrations`,
  );
  return last?.createdAt ?? 0;
}

// A first launch has nothing worth a snapshot. Drizzle creates its bookkeeping table outside the
// migration transaction, so it survives a failed first launch and doesn't count as data.
function holdsData(db: Database) {
  return countTables(db, sql`type = 'table' AND name != '__drizzle_migrations'`) > 0;
}

// Raw reads use all(): for raw SQL, get() returns an object on expo-sqlite but an array on bun:sqlite.
function countTables(db: Database, where: SQL) {
  const [row] = db.all<{ count: number }>(
    sql`SELECT count(*) AS count FROM sqlite_master WHERE ${where}`,
  );
  return row?.count ?? 0;
}
