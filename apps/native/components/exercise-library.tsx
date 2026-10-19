import { useRouter } from "expo-router";
import { useState } from "react";

import { useDeleteExercise } from "@/components/delete-exercise";
import { EditExerciseSheet } from "@/components/custom-exercise-sheet";
import { ExerciseList } from "@/components/exercise-list";
import { useDb } from "@/db/context";
import { type ExerciseListing, hideExercise, unhideExercise } from "@/db/exercises";
import { MUSCLE_GROUPS } from "@/lib/exercise/model";
import { useI18n } from "@/lib/i18n";
import { useMenuHint } from "@/lib/settings";

// `withMenuHint` lets a screen keep the hint off where it would crowd what the lifter came for.
export function ExerciseLibraryList({
  listings,
  onOpenHidden,
  withMenuHint = false,
}: {
  listings: ExerciseListing[];
  onOpenHidden?: () => void;
  withMenuHint?: boolean;
}) {
  const db = useDb();
  const router = useRouter();
  const { t } = useI18n();
  const [editingId, setEditingId] = useState<string | null>(null);
  const deletion = useDeleteExercise();
  const { showMenuHint, onMenuUse } = useMenuHint("exercise");

  const sections = [...MUSCLE_GROUPS, null]
    .map((muscleGroup) => ({
      key: muscleGroup ?? "none",
      title: muscleGroup ? t.muscleGroup[muscleGroup] : t.exercises.noMuscleGroup,
      listings: listings.filter((listing) => listing.muscleGroup === muscleGroup),
    }))
    .filter((section) => section.listings.length > 0);

  return (
    <>
      <ExerciseList
        sections={sections}
        onOpenHidden={onOpenHidden}
        showMenuHint={withMenuHint && showMenuHint}
        onMenuUse={onMenuUse}
        onOpen={(listing) =>
          router.push({ pathname: "/exercise", params: { exerciseId: listing.id } })
        }
        onEdit={(listing) => setEditingId(listing.id)}
        onToggleHidden={(listing) =>
          listing.hidden ? unhideExercise(db, listing.id) : hideExercise(db, listing.id)
        }
        onDelete={deletion.request}
      />
      <EditExerciseSheet exerciseId={editingId} onClose={() => setEditingId(null)} />
      {deletion.dialog}
    </>
  );
}
