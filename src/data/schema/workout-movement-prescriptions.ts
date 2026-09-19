import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  unique,
} from "drizzle-orm/sqlite-core";

import { movements } from "./movements";
import { workouts } from "./workouts";

export const workoutMovementPrescriptions = sqliteTable(
  "workout_movement_prescriptions",
  {
    id: text("id").primaryKey(),
    workoutId: text("workout_id")
      .notNull()
      .references(() => workouts.id, { onDelete: "restrict" }),
    movementId: text("movement_id")
      .notNull()
      .references(() => movements.id, { onDelete: "restrict" }),
    movementNameSnapshot: text("movement_name_snapshot").notNull(),
    position: integer("position").notNull(),
    instructionsSnapshot: text("instructions_snapshot"),
  },
  (table) => [
    unique().on(table.workoutId, table.position),
    unique().on(table.id, table.workoutId),
    check(
      "workout_movement_prescriptions_position_check",
      sql`${table.position} >= 0`,
    ),
    index("workout_prescriptions_by_movement").on(
      table.movementId,
      table.workoutId,
    ),
  ],
);

export type WorkoutMovementPrescription =
  typeof workoutMovementPrescriptions.$inferSelect;
