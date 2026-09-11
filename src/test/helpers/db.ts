import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { DrizzleConfig } from 'drizzle-orm';

import { migrateDb, schema } from '@/db';

/**
 * The parts of the better-sqlite3 client the suite touches. Declared
 * structurally so the tests don't depend on the package's type story
 * (@types/better-sqlite3 is a legacy stub).
 */
export interface SqliteClient {
  close(): void;
  prepare(source: string): {
    get(...params: unknown[]): unknown;
    all(...params: unknown[]): unknown[];
  };
}

/** The test driver's exact type: better-sqlite3-backed Drizzle over our schema. */
export type TestDb = BetterSQLite3Database<typeof schema> & { $client: SqliteClient };

/**
 * The dev-only test driver: better-sqlite3 backing the *same* Drizzle schema
 * (ADR 0005, ticket #3). Every test opens its own handle so cases never share
 * state; `migrateDb` runs the production migration bundle against this driver —
 * one schema and one migration source for both worlds.
 */
export function openDb(): TestDb {
  const config: DrizzleConfig<typeof schema> = { schema };
  return drizzle(new Database(':memory:'), config);
}

/** Open a fresh in-memory database, migrated from empty to the current schema. */
export async function freshDb(): Promise<TestDb> {
  const db = openDb();
  await migrateDb(db);
  return db;
}

/**
 * Open a database backed by a real file (for reopen/upgrade tests), migrated
 * from empty. The file lives outside the repo so the suite never touches
 * production storage.
 */
export async function freshFileDb(path: string): Promise<TestDb> {
  const config: DrizzleConfig<typeof schema> = { schema };
  const db = drizzle(new Database(path), config);
  await migrateDb(db);
  return db;
}

/** Close the underlying better-sqlite3 file handle. */
export function closeDb(db: TestDb): void {
  db.$client.close();
}
