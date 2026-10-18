import { and, asc, count, desc, eq, gt, isNotNull, max, notExists, sql } from "drizzle-orm";

import type { Language } from "@/lib/i18n/locale";
import type { Target } from "@/lib/workout/model";

import type { Database } from "./database";
import { newId } from "./id";
import { exercise, gym, routine, routineExercise, workout } from "./schema";

type RoutineName = Pick<typeof routine.$inferSelect, "id" | "name">;

export type LastRun = { startedAt: number; gymName: string };

export type RoutineListing = RoutineName & { lastRun: LastRun | null };

export function listRoutines(db: Database): RoutineListing[] {
  return db
    .select({ id: routine.id, name: routine.name })
    .from(routine)
    .orderBy(asc(routine.position))
    .all()
    .map((found) => ({ ...found, lastRun: lastRun(db, found.id) ?? null }));
}

// Only a finished Workout counts as a run; the one in progress is still underway.
function lastRun(db: Database, routineId: string) {
  return db
    .select({ startedAt: workout.startedAt, gymName: gym.name })
    .from(workout)
    .innerJoin(gym, eq(gym.id, workout.gymId))
    .where(and(eq(workout.routineId, routineId), isNotNull(workout.finishedAt)))
    .orderBy(desc(workout.startedAt))
    .limit(1)
    .get();
}

export function createRoutine(db: Database, name: string) {
  const id = newId(db);
  const [last] = db
    .select({ position: max(routine.position) })
    .from(routine)
    .all();
  db.insert(routine)
    .values({ id, name: name.trim(), position: (last?.position ?? -1) + 1 })
    .run();
  return id;
}

export function renameRoutine(db: Database, id: string, name: string) {
  db.update(routine).set({ name: name.trim() }).where(eq(routine.id, id)).run();
}

export function reorderRoutines(db: Database, ids: string[]) {
  db.transaction((tx) => {
    ids.forEach((id, position) => {
      tx.update(routine).set({ position }).where(eq(routine.id, id)).run();
    });
  });
}

// What deleting the Routine takes with it: its design, one slot per Exercise.
export function routineExerciseCount(db: Database, id: string) {
  const [exercises] = db
    .select({ count: count() })
    .from(routineExercise)
    .where(eq(routineExercise.routineId, id))
    .all();
  return exercises!.count;
}

export function deleteRoutine(db: Database, id: string) {
  db.delete(routine).where(eq(routine.id, id)).run();
}

// "+" creates the Routine up front so every edit can write through; backing out of it untouched
// shouldn't leave an empty Routine behind.
export function discardBlankRoutine(db: Database, id: string) {
  db.delete(routine)
    .where(
      and(
        eq(routine.id, id),
        eq(routine.name, ""),
        notExists(db.select().from(routineExercise).where(eq(routineExercise.routineId, id))),
      ),
    )
    .run();
}

// The copy lands right after the original, so a variant of a day sits beside it.
export function duplicateRoutine(db: Database, id: string, name: string) {
  const copyId = newId(db);
  db.transaction((tx) => {
    const original = tx.select().from(routine).where(eq(routine.id, id)).get();
    if (!original) throw new Error(`Routine ${id} doesn't exist`);
    tx.update(routine)
      .set({ position: sql`${routine.position} + 1` })
      .where(gt(routine.position, original.position))
      .run();
    tx.insert(routine)
      .values({ id: copyId, name: name.trim(), position: original.position + 1 })
      .run();
    const entries = tx
      .select()
      .from(routineExercise)
      .where(eq(routineExercise.routineId, id))
      .all();
    for (const entry of entries) {
      tx.insert(routineExercise)
        .values({ ...entry, id: newId(tx), routineId: copyId })
        .run();
    }
  });
  return copyId;
}

type Targets = Target & { warmups: number };

export type RoutineExercise = Targets & {
  id: string;
  exercise: { id: string; name: string };
};

export type RoutineDetail = RoutineName & { exercises: RoutineExercise[] };

export function getRoutine(
  db: Database,
  id: string,
  language: Language,
): RoutineDetail | undefined {
  const found = db
    .select({ id: routine.id, name: routine.name })
    .from(routine)
    .where(eq(routine.id, id))
    .get();
  if (!found) return undefined;
  const exercises = db
    .select({
      id: routineExercise.id,
      exerciseId: exercise.id,
      name: exercise.name,
      nameEs: exercise.nameEs,
      warmups: routineExercise.warmups,
      sets: routineExercise.sets,
      repMin: routineExercise.repMin,
      repMax: routineExercise.repMax,
      rirMin: routineExercise.rirMin,
      rirMax: routineExercise.rirMax,
      restSeconds: routineExercise.restSeconds,
    })
    .from(routineExercise)
    .innerJoin(exercise, eq(exercise.id, routineExercise.exerciseId))
    .where(eq(routineExercise.routineId, id))
    .orderBy(asc(routineExercise.position))
    .all()
    .map(({ exerciseId, name, nameEs, ...entry }) => ({
      ...entry,
      exercise: { id: exerciseId, name: language === "es" ? (nameEs ?? name) : name },
    }));
  return { ...found, exercises };
}

const NEW_ROUTINE_EXERCISE = {
  warmups: 0,
  sets: 3,
  repMin: 8,
  repMax: 12,
  rirMin: 1,
  rirMax: 2,
  restSeconds: 120,
} satisfies Targets;

export function addRoutineExercise(db: Database, routineId: string, exerciseId: string) {
  const id = newId(db);
  const [last] = db
    .select({ position: max(routineExercise.position) })
    .from(routineExercise)
    .where(eq(routineExercise.routineId, routineId))
    .all();
  db.insert(routineExercise)
    .values({
      ...NEW_ROUTINE_EXERCISE,
      id,
      routineId,
      exerciseId,
      position: (last?.position ?? -1) + 1,
    })
    .run();
  return id;
}

export type TargetsChange = Partial<Targets>;

export function updateRoutineExercise(db: Database, id: string, change: TargetsChange) {
  db.update(routineExercise).set(change).where(eq(routineExercise.id, id)).run();
}

// The slot keeps its place and Targets, as a Swap written back from a finished Workout does.
export function swapRoutineExercise(db: Database, id: string, exerciseId: string) {
  db.update(routineExercise).set({ exerciseId }).where(eq(routineExercise.id, id)).run();
}

export function removeRoutineExercise(db: Database, id: string) {
  db.delete(routineExercise).where(eq(routineExercise.id, id)).run();
}

export function reorderRoutineExercises(db: Database, ids: string[]) {
  db.transaction((tx) => {
    ids.forEach((id, position) => {
      tx.update(routineExercise).set({ position }).where(eq(routineExercise.id, id)).run();
    });
  });
}
