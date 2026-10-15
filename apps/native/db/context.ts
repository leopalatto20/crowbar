import { createContext, use } from "react";

import type { Database } from "./database";

export const DatabaseContext = createContext<Database | null>(null);

export function useDb() {
  const db = use(DatabaseContext);
  if (!db) throw new Error("useDb must be used inside DatabaseProvider");
  return db;
}

export type DatabaseReplacement = {
  // The folder holding the database, as a plain path.
  folder: string;
  // Replaces the database with the Backup staged beside it. The app unmounts while it runs.
  restore: () => void;
  undoRestore: () => void;
};

export const DatabaseReplacementContext = createContext<DatabaseReplacement | null>(null);

export function useDatabaseReplacement() {
  const replacement = use(DatabaseReplacementContext);
  if (!replacement) throw new Error("useDatabaseReplacement must be used inside DatabaseProvider");
  return replacement;
}
