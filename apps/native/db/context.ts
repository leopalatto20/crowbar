import { createContext, use } from "react";

import type { Database } from "./database";

export const DatabaseContext = createContext<Database | null>(null);

export function useDb() {
  const db = use(DatabaseContext);
  if (!db) throw new Error("useDb must be used inside DatabaseProvider");
  return db;
}
