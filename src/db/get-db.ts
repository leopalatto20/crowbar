import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';

import * as schema from './schema';

/**
 * The app's typed Drizzle connection. The schema is the single source of truth
 * (ADR 0005); this seam selects the *driver* only.
 *
 * `DB` is the shared `BaseSQLiteDatabase` shape: production fulfills it with the
 * expo-sqlite driver on a persistent on-device file, tests with the dev-only
 * better-sqlite3 driver installed through `setDbFactory` — one schema, two
 * drivers, same migrations (ticket #3).
 */
export type DB = BaseSQLiteDatabase<'sync', unknown, typeof schema>;

type DbFactory = () => DB;

let factory: DbFactory | undefined;
let cached: DB | undefined;

/**
 * Point the seam at a different connection factory (tests pass a throwaway
 * in-memory database; `undefined` restores production). Resets the cached handle
 * so the next `getDb()` reflects the swap.
 */
export function setDbFactory(next: DbFactory | undefined): void {
  factory = next;
  cached = undefined;
}

/**
 * The process-wide database connection, opened once and reused. Migration runs
 * against this same handle, so a restarted app reopens the same on-device file
 * and finds its data intact.
 */
export function getDb(): DB {
  if (!cached) {
    cached = factory ? factory() : drizzle(SQLite.openDatabaseSync('crowbar.db'), { schema });
  }
  return cached;
}
