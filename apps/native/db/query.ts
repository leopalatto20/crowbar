import { type QueryClient, type QueryKey, queryOptions } from "@tanstack/react-query";
import { getTableName } from "drizzle-orm";
import type { SQLiteTable } from "drizzle-orm/sqlite-core";
import { addDatabaseChangeListener } from "expo-sqlite";

import type { Database } from "./database";

declare module "@tanstack/react-query" {
  interface Register {
    queryMeta: { tables: string[] };
  }
}

// Every screen read goes through here: declaring the tables a query reads is what lets
// invalidateOnChange refresh it after any write, so no command has to remember its readers.
export function dbQuery<T>(
  db: Database,
  { tables, key, fn }: { tables: SQLiteTable[]; key: QueryKey; fn: (db: Database) => T },
) {
  return queryOptions({
    queryKey: key,
    queryFn: () => fn(db),
    meta: { tables: tables.map(getTableName) },
    networkMode: "always",
    // Cached data only goes stale through a write, and invalidateOnChange catches every write.
    staleTime: Infinity,
  });
}

// One write can touch many rows across tables; collecting a tick's worth of change events
// invalidates each affected query once instead of once per row.
export function invalidateOnChange(queryClient: QueryClient) {
  const changed = new Set<string>();
  let flush: ReturnType<typeof setTimeout> | null = null;

  const subscription = addDatabaseChangeListener(({ tableName }) => {
    changed.add(tableName);
    flush ??= setTimeout(() => {
      const tables = new Set(changed);
      changed.clear();
      flush = null;
      void queryClient.invalidateQueries({
        predicate: (query) => query.meta?.tables.some((table) => tables.has(table)) ?? false,
      });
    }, 0);
  });

  return () => {
    subscription.remove();
    if (flush) clearTimeout(flush);
  };
}
