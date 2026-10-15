import { sql } from "drizzle-orm";

import type { Database } from "./database";

// VACUUM INTO reads one consistent snapshot through this connection, WAL included, so a Backup
// taken mid-Workout holds every committed set without pausing the Workout.
export function writeBackup(db: Database, path: string) {
  db.run(sql`VACUUM INTO ${path}`);
}

// The lifter's own calendar day, so a Backup exported late at night isn't dated by UTC's tomorrow.
export function backupFileName(now: Date) {
  const day = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
  return `Crowbar backup ${day}.crowbar`;
}
