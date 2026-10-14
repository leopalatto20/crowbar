import { type SQLWrapper, sql } from "drizzle-orm";
import { check, index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

// Relative imports: drizzle-kit loads this file without the app's path aliases.
import { EQUIPMENT_TYPES, LOAD_TYPES, MUSCLE_GROUPS } from "../lib/exercise/model";
import { EFFORTS, SET_KINDS, UNITS } from "../lib/workout/model";

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

export const routine = sqliteTable("routine", {
  id: text("id").primaryKey(),
  // May be blank while the lifter is still naming a new Routine.
  name: text("name").notNull(),
  // The lifter's manual order on the Workout tab.
  position: integer("position").notNull(),
});

// Target columns are nullable: a Routine built from a Workout may not have every Target yet.
export const routineExercise = sqliteTable(
  "routine_exercise",
  {
    id: text("id").primaryKey(),
    routineId: text("routine_id")
      .notNull()
      .references(() => routine.id, { onDelete: "cascade" }),
    // Deleting a Custom Exercise takes it out of every Routine.
    exerciseId: text("exercise_id")
      .notNull()
      .references(() => exercise.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    warmups: integer("warmups").notNull().default(0),
    sets: integer("sets"),
    repMin: integer("rep_min"),
    repMax: integer("rep_max"),
    rirMin: integer("rir_min"),
    rirMax: integer("rir_max"),
    restSeconds: integer("rest_seconds"),
  },
  (t) => [
    index("routine_exercise_routine_id").on(t.routineId),
    index("routine_exercise_exercise_id").on(t.exerciseId),
    check("routine_exercise_warmups", sql`${t.warmups} >= 0`),
    check("routine_exercise_sets", sql`${t.sets} > 0`),
    // A range is either fully planned or left blank.
    check("routine_exercise_reps", sql`(${t.repMin} is null) = (${t.repMax} is null)`),
    check("routine_exercise_rep_range", sql`0 < ${t.repMin} and ${t.repMin} <= ${t.repMax}`),
    check("routine_exercise_rir", sql`(${t.rirMin} is null) = (${t.rirMax} is null)`),
    check("routine_exercise_rir_range", sql`0 <= ${t.rirMin} and ${t.rirMin} <= ${t.rirMax}`),
    check("routine_exercise_rest_seconds", sql`${t.restSeconds} > 0`),
  ],
);

export const gym = sqliteTable("gym", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
});

// One Exercise on specific equipment at one Gym (ADR 0001). Created implicitly by the first
// logged set of an Exercise at a Gym.
export const station = sqliteTable(
  "station",
  {
    id: text("id").primaryKey(),
    exerciseId: text("exercise_id")
      .notNull()
      .references(() => exercise.id, { onDelete: "cascade" }),
    gymId: text("gym_id")
      .notNull()
      .references(() => gym.id, { onDelete: "cascade" }),
    unit: text("unit", { enum: UNITS }).notNull(),
  },
  (t) => [
    index("station_exercise_id_gym_id").on(t.exerciseId, t.gymId),
    index("station_gym_id").on(t.gymId),
    check("station_unit", oneOf(t.unit, UNITS)),
  ],
);

export const workout = sqliteTable(
  "workout",
  {
    id: text("id").primaryKey(),
    gymId: text("gym_id")
      .notNull()
      .references(() => gym.id, { onDelete: "cascade" }),
    startedAt: integer("started_at").notNull(),
    finishedAt: integer("finished_at"),
    // IANA name, so a Workout's times read in the zone it was logged in, wherever it's viewed.
    timeZone: text("time_zone").notNull(),
  },
  (t) => [index("workout_gym_id").on(t.gymId)],
);

export const workoutExercise = sqliteTable(
  "workout_exercise",
  {
    id: text("id").primaryKey(),
    workoutId: text("workout_id")
      .notNull()
      .references(() => workout.id, { onDelete: "cascade" }),
    exerciseId: text("exercise_id")
      .notNull()
      .references(() => exercise.id, { onDelete: "cascade" }),
    // Null until the first logged set when the Gym has no Station for the Exercise yet.
    stationId: text("station_id").references(() => station.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
  },
  (t) => [
    index("workout_exercise_workout_id").on(t.workoutId),
    index("workout_exercise_exercise_id").on(t.exerciseId),
    index("workout_exercise_station_id").on(t.stationId),
  ],
);

// Every visible set in the Ledger is a row, written field by field as the lifter commits it.
export const workoutSet = sqliteTable(
  "set",
  {
    id: text("id").primaryKey(),
    workoutExerciseId: text("workout_exercise_id")
      .notNull()
      .references(() => workoutExercise.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    kind: text("kind", { enum: SET_KINDS }).notNull().default("working"),
    // As entered; the unit comes from the Station.
    load: real("load"),
    reps: integer("reps"),
    // Effort is always stored as RIR; RPE is only a display.
    rir: integer("rir"),
    done: integer("done", { mode: "boolean" }).notNull().default(false),
  },
  (t) => [
    index("set_workout_exercise_id").on(t.workoutExerciseId),
    check("set_kind", oneOf(t.kind, SET_KINDS)),
    check("set_logged", sql`not ${t.done} or (${t.load} is not null and ${t.reps} is not null)`),
    check("set_warmup_effort", sql`${t.kind} = 'working' or ${t.rir} is null`),
    check("set_load", sql`${t.load} >= 0`),
    check("set_reps", sql`${t.reps} >= 0`),
    check("set_rir", sql`${t.rir} between 0 and 10`),
  ],
);
