import { Directory, File, Paths } from "expo-file-system";

import { shareFile } from "@/lib/backup/share-file";

const SHARED_ROUTINE_EXTENSION = "crowbar-routine";

// Clearing the folder first drops files shared earlier. The name is the Routine's, minus the
// characters a file name can't hold.
export async function shareRoutineFile(name: string, content: string) {
  const folder = new Directory(Paths.cache, "shared-routines");
  if (folder.exists) folder.delete();
  folder.create();
  const file = new File(folder, `${name.replace(/[/\\:]/g, "-")}.${SHARED_ROUTINE_EXTENSION}`);
  file.write(content);
  await shareFile(file.uri);
}
