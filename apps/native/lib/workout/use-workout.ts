import { useEffect, useRef, useState } from "react";

import { haptics } from "@/lib/haptics";

import { type Field, type LoggedSet, type WorkoutExercise, effective, makeSetId } from "./model";
import { sampleExercises } from "./sample-workout";

export type Rest = { endsAt: number; duration: number; exerciseId: string };

export function useWorkout() {
  const [exercises, setExercises] = useState<WorkoutExercise[]>(sampleExercises);
  const [rest, setRest] = useState<Rest | null>(null);

  function updateSet(exerciseId: string, setId: string, patch: (set: LoggedSet) => LoggedSet) {
    setExercises((all) =>
      all.map((ex) =>
        ex.id === exerciseId
          ? { ...ex, sets: ex.sets.map((s) => (s.id === setId ? patch(s) : s)) }
          : ex,
      ),
    );
  }

  return {
    exercises,
    rest,
    setValue(exerciseId: string, setId: string, field: Field, value: number | null) {
      updateSet(exerciseId, setId, (s) => ({ ...s, [field]: value }));
    },
    toggleKind(exerciseId: string, setId: string) {
      updateSet(exerciseId, setId, (s) => ({
        ...s,
        kind: s.kind === "working" ? "warmup" : "working",
      }));
    },
    // Confirming commits the prefilled values, so an unchanged set costs exactly one tap.
    completeSet(exerciseId: string, setId: string) {
      const exercise = exercises.find((ex) => ex.id === exerciseId);
      updateSet(exerciseId, setId, (s) => ({
        ...s,
        weight: effective(s, "weight"),
        reps: effective(s, "reps"),
        rir: s.kind === "warmup" ? s.rir : effective(s, "rir"),
        done: true,
      }));
      if (exercise) {
        setRest({
          endsAt: Date.now() + exercise.restSeconds * 1000,
          duration: exercise.restSeconds,
          exerciseId,
        });
      }
    },
    reopenSet(exerciseId: string, setId: string) {
      updateSet(exerciseId, setId, (s) => ({ ...s, done: false }));
    },
    addSet(exerciseId: string) {
      setExercises((all) =>
        all.map((ex) => {
          if (ex.id !== exerciseId) return ex;
          const last = ex.sets.at(-1);
          const previous = last
            ? {
                weight: effective(last, "weight") ?? 0,
                reps: effective(last, "reps") ?? 0,
                rir: effective(last, "rir"),
              }
            : null;
          const added: LoggedSet = {
            id: makeSetId(),
            kind: "working",
            weight: null,
            reps: null,
            rir: null,
            done: false,
            previous,
          };
          return { ...ex, sets: [...ex.sets, added] };
        }),
      );
    },
    adjustRest(seconds: number) {
      setRest((r) =>
        r ? { ...r, endsAt: r.endsAt + seconds * 1000, duration: r.duration + seconds } : r,
      );
    },
    skipRest() {
      setRest(null);
    },
    finishRest() {
      setRest(null);
    },
  };
}

export type Workout = ReturnType<typeof useWorkout>;

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
