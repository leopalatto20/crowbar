import { useRouter } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useEffect } from "react";

import { useDb } from "@/db/context";
import { currentWorkoutId } from "@/db/workouts";
import { useI18n } from "@/lib/i18n";

export default function TabsLayout() {
  const { t } = useI18n();
  const db = useDb();
  const router = useRouter();

  // The tabs mount once per launch, once the root Stack can navigate, so a Workout left in
  // progress by a killed app reopens in the Ledger over them.
  useEffect(() => {
    if (currentWorkoutId(db)) router.push("/workout");
  }, [db, router]);

  return (
    <NativeTabs>
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
