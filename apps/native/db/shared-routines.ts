import { and, asc, eq, inArray, max } from "drizzle-orm";

import type { Language } from "@/lib/i18n/locale";
import type { Target } from "@/lib/workout/model";

import type { Database } from "./database";
import { newId } from "./id";
import { exercise, routine, routineExercise } from "./schema";

// The file format is a contract with every copy already sent (ADR 0006): any change to it bumps
// the version.
const FORMAT = "crowbar-routine";
const VERSION = 1;

type Targets = Target & { warmups: number };

type SharedSlot = Targets & { exercise: { builtIn: string } };

type SharedRoutine = {
  format: typeof FORMAT;
  version: typeof VERSION;
  name: string;
  exercises: SharedSlot[];
};

// Custom Exercises aren't carried yet: sharing one now would produce a file that a version which
// carries them reads differently.
export type RoutineShare =
  | { shareable: true; content: string }
  | { shareable: false; problem: "customExercise" };

export function shareRoutine(db: Database, id: string): RoutineShare {
  const found = db.select({ name: routine.name }).from(routine).where(eq(routine.id, id)).get();
  if (!found) throw new Error(`Routine ${id} doesn't exist`);
  const slots = db
    .select({
      exerciseId: routineExercise.exerciseId,
      builtIn: exercise.builtIn,
      targets: {
        warmups: routineExercise.warmups,
        sets: routineExercise.sets,
        repMin: routineExercise.repMin,
        repMax: routineExercise.repMax,
        rirMin: routineExercise.rirMin,
        rirMax: routineExercise.rirMax,
        restSeconds: routineExercise.restSeconds,
      },
    })
    .from(routineExercise)
    .innerJoin(exercise, eq(exercise.id, routineExercise.exerciseId))
    .where(eq(routineExercise.routineId, id))
    .orderBy(asc(routineExercise.position))
    .all();
  if (slots.some((slot) => !slot.builtIn)) return { shareable: false, problem: "customExercise" };
  const shared: SharedRoutine = {
    format: FORMAT,
    version: VERSION,
    name: found.name,
    exercises: slots.map(({ exerciseId, targets }) => ({
      exercise: { builtIn: exerciseId },
      ...targets,
    })),
  };
  return { shareable: true, content: JSON.stringify(shared) };
}

// "newer" covers both a newer format and a Built-in Exercise this app doesn't ship yet: updating
// Crowbar fixes either.
export type SharedRoutineProblem = "newer" | "damaged";

export type SharedRoutinePreview =
  | { valid: true; name: string; exercises: { id: string; name: string }[] }
  | { valid: false; problem: SharedRoutineProblem };

export function previewSharedRoutine(
  db: Database,
  content: string,
  language: Language,
): SharedRoutinePreview {
  const reading = readSharedRoutine(db, content);
  if (!reading.valid) return reading;
  return {
    valid: true,
    name: reading.name,
    exercises: reading.slots.map(({ exercise: found }) => ({
      id: found.id,
      name: language === "es" ? (found.nameEs ?? found.name) : found.name,
    })),
  };
}

// Reads the file again rather than trusting the preview, so it holds even if the library changed
// while the preview was open. Nothing is written for a file the preview would reject.
export function importSharedRoutine(db: Database, content: string) {
  const id = newId(db);
  db.transaction((tx) => {
    const reading = readSharedRoutine(tx, content);
    if (!reading.valid) throw new Error(`Shared Routine rejected: ${reading.problem}`);
    const [last] = tx
      .select({ position: max(routine.position) })
      .from(routine)
      .all();
    tx.insert(routine)
      .values({ id, name: reading.name, position: (last?.position ?? -1) + 1 })
      .run();
    reading.slots.forEach(({ exercise: found, ...targets }, position) => {
      tx.insert(routineExercise)
        .values({ ...targets, id: newId(tx), routineId: id, exerciseId: found.id, position })
        .run();
    });
  });
  return id;
}

type BuiltIn = { id: string; name: string; nameEs: string | null };

type Reading =
  | { valid: true; name: string; slots: (Targets & { exercise: BuiltIn })[] }
  | { valid: false; problem: SharedRoutineProblem };

function readSharedRoutine(db: Database, content: string): Reading {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return { valid: false, problem: "damaged" };
  }
  if (!isRecord(parsed) || parsed.format !== FORMAT || !Number.isInteger(parsed.version))
    return { valid: false, problem: "damaged" };
  if ((parsed.version as number) > VERSION) return { valid: false, problem: "newer" };
  const shared = asSharedRoutine(parsed);
  if (!shared) return { valid: false, problem: "damaged" };

  const slugs = shared.exercises.map((slot) => slot.exercise.builtIn);
  const builtIns = new Map(
    db
      .select({ id: exercise.id, name: exercise.name, nameEs: exercise.nameEs })
      .from(exercise)
      .where(and(eq(exercise.builtIn, true), inArray(exercise.id, slugs)))
      .all()
      .map((found) => [found.id, found]),
  );
  if (slugs.some((slug) => !builtIns.has(slug))) return { valid: false, problem: "newer" };
  return {
    valid: true,
    name: shared.name,
    slots: shared.exercises.map(({ exercise: reference, ...targets }) => ({
      ...targets,
      exercise: builtIns.get(reference.builtIn)!,
    })),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Mirrors the routine_exercise CHECK constraints, so a file that passes always inserts.
function asSharedRoutine(value: Record<string, unknown>): SharedRoutine | null {
  if (value.version !== VERSION || typeof value.name !== "string") return null;
  if (!Array.isArray(value.exercises) || !value.exercises.every(isSharedSlot)) return null;
  return value as SharedRoutine;
}

function isSharedSlot(value: unknown): value is SharedSlot {
  return (
    isRecord(value) &&
    isRecord(value.exercise) &&
    typeof value.exercise.builtIn === "string" &&
    isCount(value.warmups, 0) &&
    (value.sets === null || isCount(value.sets, 1)) &&
    isRange(value.repMin, value.repMax, 1) &&
    isRange(value.rirMin, value.rirMax, 0) &&
    (value.restSeconds === null || isCount(value.restSeconds, 1))
  );
}

function isCount(value: unknown, least: number): value is number {
  return Number.isInteger(value) && (value as number) >= least;
}

// A range is either fully planned or left blank.
function isRange(min: unknown, max: unknown, least: number) {
  if (min === null && max === null) return true;
  return isCount(min, least) && isCount(max, least) && min <= max;
}
