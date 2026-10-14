import { useSuspenseQuery } from "@tanstack/react-query";
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
import { currentWorkoutId, getLedger } from "@/db/workouts";
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
        const id = currentWorkoutId(db);
        return (id && getLedger(db, id, language)) || null;
      },
    }),
  ).data;
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
