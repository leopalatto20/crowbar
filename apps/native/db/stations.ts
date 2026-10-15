import { and, count, countDistinct, eq, inArray, isNotNull, isNull, notExists } from "drizzle-orm";

import type { Unit } from "@/lib/workout/model";

import type { Database } from "./database";
import { exercise, station, workout, workoutExercise, workoutSet } from "./schema";
import { defaultStation, deleteWorkoutsLeftEmpty } from "./workouts";

// Relabels rather than converts: a wrong unit is a labelling mistake, and the numbers logged are
// what the equipment showed. A Bodyweight load is weight added to the body, never a Stack level.
export function setStationUnit(db: Database, id: string, unit: Unit) {
  db.transaction((tx) => {
    const found = findStation(tx, id);
    if (found.loadType === "bodyweight" && unit === "level") {
      throw new Error(`Station ${id} is for a Bodyweight Exercise, which can't use Stack levels`);
    }
    tx.update(station).set({ unit }).where(eq(station.id, id)).run();
  });
}

function findStation(db: Database, id: string) {
  const found = db
    .select({
      exerciseId: station.exerciseId,
      gymId: station.gymId,
      notes: station.notes,
      loadType: exercise.loadType,
    })
    .from(station)
    .innerJoin(exercise, eq(exercise.id, station.exerciseId))
    .where(eq(station.id, id))
    .get();
  if (!found) throw new Error(`Station ${id} doesn't exist`);
  return found;
}

// Its history stays readable in Exercise detail. An Exercise of the Workout in progress with
// nothing logged on it yet moves to its default Station, so its first set lands elsewhere; one
// with sets logged keeps them where they are.
export function retireStation(db: Database, id: string) {
  db.transaction((tx) => {
    const found = findStation(tx, id);
    tx.update(station).set({ retired: true }).where(eq(station.id, id)).run();
    moveEntries(tx, unloggedEntries(tx, id), defaultStation(tx, found.exerciseId, found.gymId));
  });
}

export function returnStationToService(db: Database, id: string) {
  db.update(station).set({ retired: false }).where(eq(station.id, id)).run();
}

export function renameStation(db: Database, id: string, label: string) {
  if (!label.trim()) throw new Error("A Station's label can't be blank");
  db.update(station).set({ label: label.trim() }).where(eq(station.id, id)).run();
}

export function setStationNotes(db: Database, id: string, notes: string) {
  db.update(station)
    .set({ notes: notes.trim() || null })
    .where(eq(station.id, id))
    .run();
}

// Two Stations that turn out to be the same equipment collapse into one history. Only Stations of
// one Exercise at one Gym can be: history never crosses either (ADR 0001). The target stays as it
// is, so the moved sets read in its unit, and a Workout that logged on both keeps both slots.
export function mergeStation(db: Database, sourceId: string, targetId: string) {
  if (sourceId === targetId) throw new Error(`Station ${sourceId} can't merge into itself`);
  db.transaction((tx) => {
    const source = findStation(tx, sourceId);
    const target = findStation(tx, targetId);
    if (source.exerciseId !== target.exerciseId || source.gymId !== target.gymId) {
      throw new Error(`Station ${sourceId} isn't for the same Exercise and Gym as ${targetId}`);
    }
    tx.update(workoutExercise)
      .set({ stationId: targetId })
      .where(eq(workoutExercise.stationId, sourceId))
      .run();
    tx.update(station)
      .set({ notes: mergedNotes(target.notes, source.notes) })
      .where(eq(station.id, targetId))
      .run();
    tx.delete(station).where(eq(station.id, sourceId)).run();
  });
}

function mergedNotes(target: string | null, source: string | null) {
  if (!target || !source || target === source) return target ?? source;
  return `${target}\n${source}`;
}

export type StationHistoryCounts = { sets: number; workouts: number };

// What deleting the Station takes with it. Only logged sets count: the unconfirmed ones of a
// Workout in progress were never part of any history.
export function stationHistoryCounts(db: Database, id: string): StationHistoryCounts {
  const [counts] = db
    .select({ sets: count(), workouts: countDistinct(workoutExercise.workoutId) })
    .from(workoutSet)
    .innerJoin(workoutExercise, eq(workoutExercise.id, workoutSet.workoutExerciseId))
    .where(and(eq(workoutExercise.stationId, id), eq(workoutSet.done, true)))
    .all();
  return counts!;
}

// Its Workout Exercises cascade from it in the schema, and their sets with them, as does a
// finished Workout left with no logged set. An Exercise of the Workout in progress with nothing
// logged yet stays, on its default Station, as when retiring.
export function deleteStation(db: Database, id: string) {
  db.transaction((tx) => {
    const found = findStation(tx, id);
    const finishedIds = tx
      .selectDistinct({ id: workout.id })
      .from(workout)
      .innerJoin(workoutExercise, eq(workoutExercise.workoutId, workout.id))
      .where(and(eq(workoutExercise.stationId, id), isNotNull(workout.finishedAt)))
      .all()
      .map((finished) => finished.id);
    // Detached first, or the cascade would take them too.
    const unlogged = unloggedEntries(tx, id);
    moveEntries(tx, unlogged, undefined);
    tx.delete(station).where(eq(station.id, id)).run();
    moveEntries(tx, unlogged, defaultStation(tx, found.exerciseId, found.gymId));
    deleteWorkoutsLeftEmpty(tx, finishedIds);
  });
}

// The Exercises of the Workout in progress on the Station with no confirmed set on them yet.
function unloggedEntries(db: Database, stationId: string) {
  return db
    .select({ id: workoutExercise.id })
    .from(workoutExercise)
    .innerJoin(workout, eq(workout.id, workoutExercise.workoutId))
    .where(
      and(
        eq(workoutExercise.stationId, stationId),
        isNull(workout.finishedAt),
        notExists(
          db
            .select()
            .from(workoutSet)
            .where(
              and(eq(workoutSet.workoutExerciseId, workoutExercise.id), eq(workoutSet.done, true)),
            ),
        ),
      ),
    )
    .all()
    .map((entry) => entry.id);
}

function moveEntries(db: Database, ids: string[], to: { id: string } | undefined) {
  db.update(workoutExercise)
    .set({ stationId: to?.id ?? null })
    .where(inArray(workoutExercise.id, ids))
    .run();
}
