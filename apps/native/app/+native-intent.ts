import type { NativeIntent } from "expo-router";

import { restWorkoutExerciseOfLink } from "@/lib/workout/rest-activity";

// Opening a file in Crowbar hands over its URL. Only Shared Routines are registered, but the
// preview checks the content anyway: Android's content URLs carry no file extension.
const OPENED_FILE = /^(file|content):\/\//;

// Expo Router would stack a second Ledger for a Rest link, so it only lands a launch on the tabs.
// The tabs open the Ledger themselves, as for the Rest notification, reusing one already open.
export const redirectSystemPath: NativeIntent["redirectSystemPath"] = ({ path, initial }) => {
  if (OPENED_FILE.test(path)) return `/import-routine?file=${encodeURIComponent(path)}`;
  if (restWorkoutExerciseOfLink(path) === null) return path;
  return initial ? "/" : null;
};
