import { sql } from "drizzle-orm";
import {
  check,
  integer,
  real,
  sqliteTable,
  text,
  unique,
} from "drizzle-orm/sqlite-core";

import { effortMetrics } from "./effort-metrics";
import { movementPrescriptions } from "./movement-prescriptions";

export const prescribedSets = sqliteTable(
  "prescribed_sets",
  {
    id: text("id").primaryKey(),
    movementPrescriptionId: text("movement_prescription_id")
      .notNull()
      .references(() => movementPrescriptions.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    targetRepetitionsMin: integer("target_repetitions_min"),
    targetRepetitionsMax: integer("target_repetitions_max"),
    targetEffortMetricCode: text("target_effort_metric_code").references(
      () => effortMetrics.code,
      { onDelete: "restrict" },
    ),
    targetEffortMin: real("target_effort_min"),
    targetEffortMax: real("target_effort_max"),
  },
  (table) => [
    unique().on(table.movementPrescriptionId, table.position),
    check("prescribed_sets_position_check", sql`${table.position} >= 0`),
    check(
      "prescribed_sets_target_repetitions_min_check",
      sql`${table.targetRepetitionsMin} IS NULL OR ${table.targetRepetitionsMin} >= 0`,
    ),
    check(
      "prescribed_sets_target_repetitions_max_check",
      sql`${table.targetRepetitionsMax} IS NULL OR ${table.targetRepetitionsMax} >= 0`,
    ),
    check(
      "prescribed_sets_target_repetitions_order_check",
      sql`${table.targetRepetitionsMin} IS NULL OR ${table.targetRepetitionsMax} IS NULL OR ${table.targetRepetitionsMax} >= ${table.targetRepetitionsMin}`,
    ),
    check(
      "prescribed_sets_target_effort_presence_check",
      sql`(
        (${table.targetEffortMetricCode} IS NULL AND ${table.targetEffortMin} IS NULL AND ${table.targetEffortMax} IS NULL)
        OR
        (${table.targetEffortMetricCode} IS NOT NULL AND (${table.targetEffortMin} IS NOT NULL OR ${table.targetEffortMax} IS NOT NULL))
      )`,
    ),
    check(
      "prescribed_sets_target_effort_order_check",
      sql`${table.targetEffortMin} IS NULL OR ${table.targetEffortMax} IS NULL OR ${table.targetEffortMax} >= ${table.targetEffortMin}`,
    ),
  ],
);

export type PrescribedSet = typeof prescribedSets.$inferSelect;
