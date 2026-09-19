import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { effortMetrics } from "./effort-metrics";

export const trainees = sqliteTable("trainees", {
  id: text("id").primaryKey(),
  displayName: text("display_name").notNull(),
  currentEffortMetricCode: text("current_effort_metric_code")
    .notNull()
    .references(() => effortMetrics.code, { onDelete: "restrict" }),
  createdAt: integer("created_at").notNull(),
  archivedAt: integer("archived_at"),
});

export type Trainee = typeof trainees.$inferSelect;
