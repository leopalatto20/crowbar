import { useSuspenseQuery } from "@tanstack/react-query";

import { useDb } from "@/db/context";
import { dbQuery } from "@/db/query";
import { getRoutine, listRoutines } from "@/db/routines";
import { exercise, routine, routineExercise } from "@/db/schema";
import { useI18n } from "@/lib/i18n";

export function useRoutines() {
  const db = useDb();
  return useSuspenseQuery(dbQuery(db, { tables: [routine], key: ["routines"], fn: listRoutines }))
    .data;
}

// Null once the Routine is deleted, so a screen still showing it can step aside.
export function useRoutine(id: string) {
  const db = useDb();
  const { language } = useI18n();
  return useSuspenseQuery(
    dbQuery(db, {
      tables: [routine, routineExercise, exercise],
      key: ["routine", id, language],
      fn: (db) => getRoutine(db, id, language) ?? null,
    }),
  ).data;
}
