import { Directory, File, Paths } from "expo-file-system";

import { backupFileName, writeBackup } from "@/db/backups";
import type { Database } from "@/db/database";
import { markExported } from "@/db/settings";

import { shareFile } from "./share-file";

// Clearing the folder first drops earlier exports, and lets today's be written again: VACUUM INTO
// refuses to overwrite a file.
export async function exportBackup(db: Database) {
  const folder = new Directory(Paths.cache, "backups");
  if (folder.exists) folder.delete();
  folder.create();
  const file = new File(folder, backupFileName(new Date()));
  // SQLite takes a plain path, where the file's URI percent-encodes the spaces in its name.
  writeBackup(db, decodeURIComponent(file.uri.replace(/^file:\/\//, "")));
  if (await shareFile(file.uri)) markExported(db, Date.now());
}
