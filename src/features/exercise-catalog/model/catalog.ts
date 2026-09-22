import { z } from "zod";

export type ExerciseId = string & { readonly __brand: "ExerciseId" };

export const muscleGroupOrder = [
  "chest",
  "upper-back",
  "lats",
  "shoulders",
  "biceps",
  "triceps",
  "forearms",
  "quads",
  "hamstrings",
  "glutes",
  "calves",
  "adductors",
  "core",
  "lower-back",
] as const;

export type MuscleGroup = (typeof muscleGroupOrder)[number];

export const exerciseIdSchema = z
  .string()
  .regex(/^[0-9a-f]{32}$/)
  .transform((value) => value as ExerciseId);
export const muscleGroupSchema = z.enum(muscleGroupOrder);

export type CatalogExercise = Readonly<{
  id: ExerciseId;
  displayName: string;
  muscleGroup: MuscleGroup;
  origin: "builtin" | "custom";
  isAvailable: boolean;
}>;

export const catalogExerciseSchema = z.object({
  id: exerciseIdSchema,
  displayName: z.string(),
  muscleGroup: muscleGroupSchema,
  origin: z.enum(["builtin", "custom"]),
  isAvailable: z.boolean(),
});

export type CatalogMutationFailure =
  | "invalid-input"
  | "duplicate-name"
  | "not-found"
  | "immutable-builtin"
  | "persistence-error";

export type CatalogMutationResult<T> =
  | Readonly<{ ok: true; value: T }>
  | Readonly<{ ok: false; reason: CatalogMutationFailure }>;
