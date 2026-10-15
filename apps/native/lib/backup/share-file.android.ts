import { shareAsync } from "expo-sharing";

// Android's chooser never says whether a target took the file, so closing it counts as shared.
export async function shareFile(uri: string) {
  await shareAsync(uri, { mimeType: "application/octet-stream" });
  return true;
}
