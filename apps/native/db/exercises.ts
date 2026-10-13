import { eq } from "drizzle-orm";

import type { Language } from "@/lib/i18n/locale";

import type { BuiltInExercise } from "./built-in-exercises";
import type { Database } from "./database";
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

export type ExerciseListing = Pick<typeof exercise.$inferSelect, "id" | "name" | "muscleGroup">;

export function listExercises(db: Database, language: Language): ExerciseListing[] {
  const collator = new Intl.Collator(language);
  return db
    .select({
      id: exercise.id,
      name: exercise.name,
      nameEs: exercise.nameEs,
      muscleGroup: exercise.muscleGroup,
    })
    .from(exercise)
    .where(eq(exercise.hidden, false))
    .all()
    .map(({ id, name, nameEs, muscleGroup }) => ({
      id,
      name: language === "es" ? (nameEs ?? name) : name,
      muscleGroup,
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
  return exercises.filter((listing) => foldCaseAndAccents(listing.name).includes(folded));
}
