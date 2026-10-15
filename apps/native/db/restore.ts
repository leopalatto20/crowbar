import { writeBackup } from "./backups";
import type { Database } from "./database";
import { getSettings, setUndoRestore } from "./settings";

export const DATABASE_FILE = "crowbar.db";
export const PRE_MIGRATION_FILE = "crowbar-pre-migration.db";
// A picked Backup, copied beside the database so moving it in is a rename.
export const STAGED_BACKUP_FILE = "crowbar-restore.db";
// The data a restore replaces, kept while the restored data opens and then for Undo restore.
const REPLACED_FILE = "crowbar-replaced.db";
const UNDO_RESTORE_FILE = "crowbar-undo-restore.db";

// The database file and the files beside it, named relative to its folder.
export type DatabaseHost = {
  // A plain path SQLite can open.
  path: (file: string) => string;
  exists: (file: string) => boolean;
  remove: (file: string) => void;
  // Replaces `to` when it exists.
  move: (from: string, to: string) => Promise<void>;
  close: () => Promise<void>;
  // Opens the database file through startup: pragmas, migrations behind a snapshot, seeding.
  // Leaves nothing open when it fails.
  open: () => Promise<Database>;
};

export type RestoreOutcome = "restored" | "failed";

// Replaces the database with the staged Backup, which reopens through startup so an older one
// migrates forward. The replaced data becomes the undo only once the Backup has opened; a Backup
// that fails to open puts it straight back, so the data and any earlier undo stay as they were.
export async function restoreBackup(
  db: Database,
  host: DatabaseHost,
  replacedAt: number,
): Promise<RestoreOutcome> {
  if (!host.exists(STAGED_BACKUP_FILE)) return "failed";
  // Left by a restore the app was killed during. VACUUM INTO refuses to overwrite a file.
  if (host.exists(REPLACED_FILE)) host.remove(REPLACED_FILE);
  writeBackup(db, host.path(REPLACED_FILE));
  await host.close();
  await replaceDatabaseFile(host, STAGED_BACKUP_FILE);
  let restored: Database;
  try {
    restored = await host.open();
  } catch {
    // The snapshot a failed migration keeps holds the Backup, not the lifter's data.
    if (host.exists(PRE_MIGRATION_FILE)) host.remove(PRE_MIGRATION_FILE);
    await replaceDatabaseFile(host, REPLACED_FILE);
    await host.open();
    return "failed";
  }
  await host.move(REPLACED_FILE, UNDO_RESTORE_FILE);
  setUndoRestore(restored, { path: UNDO_RESTORE_FILE, replacedAt });
  return "restored";
}

// The undone data carries the undo record it had before the restore, which points at the file
// just used, so it's cleared. Should the replaced data have gone missing, there's nothing left to
// undo, so the record is cleared too.
export async function undoRestore(db: Database, host: DatabaseHost): Promise<RestoreOutcome> {
  const { undoRestorePath } = getSettings(db);
  if (!undoRestorePath || !host.exists(undoRestorePath)) {
    setUndoRestore(db, null);
    return "failed";
  }
  await host.close();
  await replaceDatabaseFile(host, undoRestorePath);
  setUndoRestore(await host.open(), null);
  return "restored";
}

// A WAL left beside the database would be replayed into the new file, so it goes first.
async function replaceDatabaseFile(host: DatabaseHost, from: string) {
  for (const sidecar of [`${DATABASE_FILE}-wal`, `${DATABASE_FILE}-shm`]) {
    if (host.exists(sidecar)) host.remove(sidecar);
  }
  await host.move(from, DATABASE_FILE);
}
