import type { ExpoSQLiteDatabase } from "drizzle-orm/expo-sqlite";

import { effortMetrics, loadRepresentations } from "./schema";
import * as schema from "./schema";

type AppDatabase = ExpoSQLiteDatabase<typeof schema>;

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
