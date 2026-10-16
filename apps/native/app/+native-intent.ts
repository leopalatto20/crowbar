import type { NativeIntent } from "expo-router";

import { restWorkoutExerciseOfLink } from "@/lib/workout/rest-activity";

// A Rest link is opened by the tabs, like the Rest notification, which reuse a Ledger already on
// the stack. Expo Router is kept out of it: a launch lands on the tabs, and a warm one stays put.
export const redirectSystemPath: NativeIntent["redirectSystemPath"] = ({ path, initial }) => {
  if (restWorkoutExerciseOfLink(path) === null) return path;
  return initial ? "/" : null;
};
