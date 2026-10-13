import { type SQLWrapper, sql } from "drizzle-orm";
import { check, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// Relative imports: drizzle-kit loads this file without the app's path aliases.
import { EQUIPMENT_TYPES, LOAD_TYPES, MUSCLE_GROUPS } from "../lib/exercise/model";
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

export const exercise = sqliteTable(
  "exercise",
  {
    // A Crowbar-owned slug for Built-in Exercises, a UUIDv7 for everything else.
    id: text("id").primaryKey(),
    // English for Built-in Exercises; a Custom Exercise's name as the lifter typed it.
    name: text("name").notNull(),
    // Only Built-in Exercises are translated.
    nameEs: text("name_es"),
    equipmentType: text("equipment_type", { enum: EQUIPMENT_TYPES }).notNull().default("other"),
    loadType: text("load_type", { enum: LOAD_TYPES }).notNull().default("external"),
    unilateral: integer("unilateral", { mode: "boolean" }).notNull().default(false),
    muscleGroup: text("muscle_group", { enum: MUSCLE_GROUPS }),
    builtIn: integer("built_in", { mode: "boolean" }).notNull().default(false),
    hidden: integer("hidden", { mode: "boolean" }).notNull().default(false),
  },
  (t) => [
    check("exercise_equipment_type", oneOf(t.equipmentType, EQUIPMENT_TYPES)),
    check("exercise_load_type", oneOf(t.loadType, LOAD_TYPES)),
    // A null Muscle group passes: CHECK only rejects false, and `NULL in (...)` is null.
    check("exercise_muscle_group", oneOf(t.muscleGroup, MUSCLE_GROUPS)),
  ],
);
