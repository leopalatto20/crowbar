import { Database as BunSqlite } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { type Snapshot, openDatabase } from "./open";
import * as schema from "./schema";
import { getSettings, seedSettings } from "./settings";
import { MIGRATIONS_FOLDER } from "./test-database";

let directory: string;
let snapshot: Snapshot;

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "crowbar-open-"));
  const path = join(directory, "pre-migration.db");
  snapshot = { path, exists: () => existsSync(path), delete: () => rmSync(path) };
});

afterEach(() => rmSync(directory, { recursive: true }));

// Stands in for a lifter's database written by an app version older than every bundled migration.
function databaseFromAnOlderVersion() {
  const sqlite = new BunSqlite(":memory:");
  sqlite.run("CREATE TABLE lifter_data (value TEXT)");
  sqlite.run("INSERT INTO lifter_data VALUES ('history')");
  return drizzle(sqlite, { schema });
}

function readLifterData(path: string) {
  return new BunSqlite(path, { readonly: true }).query("SELECT value FROM lifter_data").all();
}

const failingMigration = () => {
  throw new Error("migration failed");
};

describe("openDatabase", () => {
  test("a failed migration keeps a snapshot of the data from before it", async () => {
    const db = databaseFromAnOlderVersion();

    await expect(openDatabase(db, { migrate: failingMigration, snapshot })).rejects.toThrow(
      "migration failed",
    );

    expect(readLifterData(snapshot.path)).toEqual([{ value: "history" }]);
  });

  test("a successful migration removes the snapshot and leaves the database ready", async () => {
    const db = databaseFromAnOlderVersion();

    await openDatabase(db, {
      migrate: () => migrate(db, { migrationsFolder: MIGRATIONS_FOLDER }),
      snapshot,
    });

    expect(snapshot.exists()).toBe(false);
    seedSettings(db, "US");
    expect(getSettings(db).defaultWeightUnit).toBe("lb");
  });

  test("relaunching after a failed migration keeps the first snapshot", async () => {
    const db = databaseFromAnOlderVersion();
    await openDatabase(db, { migrate: failingMigration, snapshot }).catch(() => {});

    await expect(openDatabase(db, { migrate: failingMigration, snapshot })).rejects.toThrow(
      "migration failed",
    );

    expect(readLifterData(snapshot.path)).toEqual([{ value: "history" }]);
  });
});
