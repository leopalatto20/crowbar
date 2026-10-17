import { useSuspenseQuery } from "@tanstack/react-query";

import { useDb } from "@/db/context";
import { exercisesDone, listExercises } from "@/db/exercises";
import type { Gym } from "@/db/gyms";
import { dbQuery } from "@/db/query";
import { exercise, station, workoutExercise, workoutSet } from "@/db/schema";
import { useI18n } from "@/lib/i18n";

// The library is read once per language and searched in memory, so typing never queries SQLite.
export function useExerciseLibrary() {
  const db = useDb();
  const { language } = useI18n();
  return useSuspenseQuery(
    dbQuery(db, {
      tables: [exercise],
      key: ["exercises", language],
      fn: (db) => listExercises(db, language),
    }),
  ).data;
}

// Where the Done filter reads history: one Gym, named in its label, or any Gym where no Gym
// applies, as in the Routine editor.
export type DoneAt = Pick<Gym, "id" | "name"> | "anyGym";

export type DoneFilter = { label: string; exerciseIds: ReadonlySet<string> };

// Null where Done is left out of the menu: no Gym to name, or, across all Gyms, no history yet.
// A named Gym keeps it even before anything is logged there, so the label still says where.
export function useDoneFilter(at: DoneAt | null): DoneFilter | null {
  const db = useDb();
  const { t } = useI18n();
  const gymId = at === null || at === "anyGym" ? undefined : at.id;
  const exerciseIds = useSuspenseQuery(
    dbQuery(db, {
      tables: [workoutSet, workoutExercise, station],
      key: ["exercisesDone", gymId ?? "anyGym"],
      fn: (db) => exercisesDone(db, gymId),
    }),
  ).data;
  if (at === null) return null;
  if (at === "anyGym")
    return exerciseIds.size > 0 ? { label: t.exerciseFilters.doneBefore, exerciseIds } : null;
  return { label: t.exerciseFilters.doneAt(at.name), exerciseIds };
}
