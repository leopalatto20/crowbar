import {
  appendSessionEntry,
  createGym,
  createMovement,
  endSession,
  listMuscleGroups,
  logSet as recordSet,
  startSession as openSession,
  type DB,
} from '@/db';
import type { EquipmentClass, MuscleGroupName, RecordingScale, Unit } from '@/db/constants';
import { routines } from '@/db/schema';

type Gym = NonNullable<Awaited<ReturnType<typeof createGym>>>;
type Movement = NonNullable<Awaited<ReturnType<typeof createMovement>>>;
type SessionRow = NonNullable<Awaited<ReturnType<typeof openSession>>>;
type EntryRow = NonNullable<Awaited<ReturnType<typeof appendSessionEntry>>>;

/**
 * Fixture builders: stand up Gym, Movement, Session, and Sets in a few lines so
 * domain tests read like the glossary (ticket #3, story 8). Thin wrappers over
 * the repository — no test-only behavior lives here.
 */

export async function makeGym(
  db: DB,
  name: string,
  overrides: { isHome?: boolean } = {},
): Promise<Gym> {
  return createGym(db, { name, isHome: overrides.isHome ?? false });
}

export async function makeMovement(
  db: DB,
  {
    name,
    muscleGroup = 'Chest',
    unit = 'kg',
  }: {
    name: string;
    muscleGroup?: MuscleGroupName;
    unit?: Unit;
  },
): Promise<Movement> {
  const groups = await listMuscleGroups(db);
  const group = groups.find((g) => g.name === muscleGroup);
  if (!group) {
    throw new Error(`No muscle group \`${muscleGroup}\` in the seeded catalog`);
  }
  return createMovement(db, {
    name,
    primaryMuscleGroupId: group.id,
    unit,
  });
}

export async function makeRoutine(db: DB, name: string) {
  return (await db.insert(routines).values({ name }).returning())[0];
}

export type StartedSession = {
  session: SessionRow;
  entry: EntryRow;
  movement: Movement;
};

/** Open a session at a gym performing one movement, ready for sets. */
export async function startSession(
  db: DB,
  {
    gymId,
    movement,
    equipmentClass = 'barbell',
    startedAt,
  }: {
    gymId: number;
    movement: Movement;
    equipmentClass?: EquipmentClass;
    startedAt?: number;
  },
): Promise<StartedSession> {
  const session = await openSession(db, { gymId, startedAt });
  const entry = await appendSessionEntry(db, {
    sessionId: session.id,
    position: 0,
    movementId: movement.id,
    equipmentClass,
  });
  return { session, entry, movement };
}

export type FixtureSet = {
  loadLb: number;
  reps?: number;
  equipmentClass?: EquipmentClass;
  proximity?: { scale: RecordingScale; value: number };
  recordedAt?: number;
};

/** Log one working set against a session entry, defaulting to the entry's class. */
export async function logSet(db: DB, entry: EntryRow, set: FixtureSet) {
  return recordSet(db, entry.id, {
    loadLb: set.loadLb,
    reps: set.reps ?? 5,
    equipmentClass: set.equipmentClass ?? entry.equipmentClass,
    proximity: set.proximity,
    recordedAt: set.recordedAt,
  });
}

export async function completeSession(
  db: DB,
  { sessionId, endedAt }: { sessionId: number; endedAt?: number },
): Promise<void> {
  await endSession(db, { sessionId, endedAt });
}
