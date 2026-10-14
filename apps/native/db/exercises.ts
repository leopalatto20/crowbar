import { eq } from "drizzle-orm";

import type { EquipmentType, LoadType, MuscleGroup } from "@/lib/exercise/model";
import type { Language } from "@/lib/i18n/locale";

import type { BuiltInExercise } from "./built-in-exercises";
import type { Database } from "./database";
import { newId } from "./id";
import { exercise } from "./schema";

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
  "id" | "name" | "muscleGroup" | "hidden"
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
  const name = fields.name.trim();
  if (!name) throw new Error("A Custom Exercise needs a name");
  // Compared in JS rather than SQL: SQLite's lower() folds only ASCII, so "EXTENSIÓN" would
  // slip past "Extensión".
  const taken = exerciseNamed(listExercises(db, "en"), name);
  if (taken) throw new Error(`"${name}" is already taken by Exercise ${taken.id}`);
  const id = newId(db);
  db.insert(exercise)
    .values({ ...fields, id, name, builtIn: false })
    .run();
  return { id, name, muscleGroup: fields.muscleGroup ?? null, hidden: false, names: [name] };
}
