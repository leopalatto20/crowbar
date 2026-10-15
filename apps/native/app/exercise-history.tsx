import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Suspense } from "react";

import { ExerciseDetail } from "@/components/exercise-detail/exercise-detail";
import { useI18n } from "@/lib/i18n";

// Exercise detail as a sheet over the Ledger, on the Station the Exercise is logged to there.
export default function ExerciseHistorySheet() {
  const router = useRouter();
  const { t } = useI18n();
  const { exerciseId, stationId, gymId } = useLocalSearchParams<{
    exerciseId: string;
    stationId?: string;
    gymId: string;
  }>();
  return (
    <>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button variant="done" onPress={() => router.back()}>
          {t.exerciseDetail.done}
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <Suspense fallback={null}>
        <ExerciseDetail exerciseId={exerciseId} stationId={stationId} gymId={gymId} />
      </Suspense>
    </>
  );
}
