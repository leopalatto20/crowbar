import { File } from "expo-file-system";

import { BACKUP_HEADER_BYTES, type BackupInspection, inspectBackup } from "@/db/backups";
import type { Database } from "@/db/database";
import { STAGED_BACKUP_FILE } from "@/db/restore";

function stagedBackup(folder: string) {
  const path = `${folder}/${STAGED_BACKUP_FILE}`;
  return { path, file: new File(`file://${path}`) };
}

// Copies the picked file beside the database, where restoring moves it in, and validates the
// copy. A file that isn't a valid Backup is discarded. Resolves to null when the picker is
// dismissed.
export async function pickBackup(db: Database, folder: string): Promise<BackupInspection | null> {
  const picked = await File.pickFileAsync();
  if (picked.canceled) return null;
  const staged = stagedBackup(folder);
  await picked.result.copy(staged.file, { overwrite: true });
  const handle = staged.file.open();
  let header: Uint8Array;
  try {
    header = handle.readBytes(BACKUP_HEADER_BYTES);
  } finally {
    handle.close();
  }
  const inspection = inspectBackup(db, staged.path, header);
  if (!inspection.valid) staged.file.delete();
  return inspection;
}

export function discardPickedBackup(folder: string) {
  const { file } = stagedBackup(folder);
  if (file.exists) file.delete();
}
