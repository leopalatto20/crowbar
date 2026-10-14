import { useRouter } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useEffect } from "react";
import { Platform } from "react-native";

import { WorkoutBar } from "@/components/workout/workout-bar";
import { useDb } from "@/db/context";
import { currentWorkout } from "@/db/workouts";
import { useI18n } from "@/lib/i18n";
import { useWorkoutInProgress } from "@/lib/workout/use-workout";

export default function TabsLayout() {
  const { t } = useI18n();
  const db = useDb();
  const router = useRouter();
  const workout = useWorkoutInProgress();

  // The tabs mount once per launch, once the root Stack can navigate, so a Workout left in
  // progress by a killed app reopens in the Ledger over them.
  useEffect(() => {
    // navigate, not push: a Ledger already on the stack is never stacked twice.
    if (currentWorkout(db)) router.navigate("/workout");
  }, [db, router]);

  return (
    <NativeTabs>
      {/* Android pins its own bar above the tab bar, in TabStack. */}
      {Platform.OS === "ios" && workout && (
        <NativeTabs.BottomAccessory>
          <WorkoutBar workout={workout} />
        </NativeTabs.BottomAccessory>
      )}
      <NativeTabs.Trigger name="(workout)">
        <NativeTabs.Trigger.Label>{t.tabs.workout}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="dumbbell.fill" md="fitness_center" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(history)">
        <NativeTabs.Trigger.Label>{t.tabs.history}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="clock.fill" md="history" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(exercises)">
        <NativeTabs.Trigger.Label>{t.tabs.exercises}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="books.vertical.fill" md="menu_book" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(settings)">
        <NativeTabs.Trigger.Label>{t.tabs.settings}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="gearshape.fill" md="settings" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
