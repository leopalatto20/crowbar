import type { ExpoSQLiteDatabase } from "drizzle-orm/expo-sqlite";

import { effortMetrics } from "./schema/effort-metrics";
import { loadRepresentations } from "./schema/load-representations";

type LookupSchema = {
  effortMetrics: typeof effortMetrics;
  loadRepresentations: typeof loadRepresentations;
};
type AppDatabase = ExpoSQLiteDatabase<LookupSchema>;

const effortMetricSeeds = [{ code: "rpe" }, { code: "rir" }];

const loadRepresentationSeeds = [
  { code: "kilograms" },
  { code: "pounds" },
  { code: "plate_count" },
];

/** Insert the stable lookup values without changing existing rows. */
export function bootstrapLookupTables(db: AppDatabase): void {
  db.transaction((transaction) => {
    transaction
      .insert(effortMetrics)
      .values(effortMetricSeeds)
      .onConflictDoNothing()
      .run();

    transaction
      .insert(loadRepresentations)
      .values(loadRepresentationSeeds)
      .onConflictDoNothing()
      .run();
  });
}
