export const EQUIPMENT_TYPES = [
  "barbell",
  "dumbbell",
  "machine",
  "cable",
  "smithMachine",
  "ezBar",
  "trapBar",
  "kettlebell",
  "band",
  "bodyweight",
  "other",
] as const;
export type EquipmentType = (typeof EQUIPMENT_TYPES)[number];

export const LOAD_TYPES = ["external", "bodyweight", "assisted"] as const;
export type LoadType = (typeof LOAD_TYPES)[number];

// Also the order of the Exercises tab's sections.
export const MUSCLE_GROUPS = [
  "chest",
  "lats",
  "upperBack",
  "lowerBack",
  "frontDelts",
  "sideDelts",
  "rearDelts",
  "biceps",
  "triceps",
  "forearms",
  "abs",
  "quads",
  "hamstrings",
  "glutes",
  "adductors",
  "abductors",
  "calves",
  "other",
] as const;
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

// Single-select within a facet (null is Any), combined with AND across facets. Done reads
// history at the Current Gym, or at any Gym where there is none to read at.
export type ExerciseFilters = {
  equipmentType: EquipmentType | null;
  muscleGroup: MuscleGroup | null;
  done: boolean;
  custom: boolean;
};

export const NO_FILTERS: ExerciseFilters = {
  equipmentType: null,
  muscleGroup: null,
  done: false,
  custom: false,
};

export function anyFilterOn(filters: ExerciseFilters) {
  return (
    filters.equipmentType !== null || filters.muscleGroup !== null || filters.done || filters.custom
  );
}
