import { Stack, useLocalSearchParams } from "expo-router";
import { Suspense } from "react";

import { ExerciseDetail } from "@/components/exercise-detail/exercise-detail";

export default function ExerciseScreen() {
  const { exerciseId } = useLocalSearchParams<{ exerciseId: string }>();
  return (
    <>
      <Stack.Screen options={{ headerLargeTitle: false }} />
      <Suspense fallback={null}>
        <ExerciseDetail exerciseId={exerciseId} />
      </Suspense>
    </>
  );
}
