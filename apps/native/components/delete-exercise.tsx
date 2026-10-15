import { useState } from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { useDb } from "@/db/context";
import {
  type ExerciseHistoryCounts,
  deleteCustomExercise,
  exerciseHistoryCounts,
  hideExercise,
} from "@/db/exercises";
import { useI18n } from "@/lib/i18n";

export type DeletableExercise = { id: string; name: string; hidden: boolean };

// `request` deletes at once when there's nothing to lose, and otherwise opens `dialog`, a counted
// confirm. `onDeleted` runs once the Exercise is gone either way.
export function useDeleteExercise(onDeleted?: () => void) {
  const db = useDb();
  const { t } = useI18n();
  // Counted when the confirm opens, so it states exactly what the delete will take.
  const [deleting, setDeleting] = useState<{
    exercise: DeletableExercise;
    counts: ExerciseHistoryCounts;
  } | null>(null);

  function remove(id: string) {
    deleteCustomExercise(db, id);
    onDeleted?.();
  }

  function request(exercise: DeletableExercise) {
    const counts = exerciseHistoryCounts(db, exercise.id);
    // A Station counts even with no sets: it is only kept for the lifter's label or machine notes.
    if (counts.sets === 0 && counts.stations === 0) remove(exercise.id);
    else setDeleting({ exercise, counts });
  }

  const dialog = (
    <ConfirmDialog
      visible={deleting !== null}
      title={deleting ? t.exercises.deleteTitle(deleting.exercise.name) : ""}
      message={
        deleting
          ? [
              t.exercises.deleteMessage(deleting.counts),
              ...(deleting.exercise.hidden ? [] : [t.exercises.hideKeepsHistory]),
            ].join(" ")
          : ""
      }
      confirmLabel={t.exercises.delete}
      // Hide comes first as the safe way out, unless the Exercise is hidden already.
      alternative={
        deleting && !deleting.exercise.hidden
          ? {
              label: t.exercises.hide,
              onPress: () => {
                hideExercise(db, deleting.exercise.id);
                setDeleting(null);
              },
            }
          : undefined
      }
      cancelLabel={t.exercises.cancel}
      onConfirm={() => {
        setDeleting(null);
        if (deleting) remove(deleting.exercise.id);
      }}
      onDismiss={() => setDeleting(null)}
    />
  );

  return { request, dialog };
}
