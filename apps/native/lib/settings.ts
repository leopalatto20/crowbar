import { useSuspenseQuery } from "@tanstack/react-query";

import { useDb } from "@/db/context";
import { dbQuery } from "@/db/query";
import { settings } from "@/db/schema";
import { getSettings } from "@/db/settings";

export function useSettings() {
  const db = useDb();
  return useSuspenseQuery(dbQuery(db, { tables: [settings], key: ["settings"], fn: getSettings }))
    .data;
}
