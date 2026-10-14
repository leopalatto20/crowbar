import { and, asc, desc, eq, inArray, isNotNull, isNull, max, notExists } from "drizzle-orm";

import type { Language } from "@/lib/i18n/locale";
import type { SetKind, Unit } from "@/lib/workout/model";

import type { Database } from "./database";
import { newId } from "./id";
import { exercise, gym, station, workout, workoutExercise, workoutSet } from "./schema";
import { getSettings } from "./settings";

export function startWorkout(
  db: Database,
  { gymId, timeZone, now = Date.now() }: { gymId: string; timeZone: string; now?: number },
) {
  const id = newId(db);
  db.insert(workout).values({ id, gymId, startedAt: now, timeZone }).run();
  return id;
}

export function currentWorkoutId(db: Database) {
  return db.select({ id: workout.id }).from(workout).where(isNull(workout.finishedAt)).get()?.id;
}

export type LedgerSet = {
  id: string;
  kind: SetKind;
  load: number | null;
  reps: number | null;
  rir: number | null;
  done: boolean;
};

export type LedgerExercise = {
  id: string;
  exercise: { id: string; name: string };
  unit: Unit;
  sets: LedgerSet[];
};

export type Ledger = {
  id: string;
  gymName: string;
  startedAt: number;
  finishedAt: number | null;
  exercises: LedgerExercise[];
};

export function getLedger(db: Database, id: string, language: Language): Ledger | undefined {
  const found = db
    .select({
      id: workout.id,
      startedAt: workout.startedAt,
      finishedAt: workout.finishedAt,
      gymName: gym.name,
    })
    .from(workout)
    .innerJoin(gym, eq(gym.id, workout.gymId))
    .where(eq(workout.id, id))
    .get();
  if (!found) return undefined;

  const entries = db
    .select({
      id: workoutExercise.id,
      exerciseId: exercise.id,
      name: exercise.name,
      nameEs: exercise.nameEs,
      unit: station.unit,
    })
    .from(workoutExercise)
    .innerJoin(exercise, eq(exercise.id, workoutExercise.exerciseId))
    .leftJoin(station, eq(station.id, workoutExercise.stationId))
    .where(eq(workoutExercise.workoutId, id))
    .orderBy(asc(workoutExercise.position))
    .all();
  const sets = db
    .select({
      id: workoutSet.id,
      workoutExerciseId: workoutSet.workoutExerciseId,
      kind: workoutSet.kind,
      load: workoutSet.load,
      reps: workoutSet.reps,
      rir: workoutSet.rir,
      done: workoutSet.done,
    })
    .from(workoutSet)
    .where(
      inArray(
        workoutSet.workoutExerciseId,
        entries.map((entry) => entry.id),
      ),
    )
    .orderBy(asc(workoutSet.position))
    .all();
  const setsByEntry = new Map<string, LedgerSet[]>();
  for (const { workoutExerciseId, ...set } of sets) {
    setsByEntry.set(workoutExerciseId, [...(setsByEntry.get(workoutExerciseId) ?? []), set]);
  }
  // An Exercise with no Station yet shows the unit its Station will be created with.
  const { defaultWeightUnit } = getSettings(db);

  return {
    ...found,
    exercises: entries.map(({ id, exerciseId, name, nameEs, unit }) => ({
      id,
      exercise: { id: exerciseId, name: language === "es" ? (nameEs ?? name) : name },
      unit: unit ?? defaultWeightUnit,
      sets: setsByEntry.get(id) ?? [],
    })),
  };
}

// Only an existing Station is attached here; a new one waits for the first logged set.
export function addWorkoutExercise(db: Database, workoutId: string, exerciseId: string) {
  const id = newId(db);
  db.transaction((tx) => {
    const found = tx
      .select({ gymId: workout.gymId })
      .from(workout)
      .where(eq(workout.id, workoutId))
      .get();
    if (!found) throw new Error(`Workout ${workoutId} doesn't exist`);
    const [last] = tx
      .select({ position: max(workoutExercise.position) })
      .from(workoutExercise)
      .where(eq(workoutExercise.workoutId, workoutId))
      .all();
    tx.insert(workoutExercise)
      .values({
        id,
        workoutId,
        exerciseId,
        stationId: defaultStation(tx, exerciseId, found.gymId)?.id ?? null,
        position: (last?.position ?? -1) + 1,
      })
      .run();
    tx.insert(workoutSet)
      .values({ id: newId(tx), workoutExerciseId: id, position: 0 })
      .run();
  });
  return id;
}

function defaultStation(db: Database, exerciseId: string, gymId: string) {
  return db
    .select({ id: station.id })
    .from(station)
    .where(and(eq(station.exerciseId, exerciseId), eq(station.gymId, gymId)))
    .orderBy(desc(station.id))
    .limit(1)
    .get();
}

export type SetChange = Partial<Pick<LedgerSet, "load" | "reps" | "rir">>;

export function updateSet(db: Database, id: string, change: SetChange) {
  db.update(workoutSet).set(change).where(eq(workoutSet.id, id)).run();
}

export function toggleSetKind(db: Database, id: string) {
  db.transaction((tx) => {
    const set = findSet(tx, id);
    tx.update(workoutSet)
      .set(set.kind === "working" ? { kind: "warmup", rir: null } : { kind: "working" })
      .where(eq(workoutSet.id, id))
      .run();
  });
}

// A set added mid-Workout copies the set above, so an extra set is one tap like any other.
export function addSet(db: Database, workoutExerciseId: string) {
  db.transaction((tx) => {
    const above = tx
      .select()
      .from(workoutSet)
      .where(eq(workoutSet.workoutExerciseId, workoutExerciseId))
      .orderBy(desc(workoutSet.position))
      .limit(1)
      .get();
    tx.insert(workoutSet)
      .values({
        id: newId(tx),
        workoutExerciseId,
        position: (above?.position ?? -1) + 1,
        kind: above?.kind,
        load: above?.load,
        reps: above?.reps,
        rir: above?.rir,
      })
      .run();
  });
}

// Confirming also commits whatever the lifter typed but hadn't committed yet. The first logged
// set of an Exercise at a Gym is what creates its Station (ADR 0001), never the Workout start.
export function confirmSet(db: Database, id: string, change: SetChange = {}) {
  db.transaction((tx) => {
    const set = { ...findSet(tx, id), ...change };
    if (set.load === null || set.reps === null) {
      throw new Error(`Set ${id} can't be confirmed without load and reps`);
    }
    tx.update(workoutSet)
      .set({ ...change, done: true })
      .where(eq(workoutSet.id, id))
      .run();
    ensureStation(tx, set.workoutExerciseId);
  });
}

export function reopenSet(db: Database, id: string) {
  db.update(workoutSet).set({ done: false }).where(eq(workoutSet.id, id)).run();
}

// Skipped sets and Exercises leave no trace, so finishing takes no extra action from the lifter.
// A Workout with nothing logged isn't worth keeping at all.
export function finishWorkout(db: Database, id: string, now = Date.now()) {
  db.transaction((tx) => {
    const stationIds = stationsOf(tx, id);
    const entries = tx
      .select({ id: workoutExercise.id })
      .from(workoutExercise)
      .where(eq(workoutExercise.workoutId, id));
    tx.delete(workoutSet)
      .where(and(inArray(workoutSet.workoutExerciseId, entries), eq(workoutSet.done, false)))
      .run();
    tx.delete(workoutExercise)
      .where(
        and(
          eq(workoutExercise.workoutId, id),
          notExists(
            tx
              .select()
              .from(workoutSet)
              .where(eq(workoutSet.workoutExerciseId, workoutExercise.id)),
          ),
        ),
      )
      .run();
    if (tx.select().from(workoutExercise).where(eq(workoutExercise.workoutId, id)).get()) {
      tx.update(workout).set({ finishedAt: now }).where(eq(workout.id, id)).run();
    } else {
      tx.delete(workout).where(eq(workout.id, id)).run();
    }
    deleteEmptyStations(tx, stationIds);
  });
}

export function discardWorkout(db: Database, id: string) {
  db.transaction((tx) => {
    const stationIds = stationsOf(tx, id);
    tx.delete(workout).where(eq(workout.id, id)).run();
    deleteEmptyStations(tx, stationIds);
  });
}

function stationsOf(db: Database, workoutId: string) {
  return db
    .select({ id: workoutExercise.stationId })
    .from(workoutExercise)
    .where(and(eq(workoutExercise.workoutId, workoutId), isNotNull(workoutExercise.stationId)))
    .all()
    .map((entry) => entry.id!);
}

// A Station created by sets that were then dropped would otherwise linger with no history.
function deleteEmptyStations(db: Database, ids: string[]) {
  db.delete(station)
    .where(
      and(
        inArray(station.id, ids),
        notExists(
          db.select().from(workoutExercise).where(eq(workoutExercise.stationId, station.id)),
        ),
      ),
    )
    .run();
}

function ensureStation(db: Database, workoutExerciseId: string) {
  const entry = db
    .select({
      stationId: workoutExercise.stationId,
      exerciseId: workoutExercise.exerciseId,
      gymId: workout.gymId,
    })
    .from(workoutExercise)
    .innerJoin(workout, eq(workout.id, workoutExercise.workoutId))
    .where(eq(workoutExercise.id, workoutExerciseId))
    .get();
  if (!entry) throw new Error(`Workout Exercise ${workoutExerciseId} doesn't exist`);
  if (entry.stationId) return;
  let stationId = defaultStation(db, entry.exerciseId, entry.gymId)?.id;
  if (!stationId) {
    stationId = newId(db);
    db.insert(station)
      .values({
        id: stationId,
        exerciseId: entry.exerciseId,
        gymId: entry.gymId,
        unit: getSettings(db).defaultWeightUnit,
      })
      .run();
  }
  db.update(workoutExercise)
    .set({ stationId })
    .where(eq(workoutExercise.id, workoutExerciseId))
    .run();
}

function findSet(db: Database, id: string) {
  const set = db.select().from(workoutSet).where(eq(workoutSet.id, id)).get();
  if (!set) throw new Error(`Set ${id} doesn't exist`);
  return set;
}
