import * as SQLite from 'expo-sqlite';
import { drizzle, type ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';

import * as schema from './schema';

/**
 * The app's typed Drizzle connection. The schema is the single source of truth
 * (ADR 0005); this seam selects the *driver* only.
 *
 * Production uses the expo-sqlite driver on a persistent on-device file. Tests
 * (ticket #3) swap in a dev-only driver (better-sqlite3) through
 * `setDbFactory` — one schema, two drivers. Ticket #3 may widen `DB` to a shared
 * `BaseSQLiteDatabase` shape when it introduces the test driver.
 */
export type DB = ExpoSQLiteDatabase<typeof schema>;

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
		cached = factory
			? factory()
			: drizzle(SQLite.openDatabaseSync('crowbar.db'), { schema });
	}
	return cached;
}