import { useSuspenseQuery } from "@tanstack/react-query";

import { useDb } from "@/db/context";
import { currentGym, listGyms } from "@/db/gyms";
import { dbQuery } from "@/db/query";
import { gym, workout } from "@/db/schema";

export function useGyms() {
  const db = useDb();
  return useSuspenseQuery(dbQuery(db, { tables: [gym], key: ["gyms"], fn: listGyms })).data;
}

// Null rather than undefined while there is none: React Query never caches undefined.
export function useCurrentGym() {
  const db = useDb();
  return useSuspenseQuery(
    dbQuery(db, {
      tables: [workout, gym],
      key: ["currentGym"],
      fn: (db) => currentGym(db) ?? null,
    }),
  ).data;
}
