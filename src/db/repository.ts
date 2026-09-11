import { and, count, desc, eq, gte, inArray, lt, sql } from 'drizzle-orm';

import {
  DEFAULT_RECORDING_SCALE,
  DEFAULT_UNIT,
  EQUIPMENT_CLASSES,
  MUSCLE_GROUPS,
  RECORDING_SCALES,
  UNITS,
  type EquipmentClass,
  type RecordingScale,
  type Unit,
} from './constants';
import {
  gyms,
  movements,
  muscleGroups,
  routineEntries,
  routines,
  settings,
  sessionEntries,
  sets,
  subRoutineEntries,
  subRoutines,
  sessions,
} from './schema';
import type { DB } from './get-db';

/** Equipment class and Recording scale are closed sets — invalid values are bugs. */
function assertIn(value: string, set: readonly string[], label: string): void {
  if (!set.includes(value)) {
    throw new Error(`Invalid ${label}: \`${value}\`. Expected one of: ${set.join(', ')}`);
  }
}
const equipmentIn = (v: string) => assertIn(v, EQUIPMENT_CLASSES, 'equipment class');

/**
 * Thin repository over the shared connection. Everything here is behavior only —
 * the shape mirrors the domain glossary (Gym, Movement, Routine, Sub-routine,
 * Session, Exercise, Set, Volume landmark). Loads are always handled in pounds
 * (ADR 0004).
 */

const NOW = Date.now;
const intFlag = (v: boolean): 0 | 1 => (v ? 1 : 0);
const DAY_MS = 86_400_000;

/* -------------------------------- Gyms -------------------------------- */

export async function createGym(
  db: DB,
  { name, isHome = false }: { name: string; isHome?: boolean },
) {
  return (
    await db
      .insert(gyms)
      .values({ name, isHome: intFlag(isHome) })
      .returning()
  )[0];
}

export async function getHomeGym(db: DB) {
  return (await db.select().from(gyms).where(eq(gyms.isHome, 1)).limit(1))[0];
}

export async function listGyms(db: DB, { includeArchived = false } = {}) {
  if (includeArchived) {
    return db.select().from(gyms).orderBy(gyms.name);
  }
  return db.select().from(gyms).where(eq(gyms.archived, 0)).orderBy(gyms.name);
}

/* ------------------------------ Movements ------------------------------ */

export type Movement = typeof movements.$inferSelect;

export type NewMovement = {
  name: string;
  primaryMuscleGroupId: number;
  unit?: Unit;
  instructions?: string | null;
};

/** The comparison key for movement names; display spelling is never changed. */
export function normalizeMovementName(name: string): string {
  // Keep this expression aligned with movements_name_unique in schema.ts.
  return name.trim().replace(/ /g, '').toLowerCase();
}

function assertMovementName(name: string): string {
  if (!normalizeMovementName(name)) {
    throw new Error('Movement name cannot be blank.');
  }
  return name.trim();
}

async function assertMuscleGroupExists(db: DB, id: number): Promise<void> {
  const group = await db
    .select({ id: muscleGroups.id })
    .from(muscleGroups)
    .where(eq(muscleGroups.id, id))
    .limit(1);
  if (!group[0]) {
    throw new Error(`Muscle group ${id} does not exist.`);
  }
}

export async function getDefaultUnit(db: DB): Promise<Unit> {
  const row = (
    await db
      .select({ value: settings.value })
      .from(settings)
      .where(eq(settings.key, 'default_unit'))
      .limit(1)
  )[0];
  return row && UNITS.includes(row.value) ? (row.value as Unit) : DEFAULT_UNIT;
}

async function findExactMovement(
  db: DB,
  name: string,
  excludeId?: number,
): Promise<Movement | null> {
  const normalized = normalizeMovementName(name);
  if (!normalized) return null;
  const rows = await db.select().from(movements).orderBy(movements.id);
  return (
    rows.find((row) => row.id !== excludeId && normalizeMovementName(row.name) === normalized) ??
    null
  );
}

function movementConstraintError(error: unknown): Error {
  if (error instanceof Error && /unique|constraint/i.test(error.message)) {
    return new Error('A movement with that name already exists (names ignore case and spacing).');
  }
  return error instanceof Error ? error : new Error(String(error));
}

export async function createMovement(db: DB, movement: NewMovement): Promise<Movement> {
  const name = assertMovementName(movement.name);
  const unit = movement.unit === undefined ? await getDefaultUnit(db) : movement.unit;
  assertIn(unit, UNITS, 'unit');
  await assertMuscleGroupExists(db, movement.primaryMuscleGroupId);
  // Check immediately before the write; SQLite's unique index remains the final
  // defense for concurrent writers and legacy data.
  if (await findExactMovement(db, name)) {
    throw new Error('A movement with that name already exists (names ignore case and spacing).');
  }
  try {
    return (
      await db
        .insert(movements)
        .values({
          name,
          primaryMuscleGroupId: movement.primaryMuscleGroupId,
          unit,
          instructions: movement.instructions ?? null,
        })
        .returning()
    )[0];
  } catch (error) {
    throw movementConstraintError(error);
  }
}

export type MovementPatch = {
  name?: string;
  primaryMuscleGroupId?: number;
  unit?: Unit;
  instructions?: string | null;
};

export async function updateMovement(db: DB, id: number, patch: MovementPatch): Promise<Movement> {
  const existing = (await db.select().from(movements).where(eq(movements.id, id)).limit(1))[0];
  if (!existing) throw new Error(`Movement ${id} does not exist.`);

  const values: Partial<typeof movements.$inferInsert> = {};
  if (patch.name !== undefined) values.name = assertMovementName(patch.name);
  if (patch.primaryMuscleGroupId !== undefined) {
    await assertMuscleGroupExists(db, patch.primaryMuscleGroupId);
    values.primaryMuscleGroupId = patch.primaryMuscleGroupId;
  }
  if (patch.unit !== undefined) {
    assertIn(patch.unit, UNITS, 'unit');
    values.unit = patch.unit;
  }
  if (patch.instructions !== undefined) values.instructions = patch.instructions;

  if (Object.keys(values).length === 0) return existing;

  // Check immediately before updating so a collision cannot be introduced by
  // the repository; the unique index covers the remaining race window.
  if (patch.name !== undefined && (await findExactMovement(db, patch.name, id))) {
    throw new Error('A movement with that name already exists (names ignore case and spacing).');
  }
  try {
    return (await db.update(movements).set(values).where(eq(movements.id, id)).returning())[0];
  } catch (error) {
    throw movementConstraintError(error);
  }
}

async function setMovementArchived(db: DB, id: number, archived: 0 | 1): Promise<Movement> {
  const updated = (
    await db.update(movements).set({ archived }).where(eq(movements.id, id)).returning()
  )[0];
  if (!updated) throw new Error(`Movement ${id} does not exist.`);
  return updated;
}

export function archiveMovement(db: DB, id: number): Promise<Movement> {
  return setMovementArchived(db, id, 1);
}

export function unarchiveMovement(db: DB, id: number): Promise<Movement> {
  return setMovementArchived(db, id, 0);
}

export async function findMovementByName(
  db: DB,
  name: string,
  { near = false, excludeId }: { near?: boolean; excludeId?: number } = {},
): Promise<Movement | null> {
  const normalized = normalizeMovementName(name);
  if (!normalized) return null;
  const rows = await db.select().from(movements).orderBy(movements.id);
  const exact = rows.find(
    (row) => row.id !== excludeId && normalizeMovementName(row.name) === normalized,
  );
  if (exact || !near) return exact ?? null;

  let nearest: { row: Movement; distance: number } | undefined;
  for (const row of rows) {
    if (row.id === excludeId) continue;
    const distance = levenshteinDistance(normalized, normalizeMovementName(row.name));
    if (
      distance <= 2 &&
      (!nearest ||
        distance < nearest.distance ||
        (distance === nearest.distance && row.id < nearest.row.id))
    ) {
      nearest = { row, distance };
    }
  }
  return nearest?.row ?? null;
}

function levenshteinDistance(left: string, right: string): number {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i++) {
    const current = [i];
    for (let j = 1; j <= right.length; j++) {
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + (left[i - 1] === right[j - 1] ? 0 : 1),
      );
    }
    for (let j = 0; j <= right.length; j++) previous[j] = current[j];
  }
  return previous[right.length];
}

export async function listMuscleGroups(db: DB) {
  const groups = await db.select().from(muscleGroups);
  const order = new Map(MUSCLE_GROUPS.map((name, index) => [name, index]));
  return groups.sort((a, b) => (order.get(a.name) ?? Infinity) - (order.get(b.name) ?? Infinity));
}

/** One row of the browsable catalog: a movement plus its primary muscle-group name. */
export type CatalogMovement = {
  id: number;
  name: string;
  muscleGroup: string;
  unit: Unit;
  instructions: string | null;
  archived: boolean;
};

export type BrowseCatalogOptions = {
  /** Narrow to one muscle group by name (omitted = all groups). */
  muscleGroup?: string;
  /** Case-insensitive substring match on the movement name. */
  query?: string;
  /** Include archived movements (default: excluded entirely). */
  includeArchived?: boolean;
};

/**
 * Flat A–Z browse of the movement catalog (issue #7). One row per movement with
 * its primary muscle-group name; ordering is case-insensitive A–Z; an optional
 * muscle-group filter and a case-insensitive name search combine; archived
 * movements are gated out entirely unless `includeArchived` is set — the catalog
 * screen's "show archived" toggle drives that flag, so archived rows only
 * participate in search and filters once revealed. No volume-landmark numbers
 * are returned: this is the identity list, not the measurement one.
 */
export async function listMovements(
  db: DB,
  opts: BrowseCatalogOptions = {},
): Promise<CatalogMovement[]> {
  const conditions = [];
  if (opts.muscleGroup) {
    conditions.push(eq(muscleGroups.name, opts.muscleGroup));
  }
  if (opts.query) {
    // instr() is a literal substring match — user input like '%' or '_' can never act as a wildcard.
    conditions.push(sql`instr(lower(${movements.name}), ${opts.query.toLowerCase()}) > 0`);
  }
  if (!opts.includeArchived) {
    conditions.push(eq(movements.archived, 0));
  }
  const rows = await db
    .select({
      id: movements.id,
      name: movements.name,
      muscleGroup: muscleGroups.name,
      unit: movements.unit,
      instructions: movements.instructions,
      archived: movements.archived,
    })
    .from(movements)
    .innerJoin(muscleGroups, eq(muscleGroups.id, movements.primaryMuscleGroupId))
    .where(and(...conditions))
    .orderBy(sql`lower(${movements.name})`, movements.id);
  return rows.map((r) => ({ ...r, archived: r.archived === 1 }));
}

/** A stable, user-facing parent that keeps a movement from being deleted. */
export type Reference = {
  id: number;
  name: string;
  date?: number;
  routineId?: number;
  gymId?: number;
};

/** All history and identity references that must be clear before deletion. */
export type MovementDeleteReferences = {
  sets: number;
  routines: Reference[];
  subRoutines: Reference[];
  sessions: Reference[];
};

export type MovementDeleteBlocked = {
  deleted: false;
  references: MovementDeleteReferences;
};

export type MovementDeleteResult = { deleted: true } | MovementDeleteBlocked;

/** Whether any history or parent reference still points at the movement. */
export function hasMovementReferences(references: MovementDeleteReferences): boolean {
  return (
    references.sets > 0 ||
    references.routines.length > 0 ||
    references.subRoutines.length > 0 ||
    references.sessions.length > 0
  );
}

/**
 * Returns the grouped references used by the catalog's delete guard. Parent
 * rows are distinct so the UI can show one navigable routine, sub-routine, or
 * session per container even when it contains the movement more than once.
 */
function readMovementDeleteReferences(db: DB, id: number): MovementDeleteReferences {
  const movement = db
    .select({ id: movements.id })
    .from(movements)
    .where(eq(movements.id, id))
    .limit(1)
    .all()[0];
  if (!movement) throw new Error(`Movement ${id} does not exist.`);

  const setCount = db
    .select({ count: count() })
    .from(sets)
    .innerJoin(sessionEntries, eq(sessionEntries.id, sets.sessionEntryId))
    .where(eq(sessionEntries.movementId, id))
    .all()[0].count;

  const routineRows = db
    .select({ id: routines.id, name: routines.name })
    .from(routineEntries)
    .innerJoin(routines, eq(routines.id, routineEntries.routineId))
    .where(eq(routineEntries.movementId, id))
    .groupBy(routines.id, routines.name)
    .orderBy(routines.id)
    .all();

  const subRoutineRows = db
    .select({
      id: subRoutines.id,
      routineId: routines.id,
      routineName: routines.name,
      gymId: gyms.id,
      gymName: gyms.name,
    })
    .from(subRoutineEntries)
    .innerJoin(subRoutines, eq(subRoutines.id, subRoutineEntries.subRoutineId))
    .innerJoin(routines, eq(routines.id, subRoutines.routineId))
    .innerJoin(gyms, eq(gyms.id, subRoutines.gymId))
    .where(eq(subRoutineEntries.movementId, id))
    .groupBy(subRoutines.id, routines.id, routines.name, gyms.id, gyms.name)
    .orderBy(subRoutines.id)
    .all();

  const sessionRows = db
    .select({ id: sessions.id, name: gyms.name, date: sessions.startedAt })
    .from(sessionEntries)
    .innerJoin(sessions, eq(sessions.id, sessionEntries.sessionId))
    .innerJoin(gyms, eq(gyms.id, sessions.gymId))
    .where(eq(sessionEntries.movementId, id))
    .groupBy(sessions.id, gyms.name, sessions.startedAt)
    .orderBy(sessions.id)
    .all();

  return {
    sets: setCount,
    routines: routineRows,
    subRoutines: subRoutineRows.map((row) => ({
      id: row.id,
      name: `${row.routineName} × ${row.gymName}`,
      routineId: row.routineId,
      gymId: row.gymId,
    })),
    sessions: sessionRows,
  };
}

export async function getMovementDeleteReferences(
  db: DB,
  id: number,
): Promise<MovementDeleteReferences> {
  return readMovementDeleteReferences(db, id);
}

/** Permanently deletes only an unreferenced movement, atomically with its guard. */
export async function deleteMovement(db: DB, id: number): Promise<MovementDeleteResult> {
  return db.transaction((tx) => {
    const references = readMovementDeleteReferences(tx, id);
    if (hasMovementReferences(references)) return { deleted: false, references };

    tx.delete(movements).where(eq(movements.id, id)).run();
    return { deleted: true };
  });
}

/* ------------------------------ Routines ------------------------------- */

export type Routine = typeof routines.$inferSelect;
export type RoutineEntry = typeof routineEntries.$inferSelect;

export type RoutineEntryInput = {
  movementId: number;
  workingSetCount?: number | null;
  repMin?: number | null;
  repMax?: number | null;
  proximityValue?: number | null;
  proximityScale?: RecordingScale | null;
  tempo?: string | null;
};

export type NewRoutine = {
  name: string;
  /** Legacy convenience shape retained for the minimal builder API. */
  movementIds?: number[];
  entries?: RoutineEntryInput[];
};

export type UpdateRoutine = {
  name: string;
  movementIds?: number[];
  entries?: RoutineEntryInput[];
};

/** The compact row shown in the active Routine list. */
export type RoutineSummary = {
  id: number;
  name: string;
  movementCount: number;
  archived: boolean;
};

export type RoutineWithEntries = { routine: Routine; entries: RoutineEntry[] };

function assertRoutineName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Routine name cannot be blank.');
  return trimmed;
}

/** Routine names ignore case and surrounding whitespace for uniqueness. */
function routineNameKey(name: string): string {
  return name.trim().toLowerCase();
}

function routineEntriesFromInput(input: {
  movementIds?: number[];
  entries?: RoutineEntryInput[];
}): RoutineEntryInput[] {
  if (input.entries) return input.entries;
  return (input.movementIds ?? []).map((movementId) => ({ movementId }));
}

function validateRoutineTargets(
  tx: DB,
  entries: RoutineEntryInput[],
  {
    requireActive,
    existingMovementIds = new Set<number>(),
  }: { requireActive: boolean; existingMovementIds?: Set<number> },
): void {
  if (entries.length === 0) throw new Error('A Routine needs at least one Movement.');
  if (new Set(entries.map((entry) => entry.movementId)).size !== entries.length) {
    throw new Error('A Routine cannot contain the same Movement twice.');
  }

  const movementRows = tx
    .select({ id: movements.id, archived: movements.archived })
    .from(movements)
    .where(
      inArray(
        movements.id,
        entries.map((entry) => entry.movementId),
      ),
    )
    .all();
  if (movementRows.length !== entries.length) throw new Error('Every Routine Movement must exist.');
  if (requireActive && movementRows.some((movement) => movement.archived === 1)) {
    throw new Error('Every Routine Movement must be active.');
  }
  if (
    !requireActive &&
    movementRows.some(
      (movement) => movement.archived === 1 && !existingMovementIds.has(movement.id),
    )
  ) {
    throw new Error('Every new Routine Movement must be active.');
  }

  const recordingScale = getRecordingScaleSync(tx);
  for (const entry of entries) {
    const workingSetCount = entry.workingSetCount;
    if (
      workingSetCount !== null &&
      workingSetCount !== undefined &&
      (!Number.isInteger(workingSetCount) || workingSetCount <= 0)
    ) {
      throw new Error('Working-set count must be a positive whole number.');
    }
    const repMin = entry.repMin ?? null;
    const repMax = entry.repMax ?? null;
    if ((repMin === null) !== (repMax === null)) {
      throw new Error('Enter both a minimum and maximum rep target.');
    }
    if (
      repMin !== null &&
      repMax !== null &&
      (!Number.isInteger(repMin) || repMin <= 0 || !Number.isInteger(repMax) || repMax <= 0)
    ) {
      throw new Error('Rep targets must be positive whole numbers.');
    }
    if (repMin !== null && repMax !== null && repMin > repMax)
      throw new Error('Rep minimum cannot exceed rep maximum.');

    const proximityValue = entry.proximityValue ?? null;
    const proximityScale = entry.proximityScale ?? null;
    if (proximityValue === null && proximityScale !== null)
      throw new Error('A proximity scale requires a proximity target.');
    if (proximityValue !== null) {
      const minimum = recordingScale === 'rir' ? 0 : 1;
      const targetScale = proximityScale ?? recordingScale;
      if (targetScale !== recordingScale)
        throw new Error(
          `Proximity target must use the app Recording scale (${recordingScale.toUpperCase()}).`,
        );
      if (!Number.isFinite(proximityValue) || proximityValue < minimum || proximityValue > 10) {
        throw new Error(
          `${recordingScale.toUpperCase()} target must be between ${minimum} and 10.`,
        );
      }
    }
    if (
      entry.tempo !== null &&
      entry.tempo !== undefined &&
      entry.tempo.trim() &&
      !/^\d+-\d+-\d+-\d+$/.test(entry.tempo.trim())
    ) {
      throw new Error('Tempo must use four-part notation, for example 3-1-1-0.');
    }
  }
}

function getRecordingScaleSync(db: DB): RecordingScale {
  const row = db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, 'recording_scale'))
    .limit(1)
    .all()[0];
  return row && RECORDING_SCALES.includes(row.value)
    ? (row.value as RecordingScale)
    : (DEFAULT_RECORDING_SCALE as RecordingScale);
}

export async function getRecordingScale(db: DB): Promise<RecordingScale> {
  return getRecordingScaleSync(db);
}

function entryValues(
  entry: RoutineEntryInput,
  routineId: number,
  position: number,
  recordingScale: RecordingScale,
) {
  const proximityValue = entry.proximityValue ?? null;
  return {
    routineId,
    position,
    movementId: entry.movementId,
    workingSetCount: entry.workingSetCount ?? null,
    repMin: entry.repMin ?? null,
    repMax: entry.repMax ?? null,
    proximityValue,
    proximityScale: proximityValue === null ? null : (entry.proximityScale ?? recordingScale),
    tempo: entry.tempo?.trim() || null,
  };
}

function saveEntries(tx: DB, routineId: number, entries: RoutineEntryInput[]): RoutineEntry[] {
  const recordingScale = getRecordingScaleSync(tx);
  return tx
    .insert(routineEntries)
    .values(
      entries.map((entry, position) => entryValues(entry, routineId, position, recordingScale)),
    )
    .returning()
    .all();
}

/** Saves a new Routine and all ordered entries in one transaction. */
export async function createRoutine(db: DB, input: NewRoutine): Promise<RoutineWithEntries> {
  return db.transaction((tx) => {
    const name = assertRoutineName(input.name);
    const entries = routineEntriesFromInput(input);
    validateRoutineTargets(tx, entries, { requireActive: true });
    const existingNames = tx.select({ name: routines.name }).from(routines).all();
    if (existingNames.some((row) => routineNameKey(row.name) === routineNameKey(name))) {
      throw new Error('A Routine with that name already exists.');
    }
    const routine = tx.insert(routines).values({ name }).returning().all()[0];
    return { routine, entries: saveEntries(tx, routine.id, entries) };
  });
}

/** Reads a Routine and its entries in execution order. */
export async function getRoutine(db: DB, routineId: number): Promise<RoutineWithEntries | null> {
  const routine = (await db.select().from(routines).where(eq(routines.id, routineId)).limit(1))[0];
  if (!routine) return null;
  const entries = await db
    .select()
    .from(routineEntries)
    .where(eq(routineEntries.routineId, routineId))
    .orderBy(routineEntries.position);
  return { routine, entries };
}

/** Replaces a Routine's ordered entries atomically; Sub-routines are untouched. */
export async function updateRoutine(
  db: DB,
  routineId: number,
  input: UpdateRoutine,
): Promise<RoutineWithEntries> {
  return db.transaction((tx) => {
    const existing = tx.select().from(routines).where(eq(routines.id, routineId)).limit(1).all()[0];
    if (!existing) throw new Error(`Routine ${routineId} does not exist.`);
    const name = assertRoutineName(input.name);
    const entries = routineEntriesFromInput(input);
    const existingEntries = tx
      .select({ movementId: routineEntries.movementId })
      .from(routineEntries)
      .where(eq(routineEntries.routineId, routineId))
      .all();
    validateRoutineTargets(tx, entries, {
      requireActive: false,
      existingMovementIds: new Set(existingEntries.map((entry) => entry.movementId)),
    });
    const otherNames = tx.select({ id: routines.id, name: routines.name }).from(routines).all();
    if (
      otherNames.some(
        (row) => row.id !== routineId && routineNameKey(row.name) === routineNameKey(name),
      )
    ) {
      throw new Error('A Routine with that name already exists.');
    }
    tx.update(routines).set({ name }).where(eq(routines.id, routineId)).run();
    tx.delete(routineEntries).where(eq(routineEntries.routineId, routineId)).run();
    const routine = tx.select().from(routines).where(eq(routines.id, routineId)).limit(1).all()[0];
    return { routine, entries: saveEntries(tx, routineId, entries) };
  });
}

async function setRoutineArchived(db: DB, id: number, archived: 0 | 1): Promise<Routine> {
  const updated = (
    await db.update(routines).set({ archived }).where(eq(routines.id, id)).returning()
  )[0];
  if (!updated) throw new Error(`Routine ${id} does not exist.`);
  return updated;
}

export function archiveRoutine(db: DB, id: number): Promise<Routine> {
  return setRoutineArchived(db, id, 1);
}

export function unarchiveRoutine(db: DB, id: number): Promise<Routine> {
  return setRoutineArchived(db, id, 0);
}

/** All Sub-routines and session history that keep a Routine from being deleted. */
export type RoutineDeleteReferences = {
  subRoutines: Reference[];
  sessions: Reference[];
};

export type RoutineDeleteBlocked = {
  deleted: false;
  references: RoutineDeleteReferences;
};

export type RoutineDeleteResult = { deleted: true } | RoutineDeleteBlocked;

export function hasRoutineReferences(references: RoutineDeleteReferences): boolean {
  return references.subRoutines.length > 0 || references.sessions.length > 0;
}

function readRoutineDeleteReferences(db: DB, id: number): RoutineDeleteReferences {
  const routine = db
    .select({ id: routines.id })
    .from(routines)
    .where(eq(routines.id, id))
    .limit(1)
    .all()[0];
  if (!routine) throw new Error(`Routine ${id} does not exist.`);

  const subRoutineRows = db
    .select({ id: subRoutines.id, gymId: gyms.id, gymName: gyms.name })
    .from(subRoutines)
    .innerJoin(gyms, eq(gyms.id, subRoutines.gymId))
    .where(eq(subRoutines.routineId, id))
    .orderBy(subRoutines.id)
    .all();

  const sessionRows = db
    .select({ id: sessions.id, name: gyms.name, date: sessions.startedAt })
    .from(sessions)
    .innerJoin(subRoutines, eq(subRoutines.id, sessions.subRoutineId))
    .innerJoin(gyms, eq(gyms.id, sessions.gymId))
    .where(eq(subRoutines.routineId, id))
    .groupBy(sessions.id, gyms.name, sessions.startedAt)
    .orderBy(sessions.id)
    .all();

  return {
    subRoutines: subRoutineRows.map((row) => ({
      id: row.id,
      name: row.gymName,
      routineId: id,
      gymId: row.gymId,
    })),
    sessions: sessionRows,
  };
}

export async function getRoutineDeleteReferences(
  db: DB,
  id: number,
): Promise<RoutineDeleteReferences> {
  return readRoutineDeleteReferences(db, id);
}

/** Permanently deletes only a Routine without Sub-routines or session history. */
export async function deleteRoutine(db: DB, id: number): Promise<RoutineDeleteResult> {
  return db.transaction((tx) => {
    const references = readRoutineDeleteReferences(tx, id);
    if (hasRoutineReferences(references)) return { deleted: false, references };

    tx.delete(routines).where(eq(routines.id, id)).run();
    return { deleted: true };
  });
}

/** Lists active Routines by default; archived rows are included only when revealed. */
export async function listRoutines(
  db: DB,
  { includeArchived = false } = {},
): Promise<RoutineSummary[]> {
  const conditions = includeArchived ? [] : [eq(routines.archived, 0)];
  const rows = await db
    .select({
      id: routines.id,
      name: routines.name,
      movementCount: count(routineEntries.id),
      archived: routines.archived,
    })
    .from(routines)
    .leftJoin(routineEntries, eq(routineEntries.routineId, routines.id))
    .where(and(...conditions))
    .groupBy(routines.id, routines.name, routines.archived)
    .orderBy(sql`lower(${routines.name})`, routines.id);
  return rows.map((row) => ({ ...row, archived: row.archived === 1 }));
}

/* --------------------------- Sessions & sets --------------------------- */

export async function startSession(
  db: DB,
  {
    gymId,
    subRoutineId,
    startedAt = NOW(),
  }: { gymId: number; subRoutineId?: number; startedAt?: number },
) {
  return (await db.insert(sessions).values({ gymId, subRoutineId, startedAt }).returning())[0];
}

export async function endSession(
  db: DB,
  { sessionId, endedAt = NOW() }: { sessionId: number; endedAt?: number },
) {
  await db.update(sessions).set({ endedAt }).where(eq(sessions.id, sessionId));
}

export async function appendSessionEntry(
  db: DB,
  {
    sessionId,
    position,
    movementId,
    equipmentClass,
    skipped = false,
  }: {
    sessionId: number;
    position: number;
    movementId: number;
    equipmentClass: EquipmentClass;
    skipped?: boolean;
  },
) {
  equipmentIn(equipmentClass);
  return (
    await db
      .insert(sessionEntries)
      .values({ sessionId, position, movementId, equipmentClass, skipped: intFlag(skipped) })
      .returning()
  )[0];
}

export type NewSet = {
  loadLb: number;
  reps: number;
  equipmentClass: EquipmentClass;
  proximity?: { scale: RecordingScale; value: number } | null;
  recordedAt?: number;
};

export async function logSet(db: DB, sessionEntryId: number, set: NewSet) {
  equipmentIn(set.equipmentClass);
  return (
    await db
      .insert(sets)
      .values({
        sessionEntryId,
        loadLb: set.loadLb,
        reps: set.reps,
        equipmentClass: set.equipmentClass,
        proximityValue: set.proximity?.value,
        proximityScale: set.proximity?.scale,
        recordedAt: set.recordedAt ?? NOW(),
      })
      .returning()
  )[0];
}

/* ------------------------------ Sub-routines --------------------------- */

/**
 * The recorded binding Routine × Gym → Movement × Equipment class. Returns null
 * when no sub-routine has been created for that pair yet. Entries are ordered by
 * their routine position.
 */
export async function getSubRoutine(
  db: DB,
  { routineId, gymId }: { routineId: number; gymId: number },
) {
  const sr = (
    await db
      .select()
      .from(subRoutines)
      .where(and(eq(subRoutines.routineId, routineId), eq(subRoutines.gymId, gymId)))
      .limit(1)
  )[0];
  if (!sr) {
    return null;
  }
  const entries = await db
    .select()
    .from(subRoutineEntries)
    .where(eq(subRoutineEntries.subRoutineId, sr.id))
    .orderBy(subRoutineEntries.position);
  return { ...sr, entries };
}

/**
 * Bind a movement to an Equipment class for a Routine × Gym, creating the
 * sub-routine on first use and upserting the positional entry.
 */
export async function setSubRoutineClass(
  db: DB,
  {
    routineId,
    gymId,
    movementId,
    equipmentClass,
    position,
  }: {
    routineId: number;
    gymId: number;
    movementId: number;
    equipmentClass: EquipmentClass;
    position: number;
  },
) {
  equipmentIn(equipmentClass);
  let sr = await getSubRoutine(db, { routineId, gymId });
  if (!sr) {
    const row = (await db.insert(subRoutines).values({ routineId, gymId }).returning())[0];
    sr = { ...row, entries: [] };
  }
  const existing = (
    await db
      .select()
      .from(subRoutineEntries)
      .where(
        and(
          eq(subRoutineEntries.subRoutineId, sr.id),
          eq(subRoutineEntries.movementId, movementId),
        ),
      )
      .limit(1)
  )[0];
  if (existing) {
    const updated = (
      await db
        .update(subRoutineEntries)
        .set({ equipmentClass, position })
        .where(eq(subRoutineEntries.id, existing.id))
        .returning()
    )[0];
    return updated;
  }
  return (
    await db
      .insert(subRoutineEntries)
      .values({ subRoutineId: sr.id, position, movementId, equipmentClass })
      .returning()
  )[0];
}

/* ------------------------- Progress islands (Exercise × Gym) ---------- */

/**
 * sets recorded at a movement in a gym — the island (Exercise = Movement × Class,
 * inside a Gym). Pass `equipmentClass` to scope to one island, honoring the
 * differentiator: same gym but different equipment, or the same exercise in a
 * different gym, stay separate islands (ADR 0001). Omit it to read the whole
 * movement's history across equipment.
 */
export async function setsByIsland(
  db: DB,
  {
    gymId,
    movementId,
    equipmentClass,
  }: { gymId: number; movementId: number; equipmentClass?: EquipmentClass },
  { recordedAfter = 0 } = {},
) {
  const conditions = [
    eq(sessions.gymId, gymId),
    eq(sessionEntries.movementId, movementId),
    gte(sets.recordedAt, recordedAfter),
  ];
  if (equipmentClass) {
    conditions.push(eq(sets.equipmentClass, equipmentClass));
  }
  return db
    .select({
      id: sets.id,
      loadLb: sets.loadLb,
      reps: sets.reps,
      equipmentClass: sets.equipmentClass,
      proximityValue: sets.proximityValue,
      proximityScale: sets.proximityScale,
      recordedAt: sets.recordedAt,
      gymId: sessions.gymId,
    })
    .from(sets)
    .innerJoin(sessionEntries, eq(sessionEntries.id, sets.sessionEntryId))
    .innerJoin(sessions, eq(sessions.id, sessionEntries.sessionId))
    .where(and(...conditions))
    .orderBy(desc(sets.recordedAt));
}

/* ------------------------------- Volume -------------------------------- */

/**
 * Calendar week bounds (Mon 00:00 → next Mon 00:00), matching the volume
 * landmark's week.
 */
export function weekBounds(at: number = NOW()) {
  const d = new Date(at);
  const day = (d.getDay() + 6) % 7; // Mon=0 … Sun=6
  d.setHours(0, 0, 0, 0);
  const start = d.getTime() - day * DAY_MS;
  return { start, end: start + 7 * DAY_MS };
}

/**
 * Weekly counted sets per muscle group over a calendar week, global across gyms
 * and islands. Only **direct** sets count: each set contributes to its movement's
 * primary muscle group, never to secondary work.
 */
export async function weeklyVolumeByMuscleGroup(
  db: DB,
  { start, end }: { start: number; end: number },
) {
  return db
    .select({
      muscleGroupId: movements.primaryMuscleGroupId,
      countedSets: count(),
    })
    .from(sets)
    .innerJoin(sessionEntries, eq(sessionEntries.id, sets.sessionEntryId))
    .innerJoin(movements, eq(movements.id, sessionEntries.movementId))
    .where(
      and(eq(sessionEntries.skipped, 0), gte(sets.recordedAt, start), lt(sets.recordedAt, end)),
    )
    .groupBy(movements.primaryMuscleGroupId);
}
