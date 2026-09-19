import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { loadRepresentations } from "./load-representations";
import { gyms } from "./gyms";

export const machines = sqliteTable(
  "machines",
  {
    id: text("id").primaryKey(),
    gymId: text("gym_id")
      .notNull()
      .references(() => gyms.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    loadRepresentationCode: text("load_representation_code")
      .notNull()
      .references(() => loadRepresentations.code, { onDelete: "restrict" }),
    notes: text("notes"),
    createdAt: integer("created_at").notNull(),
    archivedAt: integer("archived_at"),
  },
  (table) => [
    index("machines_by_gym").on(table.gymId, table.archivedAt, table.name),
  ],
);

export type Machine = typeof machines.$inferSelect;
