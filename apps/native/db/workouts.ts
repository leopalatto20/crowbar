import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  lt,
  max,
  notExists,
  sql,
} from "drizzle-orm";

import type { EquipmentType, LoadType } from "@/lib/exercise/model";
import type { Language } from "@/lib/i18n/locale";
import type { Performance, SetKind, Target, Unit } from "@/lib/workout/model";
import { type WallClock, epochOf, wallClockOf } from "@/lib/workout/time";

import type { Database } from "./database";
import { newId } from "./id";
import { createRoutine } from "./routines";
import {
  exercise,
  gym,
  routine,
  routineExercise,
  station,
  workout,
  workoutEdit,
  workoutExercise,
  workoutSet,
} from "./schema";
import { getSettings } from "./settings";

// Where a new Workout happens, and the Routine it starts from, if any.
type WorkoutPlace = { gymId: string; timeZone: string; routineId?: string };
type WorkoutStart = WorkoutPlace & { now?: number };

// The database rejects a second unfinished Workout, so one in progress must be finished or
// discarded first.
export function startWorkout(db: Database, { now = Date.now(), ...place }: WorkoutStart) {
  return db.transaction((tx) => insertWorkout(tx, place, now));
}

type PastWorkoutStart = WorkoutPlace & { startedAt?: number; now?: number };

const PAST_WORKOUT_MS = 60 * 60_000;

// A Workout forgotten at the time, backfilled. It's finished from the start, so it never stands in
// for the one in progress, and its structural edits never reach the Routine. Prefill reads the
// Workouts that started before it, as for any past Workout. With no start given it's the hour that
// just ended, as a forgotten session is usually a recent one; the lifter corrects it in the Ledger.
export function logPastWorkout(
  db: Database,
  { startedAt, now = Date.now(), ...place }: PastWorkoutStart,
) {
  const start = startedAt ?? now - (now % 60_000) - PAST_WORKOUT_MS;
  if (start > now) throw new Error("A past Workout can't start in the future");
  return db.transaction((tx) => insertWorkout(tx, place, start, start + PAST_WORKOUT_MS));
}

function insertWorkout(
  db: Database,
  { gymId, timeZone, routineId }: WorkoutPlace,
  startedAt: number,
  finishedAt: number | null = null,
) {
  const id = newId(db);
  const source = routineId ? findRoutine(db, routineId) : undefined;
  db.insert(workout)
    .values({ id, gymId, routineId, routineName: source?.name, startedAt, finishedAt, timeZone })
    .run();
  if (source) snapshotRoutine(db, id, gymId, source.id);
  return id;
}

function findRoutine(db: Database, id: string) {
  const found = db
    .select({ id: routine.id, name: routine.name })
    .from(routine)
    .where(eq(routine.id, id))
    .get();
  if (!found) throw new Error(`Routine ${id} doesn't exist`);
  return found;
}

// Copies rather than references the slots, so later Routine edits never reach this Workout.
function snapshotRoutine(db: Database, workoutId: string, gymId: string, routineId: string) {
  const slots = db
    .select()
    .from(routineExercise)
    .where(eq(routineExercise.routineId, routineId))
    .orderBy(asc(routineExercise.position))
    .all();
  slots.forEach(
    (
      {
        id: routineExerciseId,
        exerciseId,
        warmups,
        sets,
        repMin,
        repMax,
        rirMin,
        rirMax,
        restSeconds,
      },
      position,
    ) => {
      const id = newId(db);
      db.insert(workoutExercise)
        .values({
          id,
          workoutId,
          exerciseId,
          stationId: defaultStation(db, exerciseId, gymId)?.id ?? null,
          routineExerciseId,
          position,
          sets,
          repMin,
          repMax,
          rirMin,
          rirMax,
          restSeconds,
        })
        .run();
      // A slot with no planned set count still starts with one set to log.
      const kinds: SetKind[] = [
        ...Array<SetKind>(warmups).fill("warmup"),
        ...Array<SetKind>(sets ?? 1).fill("working"),
      ];
      kinds.forEach((kind, setPosition) => {
        db.insert(workoutSet)
          .values({ id: newId(db), workoutExerciseId: id, position: setPosition, kind })
          .run();
      });
    },
  );
}

// One transaction, so a failed start never leaves the lifter with the old Workout gone.
export function discardAndStartWorkout(
  db: Database,
  discardedId: string,
  { now = Date.now(), ...place }: WorkoutStart,
) {
  return db.transaction((tx) => {
    removeWorkout(tx, discardedId);
    return insertWorkout(tx, place, now);
  });
}

export function currentWorkout(db: Database) {
  return db
    .select({ id: workout.id, routineName: workout.routineName, startedAt: workout.startedAt })
    .from(workout)
    .where(isNull(workout.finishedAt))
    .get();
}

export type HistoryWorkout = {
  id: string;
  startedAt: number;
  timeZone: string;
  // As the Routine was named when the Workout started; null for an empty Workout.
  routineName: string | null;
  gymName: string;
  exerciseCount: number;
};

// `month` runs 1-12, as the Workouts' own time zones read their start.
export type HistoryMonth = { year: number; month: number; workouts: HistoryWorkout[] };

export function listHistory(db: Database): HistoryMonth[] {
  const workouts = db
    .select({
      id: workout.id,
      startedAt: workout.startedAt,
      timeZone: workout.timeZone,
      routineName: workout.routineName,
      gymName: gym.name,
      exerciseCount: count(workoutExercise.id),
    })
    .from(workout)
    .innerJoin(gym, eq(gym.id, workout.gymId))
    .leftJoin(workoutExercise, eq(workoutExercise.workoutId, workout.id))
    .where(isNotNull(workout.finishedAt))
    .groupBy(workout.id)
    .orderBy(desc(workout.startedAt))
    .all();
  const months = new Map<string, HistoryMonth>();
  for (const found of workouts) {
    const { year, month } = wallClockOf(found.startedAt, found.timeZone);
    const key = `${year}-${month}`;
    const group = months.get(key) ?? { year, month, workouts: [] };
    group.workouts.push(found);
    months.set(key, group);
  }
  // Time zones can interleave months in start order, so the months sort on their own.
  return [...months.values()].sort((a, b) => b.year - a.year || b.month - a.month);
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

export type StationOption = { id: string; label: string | null };

export type LedgerExercise = {
  id: string;
  exercise: {
    id: string;
    name: string;
    equipmentType: EquipmentType;
    loadType: LoadType;
    unilateral: boolean;
  };
  // Null until the first logged set or machine note when the Gym has no Station for it yet.
  station: (StationOption & { notes: string | null }) | null;
  // Every Station of the Exercise at the Gym; several mean each one shows its label.
  stations: StationOption[];
  unit: Unit;
  // Null when nothing was planned, as for an Exercise added mid-Workout.
  target: Target | null;
  sets: LedgerSet[];
};

export type Ledger = {
  id: string;
  gymId: string;
  gymName: string;
  // As the Routine was named when the Workout started; null for an empty Workout.
  routineName: string | null;
  startedAt: number;
  finishedAt: number | null;
  timeZone: string;
  exercises: LedgerExercise[];
};

export function getLedger(db: Database, id: string, language: Language): Ledger | undefined {
  const found = db
    .select({
      id: workout.id,
      startedAt: workout.startedAt,
      finishedAt: workout.finishedAt,
      timeZone: workout.timeZone,
      gymId: workout.gymId,
      gymName: gym.name,
      routineName: workout.routineName,
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
      equipmentType: exercise.equipmentType,
      loadType: exercise.loadType,
      unilateral: exercise.unilateral,
      stationId: workoutExercise.stationId,
      stationLabel: station.label,
      stationNotes: station.notes,
      unit: station.unit,
      sets: workoutExercise.sets,
      repMin: workoutExercise.repMin,
      repMax: workoutExercise.repMax,
      rirMin: workoutExercise.rirMin,
      rirMax: workoutExercise.rirMax,
      restSeconds: workoutExercise.restSeconds,
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
  const stationsAtGym = stationsAt(
    db,
    entries.map((entry) => entry.exerciseId),
    found.gymId,
  );
  const { defaultWeightUnit } = getSettings(db);

  return {
    ...found,
    exercises: entries.map(
      ({
        id,
        exerciseId,
        name,
        nameEs,
        equipmentType,
        loadType,
        unilateral,
        stationId,
        stationLabel,
        stationNotes,
        unit,
        ...target
      }) => {
        const entrySets = setsByEntry.get(id) ?? [];
        const lastHere = matchLastHere(entrySets, previousSetsAt(db, stationId, found.startedAt));
        return {
          id,
          exercise: {
            id: exerciseId,
            name: language === "es" ? (nameEs ?? name) : name,
            equipmentType,
            loadType,
            unilateral,
          },
          station: stationId ? { id: stationId, label: stationLabel, notes: stationNotes } : null,
          stations: stationsAtGym
            .filter((option) => option.exerciseId === exerciseId)
            .map(({ id, label }) => ({ id, label })),
          // An Exercise with no Station yet shows the unit its Station will be created with.
          unit: unit ?? newStationUnit(defaultWeightUnit, loadType),
          target: Object.values(target).every((value) => value === null) ? null : target,
          sets: entrySets.map((set, index) => ({ ...set, lastHere: lastHere[index]! })),
        };
      },
    ),
  };
}

// A Retired Station is left out: nothing new is logged to it until it's returned to service.
function stationsAt(db: Database, exerciseIds: string[], gymId: string) {
  return db
    .select({ id: station.id, exerciseId: station.exerciseId, label: station.label })
    .from(station)
    .where(
      and(
        inArray(station.exerciseId, exerciseIds),
        eq(station.gymId, gymId),
        eq(station.retired, false),
      ),
    )
    .orderBy(asc(sql`${station.label} collate nocase`), asc(station.id))
    .all();
}

// A Bodyweight Exercise adds weight to the lifter's body, which no Stack level can express.
function newStationUnit(defaultWeightUnit: Unit, loadType: LoadType): Unit {
  return loadType === "bodyweight" && defaultWeightUnit === "level" ? "kg" : defaultWeightUnit;
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
      .select({ gymId: workout.gymId, routineId: workout.routineId })
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
    if (found.routineId) recordEdit(tx, workoutId, { kind: "add", workoutExerciseId: id });
  });
  return id;
}

// The new Exercise takes over the slot, Targets and set rows included, on its own default Station.
// Logged sets never move between Exercises, so a slot with a confirmed set can't be swapped.
export function swapWorkoutExercise(db: Database, workoutExerciseId: string, exerciseId: string) {
  db.transaction((tx) => {
    const entry = findWorkoutExercise(tx, workoutExerciseId);
    if (hasConfirmedSet(tx, workoutExerciseId)) {
      throw new Error(`Workout Exercise ${workoutExerciseId} has confirmed sets`);
    }
    tx.update(workoutExercise)
      .set({ exerciseId, stationId: defaultStation(tx, exerciseId, entry.gymId)?.id ?? null })
      .where(eq(workoutExercise.id, workoutExerciseId))
      .run();
    // Values typed for the old Exercise mean nothing for the new one, which shows its own ghosts.
    tx.update(workoutSet)
      .set({ load: null, reps: null, rir: null })
      .where(eq(workoutSet.workoutExerciseId, workoutExerciseId))
      .run();
    if (entry.stationId) deleteEmptyStations(tx, [entry.stationId]);
    if (entry.routineExerciseId) {
      recordEdit(tx, entry.workoutId, {
        kind: "swap",
        routineExerciseId: entry.routineExerciseId,
        workoutExerciseId,
        exerciseId,
      });
    }
  });
}

// Distinct from leaving an Exercise unlogged: its logged sets go too.
export function removeWorkoutExercise(db: Database, workoutExerciseId: string) {
  db.transaction((tx) => {
    const entry = findWorkoutExercise(tx, workoutExerciseId);
    tx.delete(workoutExercise).where(eq(workoutExercise.id, workoutExerciseId)).run();
    if (entry.stationId) deleteEmptyStations(tx, [entry.stationId]);
    if (entry.routineExerciseId) {
      recordEdit(tx, entry.workoutId, {
        kind: "remove",
        routineExerciseId: entry.routineExerciseId,
      });
    }
  });
}

// `position` is the Exercise's index in the Ledger once moved.
export function moveWorkoutExercise(db: Database, workoutExerciseId: string, position: number) {
  db.transaction((tx) => {
    const { workoutId, routineExerciseId } = findWorkoutExercise(tx, workoutExerciseId);
    const ids = tx
      .select({ id: workoutExercise.id })
      .from(workoutExercise)
      .where(eq(workoutExercise.workoutId, workoutId))
      .orderBy(asc(workoutExercise.position))
      .all()
      .map((entry) => entry.id)
      .filter((id) => id !== workoutExerciseId);
    if (position < 0 || position > ids.length) {
      throw new Error(`Position ${position} is outside the Workout`);
    }
    ids.splice(position, 0, workoutExerciseId);
    ids.forEach((id, index) => {
      tx.update(workoutExercise).set({ position: index }).where(eq(workoutExercise.id, id)).run();
    });
    // Write-back takes the order from the Ledger at finish, so a slot needs only one Move.
    if (routineExerciseId && !hasMove(tx, workoutExerciseId)) {
      recordEdit(tx, workoutId, { kind: "move", routineExerciseId, workoutExerciseId });
    }
  });
}

function hasMove(db: Database, workoutExerciseId: string) {
  const move = db
    .select({ id: workoutEdit.id })
    .from(workoutEdit)
    .where(and(eq(workoutEdit.kind, "move"), eq(workoutEdit.workoutExerciseId, workoutExerciseId)))
    .get();
  return move !== undefined;
}

// Swap, Move and Remove edit a Routine slot (`routineExerciseId`), null once the slot is gone from
// the Routine. Swaps and moves of an added Exercise are part of its Add. `workoutExerciseId` is the
// Exercise in the Workout, whose place in the Ledger at finish places the edit.
export type WorkoutEdit =
  | {
      kind: "swap";
      routineExerciseId: string | null;
      workoutExerciseId: string;
      exerciseId: string;
    }
  | { kind: "add"; workoutExerciseId: string; exerciseId: string }
  | { kind: "move"; routineExerciseId: string | null; workoutExerciseId: string }
  | { kind: "remove"; routineExerciseId: string | null };

// An Add's Exercise isn't stored: it's whatever the added Exercise is now, swaps included.
type RecordedEdit =
  | { kind: "swap"; routineExerciseId: string; workoutExerciseId: string; exerciseId: string }
  | { kind: "add"; workoutExerciseId: string }
  | { kind: "move"; routineExerciseId: string; workoutExerciseId: string }
  | { kind: "remove"; routineExerciseId: string };

// Write-back only happens at finish, so a finished Workout's edits would never be read.
function recordEdit(db: Database, workoutId: string, edit: RecordedEdit) {
  if (findWorkout(db, workoutId).finishedAt !== null) return;
  const [last] = db
    .select({ position: max(workoutEdit.position) })
    .from(workoutEdit)
    .where(eq(workoutEdit.workoutId, workoutId))
    .all();
  db.insert(workoutEdit)
    .values({ id: newId(db), workoutId, position: (last?.position ?? -1) + 1, ...edit })
    .run();
}

export function listWorkoutEdits(db: Database, workoutId: string): WorkoutEdit[] {
  return db
    .select({
      kind: workoutEdit.kind,
      routineExerciseId: workoutEdit.routineExerciseId,
      swappedTo: workoutEdit.exerciseId,
      workoutExerciseId: workoutEdit.workoutExerciseId,
      current: workoutExercise.exerciseId,
    })
    .from(workoutEdit)
    .leftJoin(workoutExercise, eq(workoutExercise.id, workoutEdit.workoutExerciseId))
    .where(eq(workoutEdit.workoutId, workoutId))
    .orderBy(asc(workoutEdit.position))
    .all()
    .map(({ kind, routineExerciseId, swappedTo, workoutExerciseId, current }): WorkoutEdit => {
      // The workout_edit_swap and workout_edit_remove checks guarantee what each kind carries.
      if (kind === "remove") return { kind, routineExerciseId };
      if (kind === "add")
        return { kind, workoutExerciseId: workoutExerciseId!, exerciseId: current! };
      if (kind === "move")
        return { kind, routineExerciseId, workoutExerciseId: workoutExerciseId! };
      return {
        kind,
        routineExerciseId,
        workoutExerciseId: workoutExerciseId!,
        exerciseId: swappedTo!,
      };
    });
}

// Each Exercise moves to its default Station at the new Gym, so prefill follows the Gym. Sets
// already logged move with the Workout: they were logged at the wrong Gym, and a Station left
// with no history at the old one goes with them.
export function changeWorkoutGym(db: Database, workoutId: string, gymId: string) {
  db.transaction((tx) => {
    const previousStationIds = stationsOf(tx, workoutId);
    tx.update(workout).set({ gymId }).where(eq(workout.id, workoutId)).run();
    const entries = tx
      .select({ id: workoutExercise.id, exerciseId: workoutExercise.exerciseId })
      .from(workoutExercise)
      .where(eq(workoutExercise.workoutId, workoutId))
      .all();
    for (const entry of entries) {
      tx.update(workoutExercise)
        .set({ stationId: defaultStation(tx, entry.exerciseId, gymId)?.id ?? null })
        .where(eq(workoutExercise.id, entry.id))
        .run();
      if (hasConfirmedSet(tx, entry.id)) ensureStation(tx, entry.id);
    }
    deleteEmptyStations(tx, previousStationIds);
  });
}

export type Relabel = { exerciseName: string; from: Unit; to: Unit };

// Moving to another Gym keeps every logged number as it is, so where the Station it lands on reads
// another unit, the number changes meaning. Each logged Exercise lands where changeWorkoutGym puts
// it: its default Station at the Gym, or a new one in the default unit.
export function listGymChangeRelabels(
  db: Database,
  workoutId: string,
  gymId: string,
  language: Language,
): Relabel[] {
  return db
    .select({
      id: workoutExercise.id,
      exerciseId: exercise.id,
      name: exercise.name,
      nameEs: exercise.nameEs,
      loadType: exercise.loadType,
      unit: station.unit,
    })
    .from(workoutExercise)
    .innerJoin(exercise, eq(exercise.id, workoutExercise.exerciseId))
    .innerJoin(station, eq(station.id, workoutExercise.stationId))
    .where(eq(workoutExercise.workoutId, workoutId))
    .orderBy(asc(workoutExercise.position))
    .all()
    .flatMap(({ id, exerciseId, name, nameEs, loadType, unit }) => {
      if (!hasConfirmedSet(db, id)) return [];
      const to = defaultStation(db, exerciseId, gymId)?.unit ?? defaultUnitOf(db, loadType);
      if (to === unit) return [];
      return [{ exerciseName: language === "es" ? (nameEs ?? name) : name, from: unit, to }];
    });
}

// The Station last used for the Exercise at the Gym. One never logged to, kept for its label or
// notes, comes after every Station in use: SQLite sorts the null start time last when descending.
// A Retired Station never is: with no other, the first logged set creates a fresh one.
export function defaultStation(db: Database, exerciseId: string, gymId: string) {
  return db
    .select({ id: station.id, unit: station.unit })
    .from(station)
    .leftJoin(workoutExercise, eq(workoutExercise.stationId, station.id))
    .leftJoin(workout, eq(workout.id, workoutExercise.workoutId))
    .where(
      and(eq(station.exerciseId, exerciseId), eq(station.gymId, gymId), eq(station.retired, false)),
    )
    .groupBy(station.id)
    .orderBy(desc(max(workout.startedAt)), desc(station.id))
    .limit(1)
    .get();
}

export type NewStationLabels = {
  label: string;
  // Names the Station the Gym already holds when it's still unnamed, as it is until a second.
  existingLabel?: string;
};

// The Exercise moves onto the new Station for this Workout, sets and all. Once a Gym holds
// several Stations for an Exercise, each one carries a label, so they can be told apart.
export function addStation(
  db: Database,
  workoutExerciseId: string,
  { label, existingLabel }: NewStationLabels,
) {
  if (!label.trim()) throw new Error("A new Station needs a label");
  db.transaction((tx) => {
    const entry = findWorkoutExercise(tx, workoutExerciseId);
    const unnamed = tx
      .select({ id: station.id })
      .from(station)
      .where(
        and(
          eq(station.exerciseId, entry.exerciseId),
          eq(station.gymId, entry.gymId),
          eq(station.retired, false),
          isNull(station.label),
        ),
      )
      .get();
    if (unnamed) {
      if (!existingLabel?.trim()) throw new Error(`Station ${unnamed.id} needs a label too`);
      tx.update(station)
        .set({ label: existingLabel.trim() })
        .where(eq(station.id, unnamed.id))
        .run();
    }
    assignStation(tx, workoutExerciseId, insertStation(tx, entry, label.trim()));
  });
}

// Sets belong to the Workout Exercise, so they move with it: the numbers stay as logged and read
// in the new Station's unit.
export function switchStation(db: Database, workoutExerciseId: string, stationId: string) {
  db.transaction((tx) => {
    const entry = findWorkoutExercise(tx, workoutExerciseId);
    const target = tx
      .select({ id: station.id })
      .from(station)
      .where(
        and(
          eq(station.id, stationId),
          eq(station.exerciseId, entry.exerciseId),
          eq(station.gymId, entry.gymId),
          eq(station.retired, false),
        ),
      )
      .get();
    if (!target) {
      throw new Error(`Station ${stationId} isn't one in service for this Exercise at this Gym`);
    }
    assignStation(tx, workoutExerciseId, stationId);
  });
}

// Notes need a Station to belong to, so notes written before the first logged set create it.
export function setMachineNotes(db: Database, workoutExerciseId: string, notes: string) {
  db.transaction((tx) => {
    tx.update(station)
      .set({ notes: notes.trim() || null })
      .where(eq(station.id, ensureStation(tx, workoutExerciseId)))
      .run();
  });
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
// A set added to a finished Workout always copies the set above: it records what was done that
// day, which last time doesn't speak for.
export function addSet(db: Database, workoutExerciseId: string) {
  db.transaction((tx) => {
    const { finishedAt } = findWorkoutExercise(tx, workoutExerciseId);
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
    if (above && (finishedAt !== null || !lastHereOfSet(tx, added))) {
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
    // A Bodyweight set with nothing added is bodyweight only, so it needs no load typed.
    if (logged.load === null && loadTypeOf(tx, found.workoutExerciseId) === "bodyweight") {
      logged.load = 0;
    }
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

// An Exercise left with no sets drops out, and a Station left with no history goes with it.
export function deleteSet(db: Database, id: string) {
  db.transaction((tx) => {
    const { workoutExerciseId } = findSet(tx, id);
    tx.delete(workoutSet).where(eq(workoutSet.id, id)).run();
    if (hasSet(tx, workoutExerciseId)) return;
    const { stationId } = findWorkoutExercise(tx, workoutExerciseId);
    tx.delete(workoutExercise).where(eq(workoutExercise.id, workoutExerciseId)).run();
    if (stationId) deleteEmptyStations(tx, [stationId]);
  });
}

export function reopenSet(db: Database, id: string) {
  db.update(workoutSet).set({ done: false }).where(eq(workoutSet.id, id)).run();
}

// The start reads in the Workout's own time zone, which never changes. The duration is kept, and
// overlapping another Workout is fine: only a start that hasn't happened yet is refused.
export function setWorkoutStart(db: Database, id: string, start: WallClock, now = Date.now()) {
  db.transaction((tx) => {
    const found = findWorkout(tx, id);
    const startedAt = epochOf(start, found.timeZone);
    if (startedAt > now) throw new Error(`Workout ${id} can't start in the future`);
    const finishedAt =
      found.finishedAt === null ? null : startedAt + (found.finishedAt - found.startedAt);
    tx.update(workout).set({ startedAt, finishedAt }).where(eq(workout.id, id)).run();
  });
}

export function setWorkoutDuration(db: Database, id: string, minutes: number) {
  if (!Number.isInteger(minutes) || minutes <= 0) {
    throw new Error(`A duration of ${minutes} minutes isn't one a Workout can last`);
  }
  db.transaction((tx) => {
    const found = findWorkout(tx, id);
    if (found.finishedAt === null) throw new Error(`Workout ${id} is still in progress`);
    tx.update(workout)
      .set({ finishedAt: found.startedAt + minutes * 60_000 })
      .where(eq(workout.id, id))
      .run();
  });
}

function findWorkout(db: Database, id: string) {
  const found = db
    .select({
      startedAt: workout.startedAt,
      finishedAt: workout.finishedAt,
      timeZone: workout.timeZone,
    })
    .from(workout)
    .where(eq(workout.id, id))
    .get();
  if (!found) throw new Error(`Workout ${id} doesn't exist`);
  return found;
}

export type FinishOptions = {
  now?: number;
  // Applies exactly what listWriteBack lists to the Workout's Routine.
  writeBack?: boolean;
  // The name of a new Routine copied from the finished Workout, whose id is returned.
  saveAsRoutine?: string;
};

// Skipped sets and Exercises leave no trace, so finishing takes no extra action from the lifter.
// A Workout with nothing logged isn't worth keeping at all, nor saving as a Routine.
export function finishWorkout(
  db: Database,
  id: string,
  { now = Date.now(), writeBack = false, saveAsRoutine }: FinishOptions = {},
) {
  return db.transaction((tx) => {
    if (writeBack) writeBackToRoutine(tx, id);
    const stationIds = stationsOf(tx, id);
    dropUnconfirmed(tx, id);
    const kept = tx.select().from(workoutExercise).where(eq(workoutExercise.workoutId, id)).get();
    if (kept) {
      tx.update(workout).set({ finishedAt: now }).where(eq(workout.id, id)).run();
    } else {
      tx.delete(workout).where(eq(workout.id, id)).run();
    }
    deleteEmptyStations(tx, stationIds);
    if (kept && saveAsRoutine !== undefined) return copyToRoutine(tx, id, saveAsRoutine);
  });
}

// Done in edit mode: sets added but never confirmed weren't part of the Workout, as at finish. A
// Workout left with nothing stays, unlike at finish: deleting it is the lifter's call.
export function finishEditing(db: Database, id: string) {
  db.transaction((tx) => {
    const stationIds = stationsOf(tx, id);
    dropUnconfirmed(tx, id);
    deleteEmptyStations(tx, stationIds);
  });
}

// Done with a Workout from logPastWorkout: unlike an edit, it's kept only if something was logged,
// as at finish, since a backfill with nothing in it records no session.
export function finishLogging(db: Database, id: string) {
  db.transaction((tx) => {
    const stationIds = stationsOf(tx, id);
    dropUnconfirmed(tx, id);
    const kept = tx.select().from(workoutExercise).where(eq(workoutExercise.workoutId, id)).get();
    if (!kept) tx.delete(workout).where(eq(workout.id, id)).run();
    deleteEmptyStations(tx, stationIds);
  });
}

function dropUnconfirmed(db: Database, workoutId: string) {
  const entries = db
    .select({ id: workoutExercise.id })
    .from(workoutExercise)
    .where(eq(workoutExercise.workoutId, workoutId));
  db.delete(workoutSet)
    .where(and(inArray(workoutSet.workoutExerciseId, entries), eq(workoutSet.done, false)))
    .run();
  db.delete(workoutExercise)
    .where(
      and(
        eq(workoutExercise.workoutId, workoutId),
        notExists(
          db.select().from(workoutSet).where(eq(workoutSet.workoutExerciseId, workoutExercise.id)),
        ),
      ),
    )
    .run();
}

type PlannedEdit =
  | { kind: "swap"; routineExerciseId: string; from: string; exerciseId: string }
  | { kind: "add"; workoutExerciseId: string; exerciseId: string; workingSets: number }
  | { kind: "move" | "remove"; routineExerciseId: string; exerciseId: string };

type LedgerEntry = {
  id: string;
  routineExerciseId: string | null;
  exerciseId: string;
  loggedSets: number;
  workingSets: number;
};

// What write-back would apply to the Routine as it is now. Only edits on Exercises with a confirmed
// set count, as finishing keeps only those, and an edit whose slot is gone from the Routine is
// skipped. `order` is the Routine afterwards: slot ids, and Workout Exercise ids for the Adds.
function planWriteBack(db: Database, workoutId: string) {
  const found = db
    .select({ routineId: workout.routineId })
    .from(workout)
    .where(eq(workout.id, workoutId))
    .get();
  if (!found?.routineId) return null;
  const slots = db
    .select({ id: routineExercise.id, exerciseId: routineExercise.exerciseId })
    .from(routineExercise)
    .where(eq(routineExercise.routineId, found.routineId))
    .orderBy(asc(routineExercise.position))
    .all();
  const slotExercise = new Map(slots.map((slot) => [slot.id, slot.exerciseId]));
  const entries = ledgerEntries(db, workoutId);
  const logged = new Map(
    entries.filter((entry) => entry.loggedSets > 0).map((entry) => [entry.id, entry]),
  );
  // Nothing is kept at finish, so there's no Workout to bring the Routine in line with.
  if (logged.size === 0) return null;

  const edits: PlannedEdit[] = [];
  for (const edit of listWorkoutEdits(db, workoutId)) {
    if (edit.kind === "add") {
      const entry = logged.get(edit.workoutExerciseId);
      if (entry) edits.push({ ...edit, workingSets: entry.workingSets });
      continue;
    }
    const { routineExerciseId } = edit;
    const slotExerciseId = routineExerciseId && slotExercise.get(routineExerciseId);
    if (!routineExerciseId || !slotExerciseId) continue;
    const slot = { routineExerciseId, exerciseId: slotExerciseId };
    if (edit.kind === "remove") {
      edits.push({ kind: "remove", ...slot });
      continue;
    }
    const entry = logged.get(edit.workoutExerciseId);
    if (!entry) continue;
    if (edit.kind === "move") {
      edits.push({ kind: "move", ...slot });
      continue;
    }
    // A slot swapped twice before its first set needs one Swap, to what was logged in it.
    const earlier = edits.findIndex(
      (planned) => planned.kind === "swap" && planned.routineExerciseId === slot.routineExerciseId,
    );
    if (earlier >= 0) edits.splice(earlier, 1);
    if (entry.exerciseId !== slotExerciseId) {
      edits.push({ ...slot, kind: "swap", from: slotExerciseId, exerciseId: entry.exerciseId });
    }
  }

  const slotIds = slots.map((slot) => slot.id);
  // A Move that leaves the order as it is would only list a change that never happens. The latest
  // Moves are dropped first, so of two that reach the same order, the one made first is listed.
  let kept = edits;
  for (const move of edits.filter((edit) => edit.kind === "move").reverse()) {
    const without = kept.filter((edit) => edit !== move);
    if (sameOrder(replayOrder(slotIds, entries, without), replayOrder(slotIds, entries, kept))) {
      kept = without;
    }
  }
  return { routineId: found.routineId, edits: kept, order: replayOrder(slotIds, entries, kept) };
}

// Every Exercise in the Ledger, in order, with its confirmed sets counted.
function ledgerEntries(db: Database, workoutId: string): LedgerEntry[] {
  return db
    .select({
      id: workoutExercise.id,
      routineExerciseId: workoutExercise.routineExerciseId,
      exerciseId: workoutExercise.exerciseId,
      loggedSets: count(workoutSet.id),
      // total(), unlike sum(), reads 0 for an Exercise with no confirmed set.
      workingSets: sql<number>`total(${workoutSet.kind} = 'working')`.mapWith(Number),
    })
    .from(workoutExercise)
    .leftJoin(
      workoutSet,
      and(eq(workoutSet.workoutExerciseId, workoutExercise.id), eq(workoutSet.done, true)),
    )
    .where(eq(workoutExercise.workoutId, workoutId))
    .groupBy(workoutExercise.id)
    .orderBy(asc(workoutExercise.position))
    .all();
}

// Slots nobody moved keep their place in the Routine, which may hold slots the Workout never
// showed. Each moved slot or added Exercise goes right after the Exercise above it in the Ledger,
// logged or not, or first when nothing in the Routine is above it.
function replayOrder(slotIds: string[], ledger: LedgerEntry[], edits: PlannedEdit[]) {
  const removed = new Set<string>();
  const placed = new Set<string>();
  for (const edit of edits) {
    if (edit.kind === "remove") removed.add(edit.routineExerciseId);
    if (edit.kind === "move") placed.add(edit.routineExerciseId);
    if (edit.kind === "add") placed.add(edit.workoutExerciseId);
  }
  const order = slotIds.filter((id) => !removed.has(id) && !placed.has(id));
  let above: string | null = null;
  for (const entry of ledger) {
    const key = entry.routineExerciseId ?? entry.id;
    if (placed.has(key)) order.splice(above === null ? 0 : order.indexOf(above) + 1, 0, key);
    if (order.includes(key)) above = key;
  }
  return order;
}

function sameOrder(a: string[], b: string[]) {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

export type WriteBackEdit =
  | { kind: "swap"; from: string; to: string }
  | { kind: "add" | "move" | "remove"; exercise: string };

// The Routine is named as it reads now, since that's the one write-back updates.
export type WriteBack = { routineName: string; edits: WriteBackEdit[] };

// Null when write-back has nothing to offer.
export function listWriteBack(
  db: Database,
  workoutId: string,
  language: Language,
): WriteBack | null {
  const plan = planWriteBack(db, workoutId);
  if (!plan?.edits.length) return null;
  const { name: routineName } = findRoutine(db, plan.routineId);
  const exerciseIds = plan.edits.flatMap((edit) =>
    edit.kind === "swap" ? [edit.from, edit.exerciseId] : [edit.exerciseId],
  );
  const names = new Map(
    db
      .select({ id: exercise.id, name: exercise.name, nameEs: exercise.nameEs })
      .from(exercise)
      .where(inArray(exercise.id, exerciseIds))
      .all()
      .map(({ id, name, nameEs }) => [id, language === "es" ? (nameEs ?? name) : name]),
  );
  const nameOf = (id: string) => names.get(id)!;
  return {
    routineName,
    edits: plan.edits.map((edit) =>
      edit.kind === "swap"
        ? { kind: "swap", from: nameOf(edit.from), to: nameOf(edit.exerciseId) }
        : { kind: edit.kind, exercise: nameOf(edit.exerciseId) },
    ),
  };
}

function writeBackToRoutine(db: Database, workoutId: string) {
  const plan = planWriteBack(db, workoutId);
  if (!plan) return;
  for (const edit of plan.edits) {
    if (edit.kind === "remove") {
      db.delete(routineExercise).where(eq(routineExercise.id, edit.routineExerciseId)).run();
    }
    if (edit.kind === "swap") {
      db.update(routineExercise)
        .set({ exerciseId: edit.exerciseId })
        .where(eq(routineExercise.id, edit.routineExerciseId))
        .run();
    }
  }
  const adds = new Map(
    plan.edits.flatMap((edit) => (edit.kind === "add" ? [[edit.workoutExerciseId, edit]] : [])),
  );
  plan.order.forEach((id, position) => {
    const add = adds.get(id);
    if (!add) {
      db.update(routineExercise).set({ position }).where(eq(routineExercise.id, id)).run();
      return;
    }
    // Only the set count is known from one Workout; the rest is left for the lifter to plan.
    db.insert(routineExercise)
      .values({
        id: newId(db),
        routineId: plan.routineId,
        exerciseId: add.exerciseId,
        position,
        sets: add.workingSets > 0 ? add.workingSets : null,
      })
      .run();
  });
}

// Only what the Workout shows for certain carries over: rep range, effort and rest are left for
// the lifter to plan, and an Exercise with no Working set logged plans no set count.
export function saveWorkoutAsRoutine(db: Database, workoutId: string, name: string) {
  return db.transaction((tx) => copyToRoutine(tx, workoutId, name));
}

function copyToRoutine(db: Database, workoutId: string, name: string) {
  const routineId = createRoutine(db, name);
  const entries = db
    .select({
      exerciseId: workoutExercise.exerciseId,
      workingSets: count(workoutSet.id),
    })
    .from(workoutExercise)
    .leftJoin(
      workoutSet,
      and(
        eq(workoutSet.workoutExerciseId, workoutExercise.id),
        eq(workoutSet.kind, "working"),
        eq(workoutSet.done, true),
      ),
    )
    .where(eq(workoutExercise.workoutId, workoutId))
    .groupBy(workoutExercise.id)
    .orderBy(asc(workoutExercise.position))
    .all();
  entries.forEach(({ exerciseId, workingSets }, position) => {
    db.insert(routineExercise)
      .values({
        id: newId(db),
        routineId,
        exerciseId,
        position,
        sets: workingSets > 0 ? workingSets : null,
      })
      .run();
  });
  return routineId;
}

// What deleting the Workout takes with it. Only logged sets count: the unconfirmed ones of a
// Workout in progress were never part of any history.
export function workoutSetCount(db: Database, id: string) {
  const [sets] = db
    .select({ count: count() })
    .from(workoutSet)
    .innerJoin(workoutExercise, eq(workoutExercise.id, workoutSet.workoutExerciseId))
    .where(and(eq(workoutExercise.workoutId, id), eq(workoutSet.done, true)))
    .all();
  return sets!.count;
}

// A hard delete, for a finished Workout as for discarding the one in progress: there's no undo.
export function deleteWorkout(db: Database, id: string) {
  db.transaction((tx) => removeWorkout(tx, id));
}

function removeWorkout(db: Database, id: string) {
  const stationIds = stationsOf(db, id);
  db.delete(workout).where(eq(workout.id, id)).run();
  deleteEmptyStations(db, stationIds);
}

// For a delete that cascaded into these Workouts: one left with no logged set records no session.
export function deleteWorkoutsLeftEmpty(db: Database, ids: string[]) {
  db.delete(workout)
    .where(
      and(
        inArray(workout.id, ids),
        notExists(
          db
            .select()
            .from(workoutSet)
            .innerJoin(workoutExercise, eq(workoutExercise.id, workoutSet.workoutExerciseId))
            .where(and(eq(workoutExercise.workoutId, workout.id), eq(workoutSet.done, true))),
        ),
      ),
    )
    .run();
}

function stationsOf(db: Database, workoutId: string) {
  return db
    .select({ id: workoutExercise.stationId })
    .from(workoutExercise)
    .where(and(eq(workoutExercise.workoutId, workoutId), isNotNull(workoutExercise.stationId)))
    .all()
    .map((entry) => entry.id!);
}

// A Station created by sets that were then dropped would otherwise linger with no history. One
// the lifter named or wrote notes for is kept: it stands for real equipment.
function deleteEmptyStations(db: Database, ids: string[]) {
  db.delete(station)
    .where(
      and(
        inArray(station.id, ids),
        isNull(station.label),
        isNull(station.notes),
        notExists(
          db.select().from(workoutExercise).where(eq(workoutExercise.stationId, station.id)),
        ),
      ),
    )
    .run();
}

function findWorkoutExercise(db: Database, workoutExerciseId: string) {
  const entry = db
    .select({
      workoutId: workoutExercise.workoutId,
      routineExerciseId: workoutExercise.routineExerciseId,
      stationId: workoutExercise.stationId,
      exerciseId: workoutExercise.exerciseId,
      loadType: exercise.loadType,
      gymId: workout.gymId,
      finishedAt: workout.finishedAt,
    })
    .from(workoutExercise)
    .innerJoin(workout, eq(workout.id, workoutExercise.workoutId))
    .innerJoin(exercise, eq(exercise.id, workoutExercise.exerciseId))
    .where(eq(workoutExercise.id, workoutExerciseId))
    .get();
  if (!entry) throw new Error(`Workout Exercise ${workoutExerciseId} doesn't exist`);
  return entry;
}

function assignStation(db: Database, workoutExerciseId: string, stationId: string) {
  db.update(workoutExercise)
    .set({ stationId })
    .where(eq(workoutExercise.id, workoutExerciseId))
    .run();
}

function insertStation(
  db: Database,
  entry: { exerciseId: string; gymId: string; loadType: LoadType },
  label: string | null = null,
) {
  const id = newId(db);
  db.insert(station)
    .values({
      id,
      exerciseId: entry.exerciseId,
      gymId: entry.gymId,
      unit: defaultUnitOf(db, entry.loadType),
      label,
    })
    .run();
  return id;
}

function defaultUnitOf(db: Database, loadType: LoadType) {
  return newStationUnit(getSettings(db).defaultWeightUnit, loadType);
}

function ensureStation(db: Database, workoutExerciseId: string) {
  const entry = findWorkoutExercise(db, workoutExerciseId);
  if (entry.stationId) return entry.stationId;
  const stationId =
    defaultStation(db, entry.exerciseId, entry.gymId)?.id ?? insertStation(db, entry);
  assignStation(db, workoutExerciseId, stationId);
  return stationId;
}

function loadTypeOf(db: Database, workoutExerciseId: string) {
  const entry = db
    .select({ loadType: exercise.loadType })
    .from(workoutExercise)
    .innerJoin(exercise, eq(exercise.id, workoutExercise.exerciseId))
    .where(eq(workoutExercise.id, workoutExerciseId))
    .get();
  if (!entry) throw new Error(`Workout Exercise ${workoutExerciseId} doesn't exist`);
  return entry.loadType;
}

function hasConfirmedSet(db: Database, workoutExerciseId: string) {
  const confirmed = db
    .select({ id: workoutSet.id })
    .from(workoutSet)
    .where(and(eq(workoutSet.workoutExerciseId, workoutExerciseId), eq(workoutSet.done, true)))
    .get();
  return confirmed !== undefined;
}

function hasSet(db: Database, workoutExerciseId: string) {
  const found = db
    .select({ id: workoutSet.id })
    .from(workoutSet)
    .where(eq(workoutSet.workoutExerciseId, workoutExerciseId))
    .get();
  return found !== undefined;
}

function findSet(db: Database, id: string) {
  const set = db.select().from(workoutSet).where(eq(workoutSet.id, id)).get();
  if (!set) throw new Error(`Set ${id} doesn't exist`);
  return set;
}
