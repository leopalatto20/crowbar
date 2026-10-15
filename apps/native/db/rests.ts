import { eq, lte } from "drizzle-orm";

import type { Database } from "./database";
import { REST_ID, rest, workout, workoutExercise, workoutSet } from "./schema";
import { getSettings } from "./settings";

export type Rest = { setId: string; workoutExerciseId: string; startedAt: number; endsAt: number };

export function getRest(db: Database): Rest | null {
  return (
    db
      .select({
        setId: rest.setId,
        workoutExerciseId: workoutSet.workoutExerciseId,
        startedAt: rest.startedAt,
        endsAt: rest.endsAt,
      })
      .from(rest)
      .innerJoin(workoutSet, eq(workoutSet.id, rest.setId))
      .get() ?? null
  );
}

export type RestClock =
  | { over: false; remaining: number; progress: number }
  | { over: true; overtime: number };

// Everything shown is read off the stored end against the clock, never counted in memory, so a
// Rest reads right after a kill or a stretch in the background.
export function restClock(
  { startedAt, endsAt }: Pick<Rest, "startedAt" | "endsAt">,
  now: number,
): RestClock {
  if (now >= endsAt) return { over: true, overtime: (now - endsAt) / 1000 };
  return {
    over: false,
    remaining: (endsAt - now) / 1000,
    progress: (now - startedAt) / (endsAt - startedAt),
  };
}

// For a set just confirmed. Only a Working set in the Workout in progress rests: warm-ups flow
// straight into the next set, and a correction to a finished Workout is never trained. Replaces
// any Rest already running, as only one runs at a time. A warm-up still counts as the next confirm
// that overtime waits for, so it ends a Rest that's over.
export function startRest(db: Database, setId: string, now: number) {
  const { restTimerEnabled, defaultRestSeconds } = getSettings(db);
  const confirmed = db
    .select({
      kind: workoutSet.kind,
      restSeconds: workoutExercise.restSeconds,
      finishedAt: workout.finishedAt,
    })
    .from(workoutSet)
    .innerJoin(workoutExercise, eq(workoutExercise.id, workoutSet.workoutExerciseId))
    .innerJoin(workout, eq(workout.id, workoutExercise.workoutId))
    .where(eq(workoutSet.id, setId))
    .get();
  if (!confirmed) throw new Error(`Set ${setId} doesn't exist`);
  if (confirmed.finishedAt !== null) return;
  if (confirmed.kind === "warmup") {
    db.delete(rest).where(lte(rest.endsAt, now)).run();
    return;
  }
  if (!restTimerEnabled) return;
  const seconds = confirmed.restSeconds ?? defaultRestSeconds;
  const values = { id: REST_ID, setId, startedAt: now, endsAt: now + seconds * 1000 };
  db.insert(rest).values(values).onConflictDoUpdate({ target: rest.id, set: values }).run();
}

// -15 / +15 on the card: one-off, never written back to the rest Target. Shortening a Rest past
// now ends it now rather than in the past, so it reaches zero instead of skipping into overtime.
export function adjustRest(db: Database, seconds: number, now = Date.now()) {
  db.transaction((tx) => {
    const running = tx.select({ endsAt: rest.endsAt }).from(rest).get();
    if (!running) return;
    tx.update(rest)
      .set({ endsAt: Math.max(now, running.endsAt + seconds * 1000) })
      .run();
  });
}

// Skip and Dismiss alike: an ended Rest leaves nothing behind.
export function endRest(db: Database) {
  db.delete(rest).run();
}

// For a set that no longer stands as a confirmed Working set: the Rest it started goes with it.
export function cancelRestOf(db: Database, setId: string) {
  db.delete(rest).where(eq(rest.setId, setId)).run();
}
