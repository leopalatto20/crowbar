import { desc } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { effortMetrics } from "./effort-metrics";
import { gyms } from "./gyms";
import { routines } from "./routines";

export const workouts = sqliteTable(
  "workouts",
  {
    id: text("id").primaryKey(),
    routineId: text("routine_id")
      .notNull()
      .references(() => routines.id, { onDelete: "restrict" }),
    gymId: text("gym_id")
      .notNull()
      .references(() => gyms.id, { onDelete: "restrict" }),
    routineNameSnapshot: text("routine_name_snapshot").notNull(),
    effortMetricCode: text("effort_metric_code")
      .notNull()
      .references(() => effortMetrics.code, { onDelete: "restrict" }),
    startedAt: integer("started_at").notNull(),
    completedAt: integer("completed_at"),
  },
  (table) => [
    index("workouts_by_gym").on(table.gymId, desc(table.startedAt)),
    index("workouts_by_routine").on(table.routineId, desc(table.startedAt)),
  ],
);

export type Workout = typeof workouts.$inferSelect;
