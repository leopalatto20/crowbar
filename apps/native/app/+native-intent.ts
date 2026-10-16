import type { NativeIntent } from "expo-router";

import { restWorkoutExerciseOfLink } from "@/lib/workout/rest-activity";

// Expo Router would stack a second Ledger for a Rest link, so it only lands a launch on the tabs.
// The tabs open the Ledger themselves, as for the Rest notification, reusing one already open.
export const redirectSystemPath: NativeIntent["redirectSystemPath"] = ({ path, initial }) => {
  if (restWorkoutExerciseOfLink(path) === null) return path;
  return initial ? "/" : null;
};
