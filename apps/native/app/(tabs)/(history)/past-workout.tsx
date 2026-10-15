import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Suspense, useState } from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { NamePrompt } from "@/components/name-prompt";
import { LEDGER_MENU_ICON } from "@/components/workout/ledger-icons";
import { WorkoutLog } from "@/components/workout/workout-log";
import { useDb } from "@/db/context";
import { type Ledger, deleteWorkout, saveWorkoutAsRoutine, workoutSetCount } from "@/db/workouts";
import { useI18n } from "@/lib/i18n";
import { useColors } from "@/lib/theme";
import { workoutTitle } from "@/lib/workout/model";
import { useWorkout } from "@/lib/workout/use-workout";

export default function PastWorkoutScreen() {
  const p = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <>
      <Stack.Screen
        options={{
          headerLargeTitle: false,
          headerStyle: { backgroundColor: p.background },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: "minimal",
        }}
      />
      <Suspense fallback={null}>
        <PastWorkout id={id} />
      </Suspense>
    </>
  );
}

function PastWorkout({ id }: { id: string }) {
  const ledger = useWorkout(id);
  return ledger ? <PastWorkoutLedger ledger={ledger} /> : null;
}

function PastWorkoutLedger({ ledger }: { ledger: Ledger }) {
  const db = useDb();
  const router = useRouter();
  const i18n = useI18n();
  const { t } = i18n;
  const [naming, setNaming] = useState(false);
  // Counted when the confirm opens, so it states exactly what the delete will take.
  const [deletingSets, setDeletingSets] = useState<number | null>(null);

  return (
    <>
      <Stack.Screen options={{ title: workoutTitle(ledger.routineName, i18n) }} />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Menu icon={LEDGER_MENU_ICON} accessibilityLabel={t.history.more}>
          <Stack.Toolbar.MenuAction icon="plus.square.on.square" onPress={() => setNaming(true)}>
            {t.history.saveAsRoutine}
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction
            icon="trash"
            destructive
            onPress={() => setDeletingSets(workoutSetCount(db, ledger.id))}
          >
            {t.history.delete}
          </Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>
      <WorkoutLog ledger={ledger} readOnly />
      <NamePrompt
        visible={naming}
        title={t.history.saveAsRoutine}
        placeholder={t.routine.namePlaceholder}
        confirmLabel={t.history.save}
        initialName={ledger.routineName ?? ""}
        onSave={(name) => {
          setNaming(false);
          saveWorkoutAsRoutine(db, ledger.id, name);
        }}
        onDismiss={() => setNaming(false)}
      />
      <ConfirmDialog
        visible={deletingSets !== null}
        title={t.history.deleteTitle}
        message={t.history.deleteMessage(deletingSets ?? 0)}
        confirmLabel={t.history.delete}
        cancelLabel={t.history.cancel}
        onConfirm={() => {
          setDeletingSets(null);
          deleteWorkout(db, ledger.id);
          router.back();
        }}
        onDismiss={() => setDeletingSets(null)}
      />
    </>
  );
}
