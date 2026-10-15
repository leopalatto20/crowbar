import { useState } from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { EditExerciseSheet } from "@/components/custom-exercise-sheet";
import { ExerciseList } from "@/components/exercise-list";
import { useDb } from "@/db/context";
import {
  type ExerciseHistoryCounts,
  type ExerciseListing,
  deleteCustomExercise,
  exerciseHistoryCounts,
  hideExercise,
  unhideExercise,
} from "@/db/exercises";
import { MUSCLE_GROUPS } from "@/lib/exercise/model";
import { useI18n } from "@/lib/i18n";

// The library's Exercises sectioned by Muscle group, with everything that manages them.
export function ExerciseLibraryList({
  listings,
  onOpenHidden,
}: {
  listings: ExerciseListing[];
  onOpenHidden?: () => void;
}) {
  const db = useDb();
  const { t } = useI18n();
  const [editingId, setEditingId] = useState<string | null>(null);
  // Counted when the confirm opens, so it states exactly what the delete will take.
  const [deleting, setDeleting] = useState<{
    listing: ExerciseListing;
    counts: ExerciseHistoryCounts;
  } | null>(null);

  const sections = [...MUSCLE_GROUPS, null]
    .map((muscleGroup) => ({
      key: muscleGroup ?? "none",
      title: muscleGroup ? t.muscleGroup[muscleGroup] : t.exercises.noMuscleGroup,
      listings: listings.filter((listing) => listing.muscleGroup === muscleGroup),
    }))
    .filter((section) => section.listings.length > 0);

  function remove(listing: ExerciseListing) {
    const counts = exerciseHistoryCounts(db, listing.id);
    // With no logged sets there's no history to lose, so it goes without a confirm.
    if (counts.sets === 0) deleteCustomExercise(db, listing.id);
    else setDeleting({ listing, counts });
  }

  return (
    <>
      <ExerciseList
        sections={sections}
        onOpenHidden={onOpenHidden}
        onEdit={(listing) => setEditingId(listing.id)}
        onToggleHidden={(listing) =>
          listing.hidden ? unhideExercise(db, listing.id) : hideExercise(db, listing.id)
        }
        onDelete={remove}
      />
      <EditExerciseSheet exerciseId={editingId} onClose={() => setEditingId(null)} />
      <ConfirmDialog
        visible={deleting !== null}
        title={deleting ? t.exercises.deleteTitle(deleting.listing.name) : ""}
        message={
          deleting
            ? [
                t.exercises.deleteMessage(deleting.counts),
                ...(deleting.listing.hidden ? [] : [t.exercises.hideKeepsHistory]),
              ].join(" ")
            : ""
        }
        confirmLabel={t.exercises.delete}
        // Hide comes first as the safe way out, unless the Exercise is hidden already.
        alternative={
          deleting && !deleting.listing.hidden
            ? {
                label: t.exercises.hide,
                onPress: () => {
                  hideExercise(db, deleting.listing.id);
                  setDeleting(null);
                },
              }
            : undefined
        }
        cancelLabel={t.exercises.cancel}
        onConfirm={() => {
          if (deleting) deleteCustomExercise(db, deleting.listing.id);
          setDeleting(null);
        }}
        onDismiss={() => setDeleting(null)}
      />
    </>
  );
}
