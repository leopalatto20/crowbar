import { migrate } from 'drizzle-orm/expo-sqlite/migrator';

import migrations from '../drizzle/migrations';
import type { DB } from './get-db';

/**
 * Apply all pending SQL migrations to `db` and advance the journal.
 *
 * Bundled migration files (see `drizzle/migrations.js`) run on first launch and
 * on every later upgrade; a pending migration is a startup state, never a crash —
 * callers that cannot proceed should surface the state, not throw program-wide.
 */
export async function migrateDb(db: DB): Promise<void> {
	await migrate(db, migrations);
}