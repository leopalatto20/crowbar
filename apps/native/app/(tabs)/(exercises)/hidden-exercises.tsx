import { Stack } from "expo-router";
import { Suspense } from "react";

import { EmptyState } from "@/components/empty-state";
import { ExerciseLibraryList } from "@/components/exercise-library";
import { useExerciseLibrary } from "@/lib/exercise/use-exercises";
import { useI18n } from "@/lib/i18n";

export default function HiddenExercisesScreen() {
  const { t } = useI18n();
  return (
    <>
      <Stack.Screen options={{ title: t.exercises.hiddenExercises, headerLargeTitle: false }} />
      <Suspense fallback={null}>
        <HiddenExercises />
      </Suspense>
    </>
  );
}

function HiddenExercises() {
  const { t } = useI18n();
  const hidden = useExerciseLibrary().filter((listing) => listing.hidden);
  // Unhiding the last one leaves the screen empty rather than popping it from under the lifter.
  if (hidden.length === 0) return <EmptyState message={t.exercises.noHiddenExercises} />;
  return <ExerciseLibraryList listings={hidden} />;
}
