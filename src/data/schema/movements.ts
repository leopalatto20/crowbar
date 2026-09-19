import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { trainees } from "./trainees";

export const movements = sqliteTable(
  "movements",
  {
    id: text("id").primaryKey(),
    traineeId: text("trainee_id")
      .notNull()
      .references(() => trainees.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    createdAt: integer("created_at").notNull(),
    archivedAt: integer("archived_at"),
  },
  (table) => [
    index("movements_by_trainee").on(
      table.traineeId,
      table.archivedAt,
      table.name,
    ),
  ],
);

export type Movement = typeof movements.$inferSelect;
