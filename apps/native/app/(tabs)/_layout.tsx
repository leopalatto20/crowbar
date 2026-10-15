import * as Notifications from "expo-notifications";
import { useNavigationContainerRef, useRouter } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useEffect } from "react";
import { Platform } from "react-native";

import { ExactAlarmsPrompt } from "@/components/exact-alarms-prompt";
import { WorkoutBar } from "@/components/workout/workout-bar";
import { useDb } from "@/db/context";
import { currentWorkout } from "@/db/workouts";
import { useI18n } from "@/lib/i18n";
import { restWorkoutExerciseOf, useRestNotification } from "@/lib/workout/rest-notification";
import { useRestOverHaptic, useWorkoutInProgress } from "@/lib/workout/use-workout";

export default function TabsLayout() {
  const { t } = useI18n();
  const db = useDb();
  const router = useRouter();
  const navigation = useNavigationContainerRef();
  const workout = useWorkoutInProgress();
  // Here rather than on the Rest card: the tabs stay mounted under the Ledger, so the haptic fires
  // once whether the Ledger is open or minimized.
  useRestOverHaptic();
  const { askingExactAlarms, answerExactAlarms } = useRestNotification();

  // The tabs mount once per launch, once the root Stack can navigate, so a Workout left in
  // progress by a killed app reopens in the Ledger over them, scrolled to the Rest's Exercise when
  // its notification is what launched the app.
  useEffect(() => {
    function openLedger(workoutExerciseId: string | null) {
      if (!currentWorkout(db)) return;
      const ledger = {
        pathname: "/workout",
        params: workoutExerciseId ? { workoutExerciseId } : {},
      } as const;
      // A Ledger already on the stack is never stacked twice: navigate only reuses it while it's
      // on top, so one under a modal, such as Exercise history, is unwound to instead.
      if (hasRoute(navigation.getRootState(), "workout")) router.dismissTo(ledger);
      else router.navigate(ledger);
    }
    openLedger(restWorkoutExerciseOf(Notifications.getLastNotificationResponse()));
    Notifications.clearLastNotificationResponse();
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const workoutExerciseId = restWorkoutExerciseOf(response);
      if (workoutExerciseId) openLedger(workoutExerciseId);
    });
    return () => subscription.remove();
  }, [db, router, navigation]);

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

type NavigationState = { routes: { name: string; state?: NavigationState }[] };

// Expo Router nests the root layout's Stack under its own root route, so the search goes down.
function hasRoute(state: NavigationState | undefined, name: string): boolean {
  return state?.routes.some((route) => route.name === name || hasRoute(route.state, name)) ?? false;
}
