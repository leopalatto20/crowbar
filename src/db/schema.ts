import { sql } from 'drizzle-orm';
import { index, int, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

import { DEFAULT_UNIT, DEFAULT_VOLUME_MAX, DEFAULT_VOLUME_MIN } from './constants';

/**
 * Crowbar persistence schema.
 *
 * Single source of truth for storage (ADR 0005). No `exercise` table exists —
 * Exercise is the *derived* pair Movement × Equipment class (ADR 0001). Loads are
 * stored canonically in pounds (ADR 0004). Every stored proximity value records
 * the Recording scale it was written in, so switching the input scale never
 * corrupts history.
 */
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

/**
 * Closed canonical set of primary muscle groups. Each carries a weekly Volume
 * landmark (uniform 4–8 counted sets by default, editable). Global — a muscle
 * group does not know which gym the work happened in.
 */
export const muscleGroups = sqliteTable('muscle_groups', {
  id: int('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  volumeMin: int('volume_min').notNull().default(DEFAULT_VOLUME_MIN),
  volumeMax: int('volume_max').notNull().default(DEFAULT_VOLUME_MAX),
});

/**
 * A canonical, gym-agnostic lift (e.g. "Bench Press"). Lives once, is the text of
 * every routine, and remembers the unit it is logged in (kg or lb).
 */
export const movements = sqliteTable(
  'movements',
  {
    id: int('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    primaryMuscleGroupId: int('primary_muscle_group_id')
      .notNull()
      .references(() => muscleGroups.id),
    // Recording unit: 'kg' | 'lb', defaulting from the app-wide setting.
    unit: text('unit').notNull().default(DEFAULT_UNIT),
    instructions: text('instructions'),
    archived: int('archived').notNull().default(0),
  },
  (t) => [uniqueIndex('movements_name_unique').on(sql`lower(replace(${t.name}, ' ', ''))`)],
);

/**
 * A gym-agnostic, ordered list of movements with optional targets.
 */
export const routines = sqliteTable('routines', {
  id: int('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  archived: int('archived').notNull().default(0),
});

export const routineEntries = sqliteTable(
  'routine_entries',
  {
    id: int('id').primaryKey({ autoIncrement: true }),
    routineId: int('routine_id')
      .notNull()
      .references(() => routines.id, { onDelete: 'cascade' }),
    position: int('position').notNull(),
    movementId: int('movement_id')
      .notNull()
      .references(() => movements.id),
    // Optional targets.
    workingSetCount: int('working_set_count'),
    repMin: int('rep_min'),
    repMax: int('rep_max'),
    // Proximity target + the Recording scale it was written in ('rir'|'rpe').
    proximityValue: real('proximity_value'),
    proximityScale: text('proximity_scale'),
    tempo: text('tempo'),
  },
  (t) => [index('routine_entries_routine_idx').on(t.routineId)],
);

/**
 * A location context the lifter trains in. Declares nothing — a gym is whatever
 * exercises the lifter actually uses there. Home exists by default.
 */
export const gyms = sqliteTable('gyms', {
  id: int('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  isHome: int('is_home').notNull().default(0),
  archived: int('archived').notNull().default(0),
});

/**
 * A routine adapted to a specific gym — the recorded binding of each movement to
 * the exercise (equipment class) the lifter used there. One per Routine × Gym.
 */
export const subRoutines = sqliteTable(
  'sub_routines',
  {
    id: int('id').primaryKey({ autoIncrement: true }),
    routineId: int('routine_id')
      .notNull()
      .references(() => routines.id),
    gymId: int('gym_id')
      .notNull()
      .references(() => gyms.id),
  },
  (t) => [uniqueIndex('sub_routines_routine_gym_uk').on(t.routineId, t.gymId)],
);

export const subRoutineEntries = sqliteTable(
  'sub_routine_entries',
  {
    id: int('id').primaryKey({ autoIncrement: true }),
    subRoutineId: int('sub_routine_id')
      .notNull()
      .references(() => subRoutines.id, { onDelete: 'cascade' }),
    position: int('position').notNull(),
    movementId: int('movement_id')
      .notNull()
      .references(() => movements.id),
    // The Equipment class bound at this gym (Exercise = Movement × class).
    equipmentClass: text('equipment_class').notNull(),
  },
  (t) => [index('sub_routine_entries_subroutine_idx').on(t.subRoutineId)],
);

/**
 * One visit to one gym, from starting a sub-routine (or empty plan) to finishing.
 */
export const sessions = sqliteTable(
  'sessions',
  {
    id: int('id').primaryKey({ autoIncrement: true }),
    gymId: int('gym_id')
      .notNull()
      .references(() => gyms.id),
    subRoutineId: int('sub_routine_id').references(() => subRoutines.id),
    startedAt: int('started_at').notNull(),
    endedAt: int('ended_at'),
  },
  (t) => [index('sessions_gym_idx').on(t.gymId)],
);

export const sessionEntries = sqliteTable(
  'session_entries',
  {
    id: int('id').primaryKey({ autoIncrement: true }),
    sessionId: int('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    position: int('position').notNull(),
    movementId: int('movement_id')
      .notNull()
      .references(() => movements.id),
    equipmentClass: text('equipment_class').notNull(),
    skipped: int('skipped').notNull().default(0),
  },
  (t) => [index('session_entries_session_idx').on(t.sessionId)],
);

export const sets = sqliteTable(
  'sets',
  {
    id: int('id').primaryKey({ autoIncrement: true }),
    sessionEntryId: int('session_entry_id')
      .notNull()
      .references(() => sessionEntries.id, { onDelete: 'cascade' }),
    // Load in canonical pounds regardless of display unit (ADR 0004).
    loadLb: real('load_lb').notNull(),
    reps: int('reps').notNull(),
    // Optional proximity value + the Recording scale it was written in.
    proximityValue: real('proximity_value'),
    proximityScale: text('proximity_scale'),
    // Denormalized from session_entries: a set carries the class it was logged
    // under so island grouping needs no join (kept truthful to the map's sets
    // shape: "Equipment class" + timestamp).
    equipmentClass: text('equipment_class').notNull(),
    recordedAt: int('recorded_at').notNull(),
  },
  (t) => [index('sets_session_entry_idx').on(t.sessionEntryId)],
);
