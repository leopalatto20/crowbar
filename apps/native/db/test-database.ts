import { Database as BunSqlite } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { join } from "node:path";

import type { Database } from "./database";
import { openDatabase } from "./open";
import * as schema from "./schema";

export const MIGRATIONS_FOLDER = join(import.meta.dir, "migrations");

// Opens like the app does, so tests run with the same pragmas and the real generated migrations.
// A file path lets a test reopen the same data on a new connection, as a cold launch does.
export async function createTestDatabase(path = ":memory:"): Promise<Database> {
  const db = drizzle(new BunSqlite(path), { schema });
  await openDatabase(db, {
    migrate: () => migrate(db, { migrationsFolder: MIGRATIONS_FOLDER }),
    // A fresh database holds nothing worth a snapshot, so this is never written.
    snapshot: { path: "", exists: () => false, delete: () => {} },
  });
  return db;
}
