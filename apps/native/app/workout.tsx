import { type NativeStackNavigationProp, Stack, useNavigation, useRouter } from "expo-router";
import { Suspense, useEffect, useState } from "react";
import { Keyboard } from "react-native";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { LEDGER_MENU_ICON, LEDGER_MINIMIZE_ICON } from "@/components/workout/ledger-icons";
import { WorkoutLog } from "@/components/workout/workout-log";
import { useDb } from "@/db/context";
import { type Ledger, discardWorkout } from "@/db/workouts";
import { useI18n } from "@/lib/i18n";
import { useColors } from "@/lib/theme";
import { workoutTitle } from "@/lib/workout/model";
import { useCurrentWorkout } from "@/lib/workout/use-workout";

export default function WorkoutScreen() {
  const p = useColors();
  const { t } = useI18n();
  return (
    <>
      <Stack.Screen
        options={{
          title: t.ledger.title,
          headerStyle: { backgroundColor: p.background },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: "minimal",
        }}
      />
      <Suspense fallback={null}>
        <CurrentWorkout />
      </Suspense>
    </>
  );
}

function CurrentWorkout() {
  const ledger = useCurrentWorkout();
  return ledger ? <LedgerScreen ledger={ledger} /> : null;
}

function LedgerScreen({ ledger }: { ledger: Ledger }) {
  const db = useDb();
  const router = useRouter();
  const navigation = useNavigation<NativeStackNavigationProp<Record<string, undefined>>>();
  const i18n = useI18n();
  const { t } = i18n;
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const confirmed = ledger.exercises.some((entry) => entry.sets.some((set) => set.done));

  // Minimizing, by chevron or swipe, unmounts the Ledger; blurring first saves a value typed but
  // not yet committed, while its field still exists.
  useEffect(
    () =>
      navigation.addListener("transitionStart", ({ data }) => {
        if (data.closing) Keyboard.dismiss();
      }),
    [navigation],
  );

  function discard() {
    setConfirmingDiscard(false);
    discardWorkout(db, ledger.id);
    router.back();
  }

  return (
    <>
      <Stack.Screen options={{ title: workoutTitle(ledger.routineName, i18n) }} />
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          icon={LEDGER_MINIMIZE_ICON}
          accessibilityLabel={t.ledger.minimize}
          onPress={() => router.back()}
        />
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Menu icon={LEDGER_MENU_ICON} accessibilityLabel={t.ledger.more}>
          <Stack.Toolbar.MenuAction
            icon="trash"
            destructive
            // A false start with nothing confirmed is cheap to undo, so it needs no confirm.
            onPress={() => (confirmed ? setConfirmingDiscard(true) : discard())}
          >
            {t.ledger.discard}
          </Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
        <Stack.Toolbar.Button
          variant="done"
          onPress={() => {
            // Blurs the focused field, so a value typed but not yet committed is saved first.
            Keyboard.dismiss();
            router.push("/finish-workout");
          }}
        >
          {t.ledger.finish}
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <WorkoutLog ledger={ledger} />
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
