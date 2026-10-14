import type { ExerciseListing } from "@/db/exercises";
import type { I18n } from "@/lib/i18n";
import type { Target } from "@/lib/workout/model";

export type RoutineExercise = {
  id: string;
  exercise: Pick<ExerciseListing, "id" | "name">;
  warmups: number;
  target: Target;
  restSeconds: number;
};

export type RoutineExercisePatch = Partial<Pick<RoutineExercise, "warmups" | "restSeconds">> &
  Partial<Target>;

export type Range = [number, number];

export const WARMUP_PRESETS = [0, 1, 2, 3, 4];
export const SET_PRESETS = [1, 2, 3, 4, 5, 6];
export const REP_PRESETS: Range[] = [
  [3, 5],
  [4, 6],
  [5, 7],
  [6, 8],
  [8, 10],
  [8, 12],
  [10, 12],
  [12, 15],
  [15, 20],
  [20, 30],
];
export const RIR_PRESETS: Range[] = [
  [0, 0],
  [0, 1],
  [1, 1],
  [1, 2],
  [2, 3],
  [3, 4],
];
export const REST_PRESETS = [45, 60, 90, 120, 150, 180, 240, 300];

let nextId = 0;
export function makeRoutineExerciseId() {
  nextId += 1;
  return `routine-exercise-${nextId}`;
}

export function newRoutineExercise(exercise: RoutineExercise["exercise"]): RoutineExercise {
  return {
    id: makeRoutineExerciseId(),
    exercise,
    warmups: 0,
    target: { sets: 3, repMin: 8, repMax: 12, rirMin: 1, rirMax: 2 },
    restSeconds: 120,
  };
}

export function applyPatch(entry: RoutineExercise, patch: RoutineExercisePatch): RoutineExercise {
  const { warmups = entry.warmups, restSeconds = entry.restSeconds, ...target } = patch;
  return { ...entry, warmups, restSeconds, target: { ...entry.target, ...target } };
}

export function formatWarmups(warmups: number, i18n: I18n) {
  return warmups === 0 ? i18n.t.routine.noWarmup : i18n.t.routine.warmups(warmups);
}
