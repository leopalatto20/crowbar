import type { MuscleGroup } from "@/lib/i18n/en";

// Stands in for the exercise library until the data layer and Custom Exercises (#13) exist.
export type ExerciseSummary = { id: string; name: string; muscleGroup: MuscleGroup | null };

export const SAMPLE_LIBRARY: ExerciseSummary[] = [
  { id: "bench", name: "Barbell Bench Press", muscleGroup: "chest" },
  { id: "incline-db", name: "Incline Dumbbell Press", muscleGroup: "chest" },
  { id: "chest-press", name: "Machine Chest Press", muscleGroup: "chest" },
  { id: "cable-fly", name: "Cable Fly", muscleGroup: "chest" },
  { id: "pull-up", name: "Pull-Up", muscleGroup: "lats" },
  { id: "lat-pulldown", name: "Cable Lat Pulldown", muscleGroup: "lats" },
  { id: "cable-row", name: "Seated Cable Row", muscleGroup: "upperBack" },
  { id: "cs-row", name: "Chest-Supported Dumbbell Row", muscleGroup: "upperBack" },
  { id: "lateral-raise", name: "Dumbbell Lateral Raise", muscleGroup: "sideDelts" },
  { id: "cable-lateral", name: "Single-Arm Cable Lateral Raise", muscleGroup: "sideDelts" },
  { id: "pec-deck", name: "Machine Reverse Pec Deck", muscleGroup: "rearDelts" },
  { id: "ez-curl", name: "EZ Bar Curl", muscleGroup: "biceps" },
  { id: "pushdown", name: "Cable Triceps Pushdown", muscleGroup: "triceps" },
  { id: "oh-extension", name: "Cable Overhead Triceps Extension", muscleGroup: "triceps" },
  { id: "squat", name: "Barbell Back Squat", muscleGroup: "quads" },
  { id: "hack-squat", name: "Machine Hack Squat", muscleGroup: "quads" },
  { id: "rdl", name: "Barbell Romanian Deadlift", muscleGroup: "hamstrings" },
  { id: "leg-curl", name: "Machine Seated Leg Curl", muscleGroup: "hamstrings" },
  { id: "leg-extension", name: "Machine Leg Extension", muscleGroup: "quads" },
  { id: "calf-raise", name: "Machine Standing Calf Raise", muscleGroup: "calves" },
];

let nextId = 0;
export function makeExerciseId() {
  nextId += 1;
  return `custom-${nextId}`;
}

export function libraryExercise(id: string) {
  const exercise = SAMPLE_LIBRARY.find((ex) => ex.id === id);
  if (!exercise) throw new Error(`Unknown exercise ${id}`);
  return exercise;
}
