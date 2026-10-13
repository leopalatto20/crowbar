import { type SQLWrapper, sql } from "drizzle-orm";
import { check, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// Relative imports: drizzle-kit loads this file without the app's path aliases.
import { EFFORTS, UNITS } from "../lib/workout/model";

export const SETTINGS_ID = 1;

// CHECK constraints can't take bound parameters, so the allowed values are inlined as literals.
function oneOf(column: SQLWrapper, values: readonly string[]) {
  return sql`${column} in ${sql.raw(`(${values.map((value) => `'${value}'`).join(", ")})`)}`;
}

export const settings = sqliteTable(
  "settings",
  {
    id: integer("id").primaryKey(),
    effortScale: text("effort_scale", { enum: EFFORTS }).notNull().default("RIR"),
    // No column default: the first launch seeds it from the device region.
    defaultWeightUnit: text("default_weight_unit", { enum: UNITS }).notNull(),
    restTimerEnabled: integer("rest_timer_enabled", { mode: "boolean" }).notNull().default(true),
    defaultRestSeconds: integer("default_rest_seconds").notNull().default(120),
    lastExportedAt: integer("last_exported_at"),
    undoRestorePath: text("undo_restore_path"),
    undoRestoreReplacedAt: integer("undo_restore_replaced_at"),
  },
  (t) => [
    check("settings_single_row", sql`${t.id} = ${sql.raw(String(SETTINGS_ID))}`),
    check("settings_effort_scale", oneOf(t.effortScale, EFFORTS)),
    check("settings_default_weight_unit", oneOf(t.defaultWeightUnit, UNITS)),
    check("settings_default_rest_seconds", sql`${t.defaultRestSeconds} > 0`),
  ],
);
