import { type SQLWrapper, sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

// Relative imports: drizzle-kit loads this file without the app's path aliases.
import { EQUIPMENT_TYPES, LOAD_TYPES, MUSCLE_GROUPS } from "../lib/exercise/model";
import { EFFORTS, SET_KINDS, UNITS, WORKOUT_EDIT_KINDS } from "../lib/workout/model";

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
    // Android reports notifications as denied before it has ever asked, so only this tells a
    // first Rest apart from a lifter who already declined.
    notificationsAsked: integer("notifications_asked", { mode: "boolean" })
      .notNull()
      .default(false),
    // Once the lifter has acted from a list's long-press menu, the hint pointing at it goes.
    routineMenuUsed: integer("routine_menu_used", { mode: "boolean" }).notNull().default(false),
    exerciseMenuUsed: integer("exercise_menu_used", { mode: "boolean" }).notNull().default(false),
    gymMenuUsed: integer("gym_menu_used", { mode: "boolean" }).notNull().default(false),
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
// logged set or machine note of an Exercise at a Gym, or explicitly as a further Station.
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
    // Unnamed until the Gym holds a second Station for the Exercise.
    label: text("label"),
    notes: text("notes"),
    // Its equipment is gone from the Gym; its history stays readable.
    retired: integer("retired", { mode: "boolean" }).notNull().default(false),
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
    // The Routine it started from. Deleting the Routine only unlinks it; the name stays as it
    // read at the start, so later renames never rewrite history.
    routineId: text("routine_id").references(() => routine.id, { onDelete: "set null" }),
    routineName: text("routine_name"),
    startedAt: integer("started_at").notNull(),
    finishedAt: integer("finished_at"),
    // IANA name, so a Workout's times read in the zone it was logged in, wherever it's viewed.
    timeZone: text("time_zone").notNull(),
  },
  (t) => [
    index("workout_gym_id").on(t.gymId),
    index("workout_routine_id_started_at").on(t.routineId, t.startedAt),
    // At most one Workout is in progress. Unique on the expression, not on finished_at itself,
    // because a unique index treats every null as distinct.
    uniqueIndex("workout_in_progress")
      .on(sql`(${t.finishedAt} is null)`)
      .where(sql`${t.finishedAt} is null`),
  ],
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
    // The Routine slot it was snapshotted from, which write-back edits; null for an Exercise added
    // mid-Workout, or once the slot is gone from the Routine.
    routineExerciseId: text("routine_exercise_id").references(() => routineExercise.id, {
      onDelete: "set null",
    }),
    position: integer("position").notNull(),
    // Snapshotted from the Routine slot at the start; blank for an Exercise added mid-Workout.
    sets: integer("sets"),
    repMin: integer("rep_min"),
    repMax: integer("rep_max"),
    rirMin: integer("rir_min"),
    rirMax: integer("rir_max"),
    restSeconds: integer("rest_seconds"),
  },
  (t) => [
    index("workout_exercise_workout_id").on(t.workoutId),
    index("workout_exercise_exercise_id").on(t.exerciseId),
    index("workout_exercise_station_id").on(t.stationId),
    index("workout_exercise_routine_exercise_id").on(t.routineExerciseId),
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

// The Swap / Add / Remove / Move edits made to a Workout started from a Routine, in the order they
// were made, for write-back to replay by slot. Recorded explicitly rather than read off the result,
// so an Exercise that simply wasn't logged is never taken for a removal.
export const workoutEdit = sqliteTable(
  "workout_edit",
  {
    id: text("id").primaryKey(),
    workoutId: text("workout_id")
      .notNull()
      .references(() => workout.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    kind: text("kind", { enum: WORKOUT_EDIT_KINDS }).notNull(),
    // The Routine slot a Swap, Remove or Move edits. Null once the slot is gone from the Routine,
    // which write-back skips.
    routineExerciseId: text("routine_exercise_id").references(() => routineExercise.id, {
      onDelete: "set null",
    }),
    // The Exercise a Swap puts in the slot.
    exerciseId: text("exercise_id").references(() => exercise.id, { onDelete: "cascade" }),
    // The Exercise a Swap, Add or Move edited in the Workout. Removing it, or finishing with
    // nothing logged on it, takes its edits with it: an unlogged Exercise records nothing. Write-back
    // places these by where the Exercise sits in the Ledger at finish.
    workoutExerciseId: text("workout_exercise_id").references(() => workoutExercise.id, {
      onDelete: "cascade",
    }),
  },
  (t) => [
    index("workout_edit_workout_id").on(t.workoutId),
    index("workout_edit_routine_exercise_id").on(t.routineExerciseId),
    index("workout_edit_exercise_id").on(t.exerciseId),
    index("workout_edit_workout_exercise_id").on(t.workoutExerciseId),
    check("workout_edit_kind", oneOf(t.kind, WORKOUT_EDIT_KINDS)),
    check("workout_edit_swap", sql`(${t.kind} = 'swap') = (${t.exerciseId} is not null)`),
    // A Remove has no Exercise left in the Workout to point at.
    check("workout_edit_remove", sql`(${t.kind} = 'remove') = (${t.workoutExerciseId} is null)`),
  ],
);

export const REST_ID = 1;

// The one Rest running, if any, kept as times rather than a countdown so it reconciles after a
// kill. It's never part of history, so it hangs off the set that started it and goes with it.
export const rest = sqliteTable(
  "rest",
  {
    id: integer("id").primaryKey(),
    setId: text("set_id")
      .notNull()
      .references(() => workoutSet.id, { onDelete: "cascade" }),
    startedAt: integer("started_at").notNull(),
    endsAt: integer("ends_at").notNull(),
  },
  (t) => [
    check("rest_single_row", sql`${t.id} = ${sql.raw(String(REST_ID))}`),
    index("rest_set_id").on(t.setId),
  ],
);
