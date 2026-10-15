import { applicationId } from "expo-application";
import { startActivityAsync } from "expo-intent-launcher";
import * as Notifications from "expo-notifications";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { AppState, Platform } from "react-native";

import { useDb } from "@/db/context";
import type { Database } from "@/db/database";
import { getSettings, markNotificationsAsked } from "@/db/settings";
import { useI18n } from "@/lib/i18n";
import { useSettings } from "@/lib/settings";
import { useRest } from "@/lib/workout/use-workout";

// One fixed identifier: scheduling under it replaces the Rest before, so the OS never holds two.
const REST_NOTIFICATION_ID = "rest";
// Android freezes a channel's importance and sound once created, so this one is right from the
// first release and never renamed.
const REST_CHANNEL_ID = "rest-timer";
// Android 14 stopped pre-granting exact alarms; before it, asking would only show a granted switch.
const EXACT_ALARMS_DENIED_BY_DEFAULT_SINCE = 34;

type RestNotificationData = { workoutExerciseId: string };

// Each sync finishes before the next starts, so a Rest replaced, adjusted and skipped in quick
// succession leaves the OS holding the last state rather than whichever call landed last.
let syncing = Promise.resolve();
function enqueue(task: () => Promise<void>) {
  syncing = syncing.then(task).catch((error) => console.warn("Rest notification", error));
}

async function clearRestNotification() {
  await Notifications.cancelScheduledNotificationAsync(REST_NOTIFICATION_ID);
  // A "Rest over" left in the tray goes stale once that Rest is dismissed or replaced.
  await Notifications.dismissNotificationAsync(REST_NOTIFICATION_ID);
}

// Marked before the prompt shows, so even a kill mid-prompt never leads to asking twice. Resolves
// whether notifications are allowed, for the exact alarms asked at the same moment.
async function askForNotificationsOnce(db: Database) {
  if (getSettings(db).notificationsAsked) return false;
  markNotificationsAsked(db);
  if ((await Notifications.getPermissionsAsync()).granted) return true;
  const { granted } = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true },
  });
  return granted;
}

// Lives under the tabs, which stay mounted for the whole launch, so the OS notification follows
// the Rest row whether the Ledger is open, minimized, or not yet shown after a cold start.
export function useRestNotification() {
  const db = useDb();
  const rest = useRest();
  const { t } = useI18n();
  const [mountedAt] = useState(Date.now);
  const [foregrounded, setForegrounded] = useState(0);
  const [askingExactAlarms, setAskingExactAlarms] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    enqueue(async () => {
      await Notifications.setNotificationChannelAsync(REST_CHANNEL_ID, {
        name: t.restNotification.channel,
        importance: Notifications.AndroidImportance.HIGH,
        sound: "default",
      });
    });
  }, [t]);

  // Coming back may follow a permission change in system settings, which only a fresh schedule
  // picks up, exact alarms included.
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") setForegrounded((count) => count + 1);
    });
    return () => subscription.remove();
  }, []);

  const endsAt = rest?.endsAt;
  const workoutExerciseId = rest?.workoutExerciseId;
  const title = rest && t.restCard.overTitle(rest.exerciseName);
  // Permission is asked at a Rest the lifter just started, never at one found running at launch.
  const startedThisLaunch = rest !== null && rest.startedAt >= mountedAt;

  useEffect(() => {
    enqueue(async () => {
      await clearRestNotification();
      if (endsAt === undefined || workoutExerciseId === undefined || !title) return;
      if (startedThisLaunch && (await askForNotificationsOnce(db))) {
        if (Platform.OS === "android" && Platform.Version >= EXACT_ALARMS_DENIED_BY_DEFAULT_SINCE) {
          setAskingExactAlarms(true);
        }
      }
      // An ended Rest is already in front of the lifter as the card's "Rest over".
      if (endsAt <= Date.now()) return;
      if (!(await Notifications.getPermissionsAsync()).granted) return;
      await Notifications.scheduleNotificationAsync({
        identifier: REST_NOTIFICATION_ID,
        content: {
          title,
          sound: "default",
          interruptionLevel: "timeSensitive",
          data: { workoutExerciseId } satisfies RestNotificationData,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: endsAt,
          channelId: REST_CHANNEL_ID,
        },
      });
    });
  }, [db, endsAt, workoutExerciseId, title, startedThisLaunch, foregrounded]);

  return {
    askingExactAlarms,
    // Declining keeps inexact delivery: Android still alerts, just possibly a little late.
    answerExactAlarms(allow: boolean) {
      setAskingExactAlarms(false);
      if (allow) {
        void startActivityAsync("android.settings.REQUEST_SCHEDULE_EXACT_ALARM", {
          data: `package:${applicationId}`,
        });
      }
    },
  };
}

export function restWorkoutExerciseOf(response: Notifications.NotificationResponse | null) {
  const data = response?.notification.request.content.data as
    | Partial<RestNotificationData>
    | undefined;
  return typeof data?.workoutExerciseId === "string" ? data.workoutExerciseId : null;
}

// Read on focus, which follows the prompt at a first Rest, and on every return to the app, which
// follows a change in system settings. Not asked yet comes from Crowbar's own flag, as Android
// reports denied before it has ever asked.
export function useNotificationStatus() {
  const { notificationsAsked } = useSettings();
  const [granted, setGranted] = useState<boolean | null>(null);
  useFocusEffect(
    useCallback(() => {
      const read = () =>
        void Notifications.getPermissionsAsync().then((permissions) =>
          setGranted(permissions.granted),
        );
      read();
      const subscription = AppState.addEventListener("change", (state) => {
        if (state === "active") read();
      });
      return () => subscription.remove();
    }, []),
  );
  if (granted === null) return null;
  return granted ? "granted" : notificationsAsked ? "denied" : "undetermined";
}
