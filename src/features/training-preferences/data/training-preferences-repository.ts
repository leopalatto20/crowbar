import type { SQLiteDatabase } from "expo-sqlite";
import { z } from "zod";

import type { EffortMetric } from "../model/effort";

export type TrainingPreferencesRepository = {
  read: () => Promise<EffortMetric | null>;
  save: (metric: EffortMetric) => Promise<void>;
};

const persistedPreferenceSchema = z.object({
  singleton_id: z.literal(1),
  effort_metric: z.enum(["rpe", "rir"]),
});

const readPreferenceSql = `
  SELECT singleton_id, effort_metric
  FROM training_preferences
  WHERE singleton_id = 1
`;

const savePreferenceSql = `
  INSERT INTO training_preferences (singleton_id, effort_metric)
  VALUES (1, ?)
  ON CONFLICT(singleton_id)
  DO UPDATE SET effort_metric = excluded.effort_metric
`;

export function createTrainingPreferencesRepository(
  database: Pick<SQLiteDatabase, "getFirstAsync" | "runAsync">,
): TrainingPreferencesRepository {
  return {
    async read(): Promise<EffortMetric | null> {
      const row = await database.getFirstAsync<unknown>(readPreferenceSql);
      const parsedRow = persistedPreferenceSchema.safeParse(row);

      return parsedRow.success ? parsedRow.data.effort_metric : null;
    },

    async save(metric: EffortMetric): Promise<void> {
      await database.runAsync(savePreferenceSql, metric);
    },
  };
}
