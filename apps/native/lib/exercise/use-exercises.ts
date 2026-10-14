import { useSuspenseQuery } from "@tanstack/react-query";

import { useDb } from "@/db/context";
import { listExercises } from "@/db/exercises";
import { dbQuery } from "@/db/query";
import { exercise } from "@/db/schema";
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
