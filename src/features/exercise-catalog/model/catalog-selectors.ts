import { builtinExercises } from "../data/builtin-exercises";
import type { PersistedCustomExercise } from "../data/exercise-catalog-repository";
import { muscleGroupOrder, type CatalogExercise, type ExerciseId, type MuscleGroup } from "./catalog";

export type CatalogTranslator = (key: string) => string;

export type CatalogLanguage = "en" | "es";

export type CatalogAvailability = "available" | "unavailable";

export type CatalogListCriteria = Readonly<{
  availability: CatalogAvailability;
  query?: string;
  muscleGroup?: MuscleGroup | null;
  language?: string;
}>;

export type CatalogExerciseGroup = Readonly<{
  muscleGroup: MuscleGroup;
  exercises: readonly CatalogExercise[];
}>;

export function composeCatalogExercises(
  customExercises: readonly PersistedCustomExercise[],
  hiddenBuiltinIds: readonly ExerciseId[],
  translate: CatalogTranslator,
): readonly CatalogExercise[] {
  const hiddenIds = new Set(hiddenBuiltinIds);

  return [
    ...builtinExercises.map(
      (exercise): CatalogExercise => ({
        id: exercise.id,
        displayName: translate(exercise.translationKey),
        muscleGroup: exercise.muscleGroup,
        origin: "builtin",
        isAvailable: !hiddenIds.has(exercise.id),
      }),
    ),
    ...customExercises.map(
      (exercise): CatalogExercise => ({
        id: exercise.id,
        displayName: exercise.displayName,
        muscleGroup: exercise.muscleGroup,
        origin: "custom",
        isAvailable: exercise.isAvailable,
      }),
    ),
  ];
}

export function resolveCatalogExercise(
  exercises: readonly CatalogExercise[],
  id: ExerciseId,
): CatalogExercise | null {
  return exercises.find((exercise) => exercise.id === id) ?? null;
}

export function listCatalogExercises(
  exercises: readonly CatalogExercise[],
  { availability, query = "", muscleGroup = null, language }: CatalogListCriteria,
): readonly CatalogExercise[] {
  const normalizedQuery = normalizeSearchText(query);
  const isAvailable = availability === "available";
  const matchingExercises = sortCatalogExercises(
    exercises.filter(
      (exercise) =>
        exercise.isAvailable === isAvailable &&
        (muscleGroup === null || exercise.muscleGroup === muscleGroup) &&
        normalizeSearchText(exercise.displayName).includes(normalizedQuery),
    ),
    language,
  );

  return muscleGroupOrder.flatMap((currentMuscleGroup) =>
    matchingExercises.filter((exercise) => exercise.muscleGroup === currentMuscleGroup),
  );
}

export function groupCatalogExercises(
  exercises: readonly CatalogExercise[],
): readonly CatalogExerciseGroup[] {
  return muscleGroupOrder.flatMap((muscleGroup) => {
    const groupExercises = exercises.filter((exercise) => exercise.muscleGroup === muscleGroup);

    return groupExercises.length === 0 ? [] : [{ muscleGroup, exercises: groupExercises }];
  });
}

export function sortCatalogExercises(
  exercises: readonly CatalogExercise[],
  language?: string,
): readonly CatalogExercise[] {
  const collator = new Intl.Collator(normalizeCatalogLanguage(language), {
    sensitivity: "base",
    usage: "sort",
  });

  return [...exercises].sort((first, second) => {
    const localizedNameComparison = collator.compare(first.displayName, second.displayName);
    if (localizedNameComparison !== 0) {
      return localizedNameComparison;
    }

    const exactNameComparison = compareStrings(first.displayName, second.displayName);
    if (exactNameComparison !== 0) {
      return exactNameComparison;
    }

    const originComparison = compareStrings(first.origin, second.origin);
    if (originComparison !== 0) {
      return originComparison;
    }

    return compareStrings(first.id, second.id);
  });
}

export function normalizeCatalogLanguage(language?: string): CatalogLanguage {
  const languageCode = language?.split(/[-_]/)[0]?.toLowerCase();

  return languageCode === "es" ? "es" : "en";
}

export function normalizeSearchText(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("en-US");
}

function compareStrings(first: string, second: string): number {
  if (first === second) {
    return 0;
  }

  return first < second ? -1 : 1;
}
