import { sql } from "drizzle-orm";
import {
  check,
  integer,
  sqliteTable,
  text,
  unique,
} from "drizzle-orm/sqlite-core";

import { movements } from "./movements";
import { routines } from "./routines";

export const movementPrescriptions = sqliteTable(
  "movement_prescriptions",
  {
    id: text("id").primaryKey(),
    routineId: text("routine_id")
      .notNull()
      .references(() => routines.id, { onDelete: "cascade" }),
    movementId: text("movement_id")
      .notNull()
      .references(() => movements.id, { onDelete: "restrict" }),
    position: integer("position").notNull(),
    instructions: text("instructions"),
  },
  (table) => [
    unique().on(table.routineId, table.position),
    check("movement_prescriptions_position_check", sql`${table.position} >= 0`),
  ],
);

export type MovementPrescription = typeof movementPrescriptions.$inferSelect;
