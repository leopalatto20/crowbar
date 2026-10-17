import { and, asc, count, desc, eq, isNull, sql } from "drizzle-orm";

import type { Database } from "./database";
import { newId } from "./id";
import { gym, station, workout, workoutExercise, workoutSet } from "./schema";

export type Gym = typeof gym.$inferSelect;

export function createGym(db: Database, name: string) {
  const id = newId(db);
  db.insert(gym).values({ id, name: name.trim() }).run();
  return id;
}

export function renameGym(db: Database, id: string, name: string) {
  db.update(gym).set({ name: name.trim() }).where(eq(gym.id, id)).run();
}

export function listGyms(db: Database): Gym[] {
  return db
    .select()
    .from(gym)
    .orderBy(asc(sql`${gym.name} collate nocase`))
    .all();
}

// Derived rather than stored, so it can never point at a deleted Gym: the Current Gym, else the
// newest Gym (ids are time-ordered), which covers a first Workout discarded.
export function lastUsedGym(db: Database): Gym | undefined {
  return currentGym(db) ?? db.select().from(gym).orderBy(desc(gym.id)).limit(1).get();
}

// Where progress is read when no Gym has been chosen: the Gym of the Workout in progress, else of
// the most recent Workout. In progress comes first, since a past Workout can start later.
export function currentGym(db: Database): Gym | undefined {
  return db
    .select({ id: gym.id, name: gym.name })
    .from(workout)
    .innerJoin(gym, eq(gym.id, workout.gymId))
    .orderBy(desc(isNull(workout.finishedAt)), desc(workout.startedAt))
    .limit(1)
    .get();
}

export type GymHistoryCounts = { stations: number; workouts: number; sets: number };

// What deleting the Gym takes with it. Only logged sets count: the unconfirmed ones of a Workout
// in progress were never part of any history.
export function gymHistoryCounts(db: Database, id: string): GymHistoryCounts {
  const [stations] = db.select({ count: count() }).from(station).where(eq(station.gymId, id)).all();
  const [workouts] = db.select({ count: count() }).from(workout).where(eq(workout.gymId, id)).all();
  const [sets] = db
    .select({ count: count() })
    .from(workoutSet)
    .innerJoin(workoutExercise, eq(workoutExercise.id, workoutSet.workoutExerciseId))
    .innerJoin(workout, eq(workout.id, workoutExercise.workoutId))
    .where(and(eq(workout.gymId, id), eq(workoutSet.done, true)))
    .all();
  return { stations: stations!.count, workouts: workouts!.count, sets: sets!.count };
}

// Stations and Workouts cascade from the Gym in the schema, and sets from them.
export function deleteGym(db: Database, id: string) {
  db.delete(gym).where(eq(gym.id, id)).run();
}
