import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AppState } from "react-native";

import { useDb } from "@/db/context";
import { dbQuery } from "@/db/query";
import {
  exercise,
  gym,
  rest,
  routine,
  routineExercise,
  settings,
  station,
  workout,
  workoutEdit,
  workoutExercise,
  workoutSet,
} from "@/db/schema";
import { type Rest, getRest, restClock } from "@/db/rests";
import { currentWorkout, getLedger, listHistory, listWriteBack } from "@/db/workouts";
import { haptics } from "@/lib/haptics";
import { useI18n } from "@/lib/i18n";

// Null once the Workout is finished or discarded, so the Ledger can step aside.
export function useCurrentWorkout() {
  const db = useDb();
  const { language } = useI18n();
  return useSuspenseQuery(
    dbQuery(db, {
      // settings: an Exercise with no Station yet shows the default weight unit.
      tables: [workout, gym, workoutExercise, exercise, station, workoutSet, settings],
      key: ["workout", "current", language],
      fn: (db) => {
        const id = currentWorkout(db)?.id;
        return (id && getLedger(db, id, language)) || null;
      },
    }),
  ).data;
}

// What the Finish sheet offers to write back to the Workout's Routine; null when nothing.
export function useWriteBack(workoutId: string) {
  const db = useDb();
  const { language } = useI18n();
  return useSuspenseQuery(
    dbQuery(db, {
      tables: [
        workout,
        routine,
        routineExercise,
        workoutEdit,
        workoutExercise,
        workoutSet,
        exercise,
      ],
      key: ["workout", workoutId, "writeBack", language],
      fn: (db) => listWriteBack(db, workoutId, language),
    }),
  ).data;
}

export function useHistory() {
  const db = useDb();
  return useSuspenseQuery(
    dbQuery(db, {
      tables: [workout, gym, workoutExercise],
      key: ["workout", "history"],
      fn: listHistory,
    }),
  ).data;
}

// Null once the Workout is deleted, so its detail screen can step aside.
export function useWorkout(id: string) {
  const db = useDb();
  const { language } = useI18n();
  return useSuspenseQuery(
    dbQuery(db, {
      tables: [workout, gym, workoutExercise, exercise, station, workoutSet, settings],
      key: ["workout", id, language],
      fn: (db) => getLedger(db, id, language) ?? null,
    }),
  ).data;
}

// Not suspending: the tab bar reads it, and the tabs shouldn't blank while it loads.
export function useWorkoutInProgress() {
  const db = useDb();
  return (
    useQuery(
      dbQuery(db, {
        tables: [workout],
        key: ["workout", "inProgress"],
        fn: (db) => currentWorkout(db) ?? null,
      }),
    ).data ?? null
  );
}

export function useElapsedSeconds(startedAt: number) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);
  return (now - startedAt) / 1000;
}

// Not suspending, like useWorkoutInProgress: the Workout bar reads it under the tabs.
export function useRest() {
  const db = useDb();
  return (
    useQuery(
      dbQuery(db, {
        tables: [rest, workoutSet],
        key: ["rest"],
        fn: getRest,
      }),
    ).data ?? null
  );
}

// Ticks while a Rest is shown. Coming back to the foreground reads the clock at once rather than
// on the next tick, so a Rest that ended in the background never shows a stale countdown.
export function useRestClock(running: Rest | null) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!running) return;
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 250);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") setNow(Date.now());
    });
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [running]);
  return running && restClock(running, now);
}

// The haptic answers the countdown reaching zero in front of the lifter. A timer held back while
// the app was in the background fires late on return, by which time the Rest ended unseen.
const REST_OVER_HAPTIC_WINDOW_MS = 1000;

export function useRestOverHaptic() {
  const endsAt = useRest()?.endsAt;
  useEffect(() => {
    if (endsAt === undefined || endsAt <= Date.now()) return;
    const timeout = setTimeout(() => {
      if (Date.now() - endsAt < REST_OVER_HAPTIC_WINDOW_MS) haptics.restOver();
    }, endsAt - Date.now());
    return () => clearTimeout(timeout);
  }, [endsAt]);
}
