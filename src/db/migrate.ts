import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import type { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';

import migrations from './migrations/migrations';
import type { DB } from './get-db';
import * as schema from './schema';

/**
 * Apply all pending SQL migrations to `db` and advance the journal.
 *
 * Bundled migration files (see `src/db/migrations/migrations.js`) run on first launch and
 * on every later upgrade; a pending migration is a startup state, never a crash —
 * callers that cannot proceed should surface the state, not throw program-wide.
 *
 * The migrator drives the shared SQLite dialect through the session, so it runs
 * against whichever driver `DB` wraps — expo-sqlite in the app, better-sqlite3
 * in tests (ticket #3).
 */
export async function migrateDb(db: DB): Promise<void> {
  await migrate(db as ExpoSQLiteDatabase<typeof schema>, migrations);
}
