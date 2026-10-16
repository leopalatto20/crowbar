import type { Rest } from "@/db/rests";

const REST_LINK_PREFIX = "crowbar://rest?workoutExerciseId=";

// Opened by tapping the Live Activity. Its own path rather than the Ledger's, so the tabs open the
// Ledger the same way as for the notification instead of Expo Router stacking a second one.
export function restLink(workoutExerciseId: string) {
  return REST_LINK_PREFIX + encodeURIComponent(workoutExerciseId);
}

// Parsed by hand: React Native's URL leaves searchParams unimplemented.
export function restWorkoutExerciseOfLink(url: string | null) {
  if (!url?.startsWith(REST_LINK_PREFIX)) return null;
  return decodeURIComponent(url.slice(REST_LINK_PREFIX.length));
}

// An activity's link is fixed at start, so only a Rest on the Exercise already shown can update
// it; any other is started over. Nothing ends it at zero while the app is suspended, so it sits at
// 0:00 until the app runs again.
export function restActivityStep(
  shownFor: string | null,
  rest: Pick<Rest, "workoutExerciseId" | "endsAt"> | null,
  now: number,
) {
  if (!rest || now >= rest.endsAt) return "end";
  return shownFor === rest.workoutExerciseId ? "update" : "start";
}
