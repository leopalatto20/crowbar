import { Button, Host } from "@expo/ui";
import { useRouter } from "expo-router";
import { Suspense } from "react";
import { Text, View } from "react-native";

import { useDb } from "@/db/context";
import { finishWorkout } from "@/db/workouts";
import { useI18n } from "@/lib/i18n";
import { spacing, type, useColors } from "@/lib/theme";
import { useCurrentWorkout } from "@/lib/workout/use-workout";

export default function FinishWorkoutSheet() {
  return (
    <Suspense fallback={null}>
      <FinishWorkout />
    </Suspense>
  );
}

// Skipped sets need no action: the sheet only says how many will be dropped.
function FinishWorkout() {
  const db = useDb();
  const router = useRouter();
  const p = useColors();
  const { t } = useI18n();
  const ledger = useCurrentWorkout();
  if (!ledger) return null;
  const workoutId = ledger.id;
  const sets = ledger.exercises.flatMap((entry) => entry.sets);
  const unlogged = sets.filter((set) => !set.done).length;
  const message =
    unlogged === sets.length
      ? t.finish.nothingLogged
      : unlogged > 0
        ? t.finish.unlogged(unlogged)
        : t.finish.allLogged;

  function finish() {
    finishWorkout(db, workoutId);
    // Straight back to the Workout tab: finishing shows no summary.
    router.dismissTo("/");
  }

  return (
    <View style={{ padding: spacing.xxl, gap: spacing.xl }}>
      <View style={{ gap: spacing.sm }}>
        <Text style={{ color: p.label, ...type.headline }}>{t.finish.title}</Text>
        <Text style={{ color: p.secondary, ...type.subheadline }}>{message}</Text>
      </View>
      <Host matchContents style={{ alignSelf: "stretch" }}>
        <Button variant="filled" label={t.finish.finish} onPress={finish} />
      </Host>
    </View>
  );
}
