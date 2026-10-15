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

type WorkoutStart = { gymId: string; timeZone: string; routineId?: string; now?: number };

// The database rejects a second unfinished Workout, so one in progress must be finished or
// discarded first.
export function startWorkout(db: Database, start: WorkoutStart) {
  return db.transaction((tx) => insertWorkout(tx, start));
}

function insertWorkout(
  db: Database,
  { gymId, timeZone, routineId, now = Date.now() }: WorkoutStart,
) {
  const id = newId(db);
  const source = routineId ? findRoutine(db, routineId) : undefined;
  db.insert(workout)
    .values({ id, gymId, routineId, routineName: source?.name, startedAt: now, timeZone })
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
export function discardAndStartWorkout(db: Database, discardedId: string, start: WorkoutStart) {
  return db.transaction((tx) => {
    removeWorkout(tx, discardedId);
    return insertWorkout(tx, start);
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
    const { year, month } = monthOf(found.startedAt, found.timeZone);
    const key = `${year}-${month}`;
    const group = months.get(key) ?? { year, month, workouts: [] };
    group.workouts.push(found);
    months.set(key, group);
  }
  // Time zones can interleave months in start order, so the months sort on their own.
  return [...months.values()].sort((a, b) => b.year - a.year || b.month - a.month);
}

function monthOf(epochMs: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
  }).formatToParts(epochMs);
  const part = (type: "year" | "month") => Number(parts.find((p) => p.type === type)!.value);
  return { year: part("year"), month: part("month") };
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

function stationsAt(db: Database, exerciseIds: string[], gymId: string) {
  return db
    .select({ id: station.id, exerciseId: station.exerciseId, label: station.label })
    .from(station)
    .where(and(inArray(station.exerciseId, exerciseIds), eq(station.gymId, gymId)))
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

function recordEdit(db: Database, workoutId: string, edit: RecordedEdit) {
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

// The Station last used for the Exercise at the Gym. One never logged to, kept for its label or
// notes, comes after every Station in use: SQLite sorts the null start time last when descending.
function defaultStation(db: Database, exerciseId: string, gymId: string) {
  return db
    .select({ id: station.id })
    .from(station)
    .leftJoin(workoutExercise, eq(workoutExercise.stationId, station.id))
    .leftJoin(workout, eq(workout.id, workoutExercise.workoutId))
    .where(and(eq(station.exerciseId, exerciseId), eq(station.gymId, gymId)))
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
        ),
      )
      .get();
    if (!target) throw new Error(`Station ${stationId} isn't one for this Exercise at this Gym`);
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

// Only what the Workout shows for certain carries over: rep range, effort and rest are left for
// the lifter to plan, and an Exercise with no Working set logged plans no set count.
export function saveWorkoutAsRoutine(db: Database, workoutId: string, name: string) {
  return db.transaction((tx) => {
    const routineId = createRoutine(tx, name);
    const entries = tx
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
      tx.insert(routineExercise)
        .values({
          id: newId(tx),
          routineId,
          exerciseId,
          position,
          sets: workingSets > 0 ? workingSets : null,
        })
        .run();
    });
    return routineId;
  });
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
      unit: newStationUnit(getSettings(db).defaultWeightUnit, entry.loadType),
      label,
    })
    .run();
  return id;
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

function findSet(db: Database, id: string) {
  const set = db.select().from(workoutSet).where(eq(workoutSet.id, id)).get();
  if (!set) throw new Error(`Set ${id} doesn't exist`);
  return set;
}
