import { useSuspenseQuery } from "@tanstack/react-query";

import { useDb } from "@/db/context";
import { type ProgressOpening, getExerciseProgress } from "@/db/progress";
import { dbQuery } from "@/db/query";
import { exercise, gym, station, workout, workoutExercise, workoutSet } from "@/db/schema";
import { useI18n } from "@/lib/i18n";

// Null once the Exercise is deleted, so its detail screen can step aside.
export function useExerciseProgress(exerciseId: string, at: ProgressOpening) {
  const db = useDb();
  const { language } = useI18n();
  return useSuspenseQuery(
    dbQuery(db, {
      tables: [exercise, station, gym, workout, workoutExercise, workoutSet],
      key: ["progress", exerciseId, at.stationId, at.gymId, language],
      fn: (db) => getExerciseProgress(db, exerciseId, language, at) ?? null,
    }),
  ).data;
}
