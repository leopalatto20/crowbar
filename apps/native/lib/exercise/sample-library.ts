// Stands in for the exercise library until the data layer and Custom Exercises (#13) exist.
export type ExerciseSummary = { id: string; name: string; muscleGroup: string };

export const SAMPLE_LIBRARY: ExerciseSummary[] = [
  { id: "bench", name: "Barbell Bench Press", muscleGroup: "Chest" },
  { id: "incline-db", name: "Incline Dumbbell Press", muscleGroup: "Chest" },
  { id: "chest-press", name: "Machine Chest Press", muscleGroup: "Chest" },
  { id: "cable-fly", name: "Cable Fly", muscleGroup: "Chest" },
  { id: "pull-up", name: "Pull-Up", muscleGroup: "Lats" },
  { id: "lat-pulldown", name: "Cable Lat Pulldown", muscleGroup: "Lats" },
  { id: "cable-row", name: "Seated Cable Row", muscleGroup: "Upper back" },
  { id: "cs-row", name: "Chest-Supported Dumbbell Row", muscleGroup: "Upper back" },
  { id: "lateral-raise", name: "Dumbbell Lateral Raise", muscleGroup: "Side delts" },
  { id: "cable-lateral", name: "Single-Arm Cable Lateral Raise", muscleGroup: "Side delts" },
  { id: "pec-deck", name: "Machine Reverse Pec Deck", muscleGroup: "Rear delts" },
  { id: "ez-curl", name: "EZ Bar Curl", muscleGroup: "Biceps" },
  { id: "pushdown", name: "Cable Triceps Pushdown", muscleGroup: "Triceps" },
  { id: "oh-extension", name: "Cable Overhead Triceps Extension", muscleGroup: "Triceps" },
  { id: "squat", name: "Barbell Back Squat", muscleGroup: "Quads" },
  { id: "hack-squat", name: "Machine Hack Squat", muscleGroup: "Quads" },
  { id: "rdl", name: "Barbell Romanian Deadlift", muscleGroup: "Hamstrings" },
  { id: "leg-curl", name: "Machine Seated Leg Curl", muscleGroup: "Hamstrings" },
  { id: "leg-extension", name: "Machine Leg Extension", muscleGroup: "Quads" },
  { id: "calf-raise", name: "Machine Standing Calf Raise", muscleGroup: "Calves" },
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
