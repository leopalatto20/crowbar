import { and, asc, desc, eq, inArray, isNotNull, isNull, lt, max, notExists } from "drizzle-orm";

import type { Language } from "@/lib/i18n/locale";
import type { Performance, SetKind, Unit } from "@/lib/workout/model";

import type { Database } from "./database";
import { newId } from "./id";
import { exercise, gym, station, workout, workoutExercise, workoutSet } from "./schema";
import { getSettings } from "./settings";

type WorkoutStart = { gymId: string; timeZone: string; now?: number };

// The database rejects a second unfinished Workout, so one in progress must be finished or
// discarded first.
export function startWorkout(db: Database, { gymId, timeZone, now = Date.now() }: WorkoutStart) {
  const id = newId(db);
  db.insert(workout).values({ id, gymId, startedAt: now, timeZone }).run();
  return id;
}

// One transaction, so a failed start never leaves the lifter with the old Workout gone.
export function discardAndStartWorkout(db: Database, discardedId: string, start: WorkoutStart) {
  return db.transaction((tx) => {
    deleteWorkout(tx, discardedId);
    return startWorkout(tx, start);
  });
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
  // What was logged for this set number last time at the same Station; also its ghost values.
  lastHere: Performance | null;
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
      stationId: workoutExercise.stationId,
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
  const setsByEntry = new Map<string, Omit<LedgerSet, "lastHere">[]>();
  for (const { workoutExerciseId, ...set } of sets) {
    setsByEntry.set(workoutExerciseId, [...(setsByEntry.get(workoutExerciseId) ?? []), set]);
  }
  // An Exercise with no Station yet shows the unit its Station will be created with.
  const { defaultWeightUnit } = getSettings(db);

  return {
    ...found,
    exercises: entries.map(({ id, exerciseId, name, nameEs, stationId, unit }) => {
      const entrySets = setsByEntry.get(id) ?? [];
      const lastHere = matchLastHere(entrySets, previousSetsAt(db, stationId, found.startedAt));
      return {
        id,
        exercise: { id: exerciseId, name: language === "es" ? (nameEs ?? name) : name },
        unit: unit ?? defaultWeightUnit,
        sets: entrySets.map((set, index) => ({ ...set, lastHere: lastHere[index]! })),
      };
    }),
  };
}

type PreviousSet = Performance & { kind: SetKind };

// The sets of the most recent Workout at the Station that started before `before`. "Earlier" is
// by start time, not by finish, so a past Workout logged later still reads only what preceded it.
function previousSetsAt(db: Database, stationId: string | null, before: number): PreviousSet[] {
  if (!stationId) return [];
  const previous = db
    .select({ id: workout.id })
    .from(workout)
    .innerJoin(workoutExercise, eq(workoutExercise.workoutId, workout.id))
    .where(and(eq(workoutExercise.stationId, stationId), lt(workout.startedAt, before)))
    .orderBy(desc(workout.startedAt))
    .limit(1)
    .get();
  if (!previous) return [];
  return (
    db
      .select({
        kind: workoutSet.kind,
        load: workoutSet.load,
        reps: workoutSet.reps,
        rir: workoutSet.rir,
      })
      .from(workoutSet)
      .innerJoin(workoutExercise, eq(workoutExercise.id, workoutSet.workoutExerciseId))
      .where(
        and(
          eq(workoutExercise.workoutId, previous.id),
          eq(workoutExercise.stationId, stationId),
          eq(workoutSet.done, true),
        ),
      )
      .orderBy(asc(workoutExercise.position), asc(workoutSet.position))
      .all()
      // The set_logged check guarantees a confirmed set has its load and reps.
      .map(({ load, reps, ...set }) => ({ ...set, load: load!, reps: reps! }))
  );
}

// Sets match by number, as the Ledger numbers them: Working sets among Working sets, warm-ups
// among warm-ups. So a warm-up added in front never shifts which Working set is compared.
function matchLastHere(sets: { kind: SetKind }[], previous: PreviousSet[]) {
  const counts: Record<SetKind, number> = { warmup: 0, working: 0 };
  return sets.map(({ kind }): Performance | null => {
    const ordinal = counts[kind]++;
    const match = previous.filter((set) => set.kind === kind)[ordinal];
    return match ? { load: match.load, reps: match.reps, rir: match.rir } : null;
  });
}

function lastHereOfSet(db: Database, set: { id: string; workoutExerciseId: string }) {
  const entry = db
    .select({ stationId: workoutExercise.stationId, startedAt: workout.startedAt })
    .from(workoutExercise)
    .innerJoin(workout, eq(workout.id, workoutExercise.workoutId))
    .where(eq(workoutExercise.id, set.workoutExerciseId))
    .get();
  if (!entry) throw new Error(`Workout Exercise ${set.workoutExerciseId} doesn't exist`);
  const sets = db
    .select({ id: workoutSet.id, kind: workoutSet.kind })
    .from(workoutSet)
    .where(eq(workoutSet.workoutExerciseId, set.workoutExerciseId))
    .orderBy(asc(workoutSet.position))
    .all();
  const lastHere = matchLastHere(sets, previousSetsAt(db, entry.stationId, entry.startedAt));
  return lastHere[sets.findIndex(({ id }) => id === set.id)] ?? null;
}

// A field the lifter left empty shows its ghost value, so that's what an empty field means.
function withGhosts(set: Pick<LedgerSet, "load" | "reps" | "rir">, ghost: Performance | null) {
  return {
    load: set.load ?? ghost?.load ?? null,
    reps: set.reps ?? ghost?.reps ?? null,
    rir: set.rir ?? ghost?.rir ?? null,
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

// A set added mid-Workout has its own ghost values when last time reached its number. Otherwise
// it copies what the set above shows, ghost values included, so an extra set is still one tap.
export function addSet(db: Database, workoutExerciseId: string) {
  db.transaction((tx) => {
    const above = tx
      .select()
      .from(workoutSet)
      .where(eq(workoutSet.workoutExerciseId, workoutExerciseId))
      .orderBy(desc(workoutSet.position))
      .limit(1)
      .get();
    const added = {
      id: newId(tx),
      workoutExerciseId,
      position: (above?.position ?? -1) + 1,
      kind: above?.kind,
    };
    tx.insert(workoutSet).values(added).run();
    if (above && !lastHereOfSet(tx, added)) {
      tx.update(workoutSet)
        .set(withGhosts(above, lastHereOfSet(tx, above)))
        .where(eq(workoutSet.id, added.id))
        .run();
    }
  });
}

// Confirming also commits whatever the lifter typed but hadn't committed yet, and the ghost
// values of every field left empty, so an unchanged set is one tap. The first logged set of an
// Exercise at a Gym is what creates its Station (ADR 0001), never the Workout start.
export function confirmSet(db: Database, id: string, change: SetChange = {}) {
  db.transaction((tx) => {
    const found = findSet(tx, id);
    const logged = withGhosts({ ...found, ...change }, lastHereOfSet(tx, found));
    if (logged.load === null || logged.reps === null) {
      throw new Error(`Set ${id} can't be confirmed without load and reps`);
    }
    tx.update(workoutSet)
      .set({ ...logged, done: true })
      .where(eq(workoutSet.id, id))
      .run();
    ensureStation(tx, found.workoutExerciseId);
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
  db.transaction((tx) => deleteWorkout(tx, id));
}

function deleteWorkout(db: Database, id: string) {
  const stationIds = stationsOf(db, id);
  db.delete(workout).where(eq(workout.id, id)).run();
  deleteEmptyStations(db, stationIds);
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
