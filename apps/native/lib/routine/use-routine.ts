import { useState } from "react";

import { type RoutineExercise, type RoutineExercisePatch, applyPatch } from "./model";
import { SAMPLE_ROUTINE_NAME, sampleRoutineExercises } from "./sample-routine";

export function useRoutine() {
  const [name, setName] = useState(SAMPLE_ROUTINE_NAME);
  const [exercises, setExercises] = useState<RoutineExercise[]>(sampleRoutineExercises);

  return {
    name,
    setName,
    exercises,
    add(entry: RoutineExercise) {
      setExercises((all) => [...all, entry]);
    },
    update(id: string, patch: RoutineExercisePatch) {
      setExercises((all) => all.map((e) => (e.id === id ? applyPatch(e, patch) : e)));
    },
    remove(id: string) {
      setExercises((all) => all.filter((e) => e.id !== id));
    },
    reorder(ids: string[]) {
      setExercises((all) => ids.map((id) => all.find((e) => e.id === id)).filter((e) => !!e));
    },
  };
}

export type Routine = ReturnType<typeof useRoutine>;
