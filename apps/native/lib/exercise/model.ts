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
