import { and, count, countDistinct, eq, exists, isNotNull } from "drizzle-orm";

import type { EquipmentType, LoadType, MuscleGroup } from "@/lib/exercise/model";
import type { Language } from "@/lib/i18n/locale";

import type { BuiltInExercise } from "./built-in-exercises";
import type { Database } from "./database";
import { newId } from "./id";
import { exercise, station, workout, workoutExercise, workoutSet } from "./schema";
import { deleteWorkoutsLeftEmpty } from "./workouts";

// Insert-only: a shipped Built-in Exercise never changes, and its hidden flag belongs to the lifter.
export function seedBuiltInExercises(db: Database, builtIns: readonly BuiltInExercise[]) {
  db.insert(exercise)
    .values(
      builtIns.map(({ name, ...rest }) => ({
        ...rest,
        name: name.en,
        nameEs: name.es,
        builtIn: true,
      })),
    )
    .onConflictDoNothing()
    .run();
}

export type ExerciseListing = Pick<
  typeof exercise.$inferSelect,
  "id" | "name" | "muscleGroup" | "hidden" | "builtIn"
> & {
  // Every name the Exercise has in any language, which is what names are unique across.
  names: string[];
};

export function listExercises(db: Database, language: Language): ExerciseListing[] {
  const collator = new Intl.Collator(language);
  return db
    .select({
      id: exercise.id,
      name: exercise.name,
      nameEs: exercise.nameEs,
      muscleGroup: exercise.muscleGroup,
      hidden: exercise.hidden,
      builtIn: exercise.builtIn,
    })
    .from(exercise)
    .all()
    .map(({ nameEs, ...listing }) => ({
      ...listing,
      name: language === "es" ? (nameEs ?? listing.name) : listing.name,
      names: nameEs ? [listing.name, nameEs] : [listing.name],
    }))
    .sort((a, b) => collator.compare(a.name, b.name));
}

// Lifters rarely type accents mid-Workout, so "extension" has to find "Extensión".
function foldCaseAndAccents(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function searchExercises(exercises: ExerciseListing[], query: string) {
  const folded = foldCaseAndAccents(query.trim());
  return exercises.filter(
    (listing) => !listing.hidden && foldCaseAndAccents(listing.name).includes(folded),
  );
}

// Unlike search, an exact match keeps accents and finds Hidden Exercises and names in other
// languages: it decides whether a name is free for a new Exercise.
export function exerciseNamed(exercises: ExerciseListing[], name: string) {
  const wanted = name.trim().toLowerCase();
  return exercises.find((listing) => listing.names.some((taken) => taken.toLowerCase() === wanted));
}

// Any Exercise can be hidden. Routines still run it and its history stays: only the picker and
// search leave it out.
export function hideExercise(db: Database, id: string) {
  db.update(exercise).set({ hidden: true }).where(eq(exercise.id, id)).run();
}

export function unhideExercise(db: Database, id: string) {
  db.update(exercise).set({ hidden: false }).where(eq(exercise.id, id)).run();
}

export type NewCustomExercise = {
  name: string;
  equipmentType?: EquipmentType;
  loadType?: LoadType;
  unilateral?: boolean;
  muscleGroup?: MuscleGroup | null;
};

// Names are unique case-insensitively across every name an Exercise has, hidden ones included,
// so no language ever shows two Exercises under one name.
export function createCustomExercise(db: Database, fields: NewCustomExercise): ExerciseListing {
  const name = availableName(db, fields.name);
  const id = newId(db);
  db.insert(exercise)
    .values({ ...fields, id, name, builtIn: false })
    .run();
  return {
    id,
    name,
    muscleGroup: fields.muscleGroup ?? null,
    hidden: false,
    builtIn: false,
    names: [name],
  };
}

// An Exercise being renamed may keep its own name in another case.
function availableName(db: Database, typed: string, renamedId?: string) {
  const name = typed.trim();
  if (!name) throw new Error("A Custom Exercise needs a name");
  // Compared in JS rather than SQL: SQLite's lower() folds only ASCII, so "EXTENSIÓN" would
  // slip past "Extensión".
  const others = listExercises(db, "en").filter((listing) => listing.id !== renamedId);
  const taken = exerciseNamed(others, name);
  if (taken) throw new Error(`"${name}" is already taken by Exercise ${taken.id}`);
  return name;
}

export type CustomExerciseFields = Required<NewCustomExercise>;

// Once any set is logged, the fields that say how its sets read are locked, so history is never
// reinterpreted.
const LOCKED_FIELDS = ["equipmentType", "loadType", "unilateral"] as const;

export type CustomExercise = CustomExerciseFields & { id: string; locked: boolean };

// Only confirmed sets are history: an unconfirmed one in the Workout in progress is not.
function loggedSetsOf(db: Database, id: string | typeof exercise.id) {
  return db
    .select({ id: workoutSet.id, workoutId: workoutExercise.workoutId })
    .from(workoutSet)
    .innerJoin(workoutExercise, eq(workoutExercise.id, workoutSet.workoutExerciseId))
    .where(and(eq(workoutExercise.exerciseId, id), eq(workoutSet.done, true)));
}

export function getCustomExercise(db: Database, id: string): CustomExercise | undefined {
  return db
    .select({
      id: exercise.id,
      name: exercise.name,
      equipmentType: exercise.equipmentType,
      loadType: exercise.loadType,
      unilateral: exercise.unilateral,
      muscleGroup: exercise.muscleGroup,
      locked: exists(loggedSetsOf(db, exercise.id)).mapWith(Boolean),
    })
    .from(exercise)
    .where(and(eq(exercise.id, id), eq(exercise.builtIn, false)))
    .get();
}

export function editCustomExercise(
  db: Database,
  id: string,
  change: Partial<CustomExerciseFields>,
) {
  const current = findCustomExercise(db, id);
  if (current.locked) {
    const changed = LOCKED_FIELDS.find(
      (field) => change[field] !== undefined && change[field] !== current[field],
    );
    if (changed) throw new Error(`${changed} of Exercise ${id} is locked by its logged sets`);
  }
  const name = change.name === undefined ? undefined : availableName(db, change.name, id);
  db.update(exercise)
    .set({ ...change, name })
    .where(eq(exercise.id, id))
    .run();
}

export type ExerciseHistoryCounts = { stations: number; workouts: number; sets: number };

// What deleting the Exercise takes with it: its Stations, its logged sets and the Workouts they
// were logged in.
export function exerciseHistoryCounts(db: Database, id: string): ExerciseHistoryCounts {
  const [stations] = db
    .select({ count: count() })
    .from(station)
    .where(eq(station.exerciseId, id))
    .all();
  const logged = loggedSetsOf(db, id).as("logged");
  const [sets] = db
    .select({ count: count(), workouts: countDistinct(logged.workoutId) })
    .from(logged)
    .all();
  return { stations: stations!.count, workouts: sets!.workouts, sets: sets!.count };
}

// Its Routine slots, Stations and sets cascade from the Exercise in the schema. A finished
// Workout left with no logged set goes too; the Workout in progress stays, since finishing drops
// it if nothing else gets logged.
export function deleteCustomExercise(db: Database, id: string) {
  db.transaction((tx) => {
    findCustomExercise(tx, id);
    const finishedIds = tx
      .selectDistinct({ id: workout.id })
      .from(workout)
      .innerJoin(workoutExercise, eq(workoutExercise.workoutId, workout.id))
      .where(and(eq(workoutExercise.exerciseId, id), isNotNull(workout.finishedAt)))
      .all()
      .map((found) => found.id);
    tx.delete(exercise).where(eq(exercise.id, id)).run();
    deleteWorkoutsLeftEmpty(tx, finishedIds);
  });
}

function findCustomExercise(db: Database, id: string) {
  const found = getCustomExercise(db, id);
  if (!found)
    throw new Error(
      `Exercise ${id} isn't a Custom Exercise; Built-in Exercises can only be hidden`,
    );
  return found;
}
