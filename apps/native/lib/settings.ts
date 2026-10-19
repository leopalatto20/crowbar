import { useSuspenseQuery } from "@tanstack/react-query";

import { useDb } from "@/db/context";
import { dbQuery } from "@/db/query";
import { settings } from "@/db/schema";
import { type MenuList, getSettings, markMenuUsed } from "@/db/settings";

export function useSettings() {
  const db = useDb();
  return useSuspenseQuery(dbQuery(db, { tables: [settings], key: ["settings"], fn: getSettings }))
    .data;
}

// A list shows its long-press hint until the lifter first picks something from that menu.
export function useMenuHint(list: MenuList) {
  const db = useDb();
  const used = useSettings()[`${list}MenuUsed`];
  return {
    showMenuHint: !used,
    onMenuUse: () => {
      if (!used) markMenuUsed(db, list);
    },
  };
}
