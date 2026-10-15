import { Stack, useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { Suspense, useEffect, useState } from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { WorkoutLog } from "@/components/workout/workout-log";
import { useDb } from "@/db/context";
import { type Ledger, deleteWorkout, finishLogging } from "@/db/workouts";
import { useI18n } from "@/lib/i18n";
import { afterKeyboardHides } from "@/lib/keyboard";
import { useColors } from "@/lib/theme";
import { workoutTitle } from "@/lib/workout/model";
import { useWorkout } from "@/lib/workout/use-workout";

export default function LogWorkoutScreen() {
  const p = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <>
      <Stack.Screen
        options={{ headerStyle: { backgroundColor: p.background }, headerShadowVisible: false }}
      />
      <Suspense fallback={null}>
        <LogWorkout id={id} />
      </Suspense>
    </>
  );
}

function LogWorkout({ id }: { id: string }) {
  const ledger = useWorkout(id);
  return ledger ? <LogWorkoutLedger ledger={ledger} /> : null;
}

function LogWorkoutLedger({ ledger }: { ledger: Ledger }) {
  const db = useDb();
  const router = useRouter();
  const navigation = useNavigation();
  const i18n = useI18n();
  const { t } = i18n;
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const confirmed = ledger.exercises.some((entry) => entry.sets.some((set) => set.done));

  // However the Ledger closes, by Done or by Android's back, it keeps only what was confirmed.
  useEffect(
    () => navigation.addListener("beforeRemove", () => finishLogging(db, ledger.id)),
    [db, navigation, ledger.id],
  );

  function discard() {
    setConfirmingDiscard(false);
    deleteWorkout(db, ledger.id);
    router.back();
  }

  return (
    <>
      <Stack.Screen options={{ title: workoutTitle(ledger.routineName, i18n) }} />
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          // Nothing confirmed yet is cheap to lose, so it needs no confirm.
          onPress={() => (confirmed ? setConfirmingDiscard(true) : discard())}
        >
          {t.history.cancel}
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          variant="done"
          onPress={() => afterKeyboardHides(() => router.back())}
        >
          {t.history.done}
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <WorkoutLog ledger={ledger} mode="edit" />
      <ConfirmDialog
        visible={confirmingDiscard}
        title={t.ledger.discardTitle}
        message={t.ledger.discardMessage}
        confirmLabel={t.ledger.discard}
        cancelLabel={t.ledger.keepLogging}
        onConfirm={discard}
        onDismiss={() => setConfirmingDiscard(false)}
      />
    </>
  );
}
