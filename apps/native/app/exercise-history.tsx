import { useLocalSearchParams, useRouter } from "expo-router";
import { Suspense } from "react";

import { ExerciseDetail } from "@/components/exercise-detail/exercise-detail";

// Exercise detail as a sheet over the Ledger, on the Station the Exercise is logged to there.
export default function ExerciseHistorySheet() {
  const router = useRouter();
  const { exerciseId, stationId, gymId } = useLocalSearchParams<{
    exerciseId: string;
    stationId?: string;
    gymId: string;
  }>();
  return (
    <Suspense fallback={null}>
      <ExerciseDetail
        exerciseId={exerciseId}
        stationId={stationId}
        gymId={gymId}
        onDone={() => router.back()}
      />
    </Suspense>
  );
}
