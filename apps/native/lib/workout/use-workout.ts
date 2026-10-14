import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { useDb } from "@/db/context";
import { dbQuery } from "@/db/query";
import {
  exercise,
  gym,
  settings,
  station,
  workout,
  workoutExercise,
  workoutSet,
} from "@/db/schema";
import { currentWorkout, getLedger } from "@/db/workouts";
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

export type Rest = { endsAt: number; duration: number; workoutExerciseId: string };

export function useRestRemaining(rest: Rest | null, onElapsed: () => void) {
  const [now, setNow] = useState(Date.now);
  const onElapsedRef = useRef(onElapsed);
  useEffect(() => {
    onElapsedRef.current = onElapsed;
  });

  useEffect(() => {
    if (!rest) return;
    setNow(Date.now());
    const interval = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= rest.endsAt) {
        clearInterval(interval);
        haptics.restOver();
        onElapsedRef.current();
      }
    }, 250);
    return () => clearInterval(interval);
  }, [rest]);

  if (!rest) return null;
  const remaining = Math.max(0, (rest.endsAt - now) / 1000);
  return { remaining, progress: rest.duration > 0 ? 1 - remaining / rest.duration : 1 };
}
