import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useEffect } from "react";
import { Platform } from "react-native";

import { ExactAlarmsPrompt } from "@/components/exact-alarms-prompt";
import { WorkoutBar } from "@/components/workout/workout-bar";
import { useDb } from "@/db/context";
import { currentWorkout } from "@/db/workouts";
import { useI18n } from "@/lib/i18n";
import { restExerciseOf, useRestNotification } from "@/lib/workout/rest-notification";
import { useRestOverHaptic, useWorkoutInProgress } from "@/lib/workout/use-workout";

export default function TabsLayout() {
  const { t } = useI18n();
  const db = useDb();
  const router = useRouter();
  const workout = useWorkoutInProgress();
  // Here rather than on the Rest card: the tabs stay mounted under the Ledger, so the haptic fires
  // once whether the Ledger is open or minimized.
  useRestOverHaptic();
  const { askingExactAlarms, answerExactAlarms } = useRestNotification();

  // The tabs mount once per launch, once the root Stack can navigate, so a Workout left in
  // progress by a killed app reopens in the Ledger over them, scrolled to the Rest's Exercise when
  // its notification is what launched the app.
  useEffect(() => {
    function openLedger(exercise: string | null) {
      if (!currentWorkout(db)) return;
      // navigate, not push: a Ledger already on the stack is never stacked twice.
      router.navigate({ pathname: "/workout", params: exercise ? { exercise } : {} });
    }
    openLedger(restExerciseOf(Notifications.getLastNotificationResponse()));
    Notifications.clearLastNotificationResponse();
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const exercise = restExerciseOf(response);
      if (exercise) openLedger(exercise);
    });
    return () => subscription.remove();
  }, [db, router]);

  return (
    <>
      <ExactAlarmsPrompt visible={askingExactAlarms} onAnswer={answerExactAlarms} />
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
    </>
  );
}
