import { useSuspenseQuery } from "@tanstack/react-query";

import { useDb } from "@/db/context";
import { listGyms } from "@/db/gyms";
import { dbQuery } from "@/db/query";
import { gym } from "@/db/schema";

export function useGyms() {
  const db = useDb();
  return useSuspenseQuery(dbQuery(db, { tables: [gym], key: ["gyms"], fn: listGyms })).data;
}
