import { desc, sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  integer,
  real,
  sqliteTable,
  text,
  unique,
} from "drizzle-orm/sqlite-core";

import { machines } from "./machines";
import { workoutMovementPrescriptions } from "./workout-movement-prescriptions";
import { workoutPrescribedSets } from "./workout-prescribed-sets";

export const performedSets = sqliteTable(
  "performed_sets",
  {
    id: text("id").primaryKey(),
    workoutMovementPrescriptionId: text("workout_movement_prescription_id")
      .notNull()
      .references(() => workoutMovementPrescriptions.id, {
        onDelete: "restrict",
      }),
    workoutPrescribedSetId: text("workout_prescribed_set_id"),
    machineId: text("machine_id")
      .notNull()
      .references(() => machines.id, { onDelete: "restrict" }),
    position: integer("position").notNull(),
    repetitions: integer("repetitions").notNull(),
    loadValue: real("load_value").notNull(),
    effortValue: real("effort_value"),
    performedAt: integer("performed_at").notNull(),
  },
  (table) => [
    unique().on(table.workoutMovementPrescriptionId, table.position),
    foreignKey({
      columns: [
        table.workoutPrescribedSetId,
        table.workoutMovementPrescriptionId,
      ],
      foreignColumns: [
        workoutPrescribedSets.id,
        workoutPrescribedSets.workoutMovementPrescriptionId,
      ],
    }).onDelete("restrict"),
    check("performed_sets_position_check", sql`${table.position} >= 0`),
    check("performed_sets_repetitions_check", sql`${table.repetitions} >= 0`),
    check("performed_sets_load_value_check", sql`${table.loadValue} >= 0`),
    index("performed_sets_by_machine").on(
      table.machineId,
      desc(table.performedAt),
    ),
  ],
);

export type PerformedSet = typeof performedSets.$inferSelect;
