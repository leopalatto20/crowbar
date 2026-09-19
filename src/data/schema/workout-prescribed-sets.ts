import { sql } from "drizzle-orm";
import {
  check,
  integer,
  real,
  sqliteTable,
  text,
  unique,
} from "drizzle-orm/sqlite-core";

import { workoutMovementPrescriptions } from "./workout-movement-prescriptions";

export const workoutPrescribedSets = sqliteTable(
  "workout_prescribed_sets",
  {
    id: text("id").primaryKey(),
    workoutMovementPrescriptionId: text("workout_movement_prescription_id")
      .notNull()
      .references(() => workoutMovementPrescriptions.id, {
        onDelete: "restrict",
      }),
    position: integer("position").notNull(),
    targetRepetitionsMin: integer("target_repetitions_min"),
    targetRepetitionsMax: integer("target_repetitions_max"),
    targetEffortMin: real("target_effort_min"),
    targetEffortMax: real("target_effort_max"),
  },
  (table) => [
    unique().on(table.workoutMovementPrescriptionId, table.position),
    unique().on(table.id, table.workoutMovementPrescriptionId),
    check(
      "workout_prescribed_sets_position_check",
      sql`${table.position} >= 0`,
    ),
    check(
      "workout_prescribed_sets_target_repetitions_min_check",
      sql`${table.targetRepetitionsMin} IS NULL OR ${table.targetRepetitionsMin} >= 0`,
    ),
    check(
      "workout_prescribed_sets_target_repetitions_max_check",
      sql`${table.targetRepetitionsMax} IS NULL OR ${table.targetRepetitionsMax} >= 0`,
    ),
    check(
      "workout_prescribed_sets_target_repetitions_order_check",
      sql`${table.targetRepetitionsMin} IS NULL OR ${table.targetRepetitionsMax} IS NULL OR ${table.targetRepetitionsMax} >= ${table.targetRepetitionsMin}`,
    ),
    check(
      "workout_prescribed_sets_target_effort_order_check",
      sql`${table.targetEffortMin} IS NULL OR ${table.targetEffortMax} IS NULL OR ${table.targetEffortMax} >= ${table.targetEffortMin}`,
    ),
  ],
);

export type WorkoutPrescribedSet = typeof workoutPrescribedSets.$inferSelect;
