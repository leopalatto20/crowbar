import { eq } from "drizzle-orm";

import type { Database } from "./database";
import { SETTINGS_ID, rest, settings } from "./schema";

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

type SettingsChange = Partial<
  Pick<Settings, "effortScale" | "defaultWeightUnit" | "restTimerEnabled" | "defaultRestSeconds">
>;

export function markNotificationsAsked(db: Database) {
  db.update(settings).set({ notificationsAsked: true }).where(eq(settings.id, SETTINGS_ID)).run();
}

export function markExported(db: Database, at: number) {
  db.update(settings).set({ lastExportedAt: at }).where(eq(settings.id, SETTINGS_ID)).run();
}

// Turning the Rest timer off ends the Rest running, so no card is left counting.
export function updateSettings(db: Database, change: SettingsChange) {
  db.transaction((tx) => {
    tx.update(settings).set(change).where(eq(settings.id, SETTINGS_ID)).run();
    if (change.restTimerEnabled === false) tx.delete(rest).run();
  });
}
