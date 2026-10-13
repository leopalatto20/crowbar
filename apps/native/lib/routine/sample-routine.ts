import { libraryExercise } from "@/lib/exercise/sample-library";

import { type RoutineExercise, makeRoutineExerciseId } from "./model";

// Stands in for the persisted Routine until the data layer exists.
export const SAMPLE_ROUTINE_NAME = "Upper A";

export function sampleRoutineExercises(): RoutineExercise[] {
  return [
    {
      id: makeRoutineExerciseId(),
      exercise: libraryExercise("bench"),
      warmups: 2,
      target: { sets: 3, repMin: 5, repMax: 7, rirMin: 1, rirMax: 2 },
      restSeconds: 180,
    },
    {
      id: makeRoutineExerciseId(),
      exercise: libraryExercise("chest-press"),
      warmups: 0,
      target: { sets: 3, repMin: 8, repMax: 10, rirMin: 1, rirMax: 1 },
      restSeconds: 150,
    },
    {
      id: makeRoutineExerciseId(),
      exercise: libraryExercise("cable-row"),
      warmups: 0,
      target: { sets: 3, repMin: 10, repMax: 12, rirMin: 1, rirMax: 2 },
      restSeconds: 120,
    },
    {
      id: makeRoutineExerciseId(),
      exercise: libraryExercise("lateral-raise"),
      warmups: 0,
      target: { sets: 3, repMin: 12, repMax: 15, rirMin: 0, rirMax: 1 },
      restSeconds: 90,
    },
  ];
}
