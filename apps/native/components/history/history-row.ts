import type { HistoryWorkout } from "@/db/workouts";
import type { I18n } from "@/lib/i18n";
import { workoutTitle } from "@/lib/workout/model";

// The date reads in the Workout's own time zone, so travelling never moves a Workout's day.
export function historyRow(workout: HistoryWorkout, i18n: I18n) {
  const { t, formatDate } = i18n;
  return {
    title: workoutTitle(workout.routineName, i18n),
    subtitle: [
      formatDate(workout.startedAt, workout.timeZone),
      workout.gymName,
      t.history.exercises(workout.exerciseCount),
    ].join(" · "),
  };
}
