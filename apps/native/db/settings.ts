import { eq } from "drizzle-orm";

import type { Database } from "./database";
import { SETTINGS_ID, settings } from "./schema";

export type Settings = typeof settings.$inferSelect;

export function seedSettings(db: Database, regionCode: string | null) {
  db.insert(settings)
    .values({ id: SETTINGS_ID, defaultWeightUnit: regionCode === "US" ? "lb" : "kg" })
    .onConflictDoNothing()
    .run();
}

export function getSettings(db: Database): Settings {
  const row = db.select().from(settings).where(eq(settings.id, SETTINGS_ID)).get();
  if (!row) throw new Error("Settings were read before the database was seeded");
  return row;
}

type SettingsChange = Partial<Pick<Settings, "effortScale" | "defaultWeightUnit">>;

export function updateSettings(db: Database, change: SettingsChange) {
  db.update(settings).set(change).where(eq(settings.id, SETTINGS_ID)).run();
}
