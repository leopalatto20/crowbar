import { asc, eq, max } from "drizzle-orm";

import { EQUIPMENT_TYPES, LOAD_TYPES, MUSCLE_GROUPS, type LoadType } from "@/lib/exercise/model";
import type { Language } from "@/lib/i18n/locale";
import type { Target } from "@/lib/workout/model";

import type { Database } from "./database";
import { exerciseNamed, foldCaseAndAccents, type NewCustomExercise } from "./exercises";
import { newId } from "./id";
import { exercise, routine, routineExercise } from "./schema";

// The file format is a contract with every copy already sent (ADR 0006): any change to it bumps
// the version. Version 1 carried only Built-in Exercises, so it still reads as version 2.
const FORMAT = "crowbar-routine";
const VERSION = 2;

type Targets = Target & { warmups: number };

type CustomDefinition = Required<NewCustomExercise>;

type SharedExercise = { builtIn: string } | { custom: CustomDefinition };

type SharedSlot = Targets & { exercise: SharedExercise };

type SharedRoutine = {
  format: typeof FORMAT;
  version: number;
  name: string;
  exercises: SharedSlot[];
};

export function shareRoutine(db: Database, id: string) {
  const found = db.select({ name: routine.name }).from(routine).where(eq(routine.id, id)).get();
  if (!found) throw new Error(`Routine ${id} doesn't exist`);
  const slots = db
    .select({
      exercise: {
        id: exercise.id,
        builtIn: exercise.builtIn,
        name: exercise.name,
        equipmentType: exercise.equipmentType,
        loadType: exercise.loadType,
        unilateral: exercise.unilateral,
        muscleGroup: exercise.muscleGroup,
      },
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
  const shared: SharedRoutine = {
    format: FORMAT,
    version: VERSION,
    name: found.name,
    exercises: slots.map(({ exercise: { id, builtIn, ...custom }, targets }) => ({
      exercise: builtIn ? { builtIn: id } : { custom },
      ...targets,
    })),
  };
  return JSON.stringify(shared);
}

// "newer" covers both a newer format and a Built-in Exercise this app doesn't ship yet: updating
// Crowbar fixes either.
export type SharedRoutineProblem = "newer" | "damaged";

// Only a Custom Exercise from the file is reused or new: a Built-in one is always the receiver's.
export type SharedExerciseMatch = "reused" | "new" | null;

export type SharedRoutinePreview =
  | { valid: true; name: string; exercises: { name: string; match: SharedExerciseMatch }[] }
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
    exercises: reading.slots.map(({ exercise: found, match }) => ({
      name: language === "es" ? (found.nameEs ?? found.name) : found.name,
      match,
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
    if (reading.created.length > 0) tx.insert(exercise).values(reading.created).run();
    const [last] = tx
      .select({ position: max(routine.position) })
      .from(routine)
      .all();
    tx.insert(routine)
      .values({ id, name: reading.name, position: (last?.position ?? -1) + 1 })
      .run();
    reading.slots.forEach(({ exercise: found, targets }, position) => {
      tx.insert(routineExercise)
        .values({
          ...targets,
          id: newId(tx),
          routineId: id,
          exerciseId: found.id,
          position,
        })
        .run();
    });
  });
  return id;
}

type Known = {
  id: string;
  name: string;
  nameEs: string | null;
  loadType: LoadType;
  unilateral: boolean;
  builtIn: boolean;
  names: string[];
};

type NewExercise = CustomDefinition & { id: string; builtIn: false };

type Reading =
  | {
      valid: true;
      name: string;
      slots: { targets: Targets; exercise: Known; match: SharedExerciseMatch }[];
      created: NewExercise[];
    }
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

  // Every Exercise created earlier in the same file joins the pool, so the same Custom Exercise
  // in two slots resolves to one.
  const pool = knownExercises(db);
  const builtIns = new Map(pool.filter((found) => found.builtIn).map((found) => [found.id, found]));
  const slugs = shared.exercises.flatMap(({ exercise: reference }) =>
    "builtIn" in reference ? [reference.builtIn] : [],
  );
  if (slugs.some((slug) => !builtIns.has(slug))) return { valid: false, problem: "newer" };

  const created: NewExercise[] = [];
  function resolve(reference: SharedExercise): { exercise: Known; match: SharedExerciseMatch } {
    if ("builtIn" in reference) return { exercise: builtIns.get(reference.builtIn)!, match: null };
    const reused = matchingExercise(pool, reference.custom);
    if (reused)
      return {
        exercise: reused,
        match: created.some((found) => found.id === reused.id) ? "new" : "reused",
      };
    const fresh: NewExercise = {
      ...reference.custom,
      id: newId(db),
      name: unusedName(pool, reference.custom.name),
      builtIn: false,
    };
    created.push(fresh);
    const known: Known = { ...fresh, nameEs: null, names: [fresh.name] };
    pool.push(known);
    return { exercise: known, match: "new" };
  }
  const slots = shared.exercises.map(({ exercise: reference, ...targets }) => ({
    targets,
    ...resolve(reference),
  }));
  return { valid: true, name: shared.name, slots, created };
}

function knownExercises(db: Database): Known[] {
  return db
    .select({
      id: exercise.id,
      name: exercise.name,
      nameEs: exercise.nameEs,
      loadType: exercise.loadType,
      unilateral: exercise.unilateral,
      builtIn: exercise.builtIn,
    })
    .from(exercise)
    .orderBy(asc(exercise.name))
    .all()
    .map((found) => ({
      ...found,
      names: found.nameEs ? [found.name, found.nameEs] : [found.name],
    }));
}

// Load type and Unilateral decide how logged load and reps read, so a name alone isn't a match.
// A suffixed name still matches, so importing a file again reuses what the first import created.
// An exact name wins over one that differs only in case, accents or suffix.
function matchingExercise(pool: Known[], wanted: CustomDefinition) {
  const folded = foldCaseAndAccents(wanted.name);
  const candidates = pool.filter(
    (found) =>
      found.loadType === wanted.loadType &&
      found.unilateral === wanted.unilateral &&
      found.names.some((name) => isNameOrSuffixed(foldCaseAndAccents(name), folded)),
  );
  return exerciseNamed(candidates, wanted.name) ?? candidates[0];
}

function isNameOrSuffixed(name: string, wanted: string) {
  return (
    name === wanted || (name.startsWith(wanted) && /^ \(\d+\)$/.test(name.slice(wanted.length)))
  );
}

// The same uniqueness rule as a Custom Exercise created by hand.
function unusedName(pool: Known[], name: string) {
  for (let suffix = 1; ; suffix++) {
    const candidate = suffix === 1 ? name : `${name} (${suffix})`;
    if (!exerciseNamed(pool, candidate)) return candidate;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Mirrors the routine_exercise CHECK constraints, so a file that passes always inserts.
function asSharedRoutine(value: Record<string, unknown>): SharedRoutine | null {
  if (typeof value.name !== "string") return null;
  if (!Array.isArray(value.exercises) || !value.exercises.every(isSharedSlot)) return null;
  return value as SharedRoutine;
}

function isSharedSlot(value: unknown): value is SharedSlot {
  return (
    isRecord(value) &&
    isSharedExercise(value.exercise) &&
    isCount(value.warmups, 0) &&
    (value.sets === null || isCount(value.sets, 1)) &&
    isRange(value.repMin, value.repMax, 1) &&
    isRange(value.rirMin, value.rirMax, 0) &&
    (value.restSeconds === null || isCount(value.restSeconds, 1))
  );
}

function isSharedExercise(value: unknown): value is SharedExercise {
  if (!isRecord(value)) return false;
  if (typeof value.builtIn === "string") return true;
  const custom = value.custom;
  return (
    isRecord(custom) &&
    typeof custom.name === "string" &&
    custom.name.trim() === custom.name &&
    custom.name !== "" &&
    isOneOf(custom.equipmentType, EQUIPMENT_TYPES) &&
    isOneOf(custom.loadType, LOAD_TYPES) &&
    typeof custom.unilateral === "boolean" &&
    (custom.muscleGroup === null || isOneOf(custom.muscleGroup, MUSCLE_GROUPS))
  );
}

function isOneOf(value: unknown, allowed: readonly string[]) {
  return typeof value === "string" && allowed.includes(value);
}

function isCount(value: unknown, least: number): value is number {
  return Number.isInteger(value) && (value as number) >= least;
}

// A range is either fully planned or left blank.
function isRange(min: unknown, max: unknown, least: number) {
  if (min === null && max === null) return true;
  return isCount(min, least) && isCount(max, least) && min <= max;
}
