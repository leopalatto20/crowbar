import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const effortMetrics = sqliteTable("effort_metrics", {
  code: text("code").primaryKey(),
});

export type EffortMetric = typeof effortMetrics.$inferSelect;
