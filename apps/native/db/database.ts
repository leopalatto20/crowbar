import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";

import type * as schema from "./schema";

// Both drivers Crowbar runs on are synchronous: expo-sqlite in the app and bun:sqlite in tests.
// Typing the data module against their common base lets the same functions run on either.
export type Database = BaseSQLiteDatabase<"sync", unknown, typeof schema>;
