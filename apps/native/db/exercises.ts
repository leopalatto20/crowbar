import { eq, sql } from "drizzle-orm";

import type { Language } from "@/lib/i18n/locale";

import type { BuiltInExercise } from "./built-in-exercises";
import type { Database } from "./database";
import { exercise } from "./schema";

// One statement, so a launch never leaves the library half-seeded. Only names are refreshed: every
// other field is fixed once shipped (see BuiltInExercise), and hidden belongs to the lifter.
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
    .onConflictDoUpdate({
      target: exercise.id,
      set: { name: sql`excluded.name`, nameEs: sql`excluded.name_es` },
      // Unchanged rows aren't rewritten, so a launch that ships no new names writes nothing.
      setWhere: sql`${exercise.name} IS NOT excluded.name OR ${exercise.nameEs} IS NOT excluded.name_es`,
    })
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
function fold(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function searchExercises(exercises: ExerciseListing[], query: string) {
  const folded = fold(query.trim());
  return exercises.filter((listing) => fold(listing.name).includes(folded));
}
