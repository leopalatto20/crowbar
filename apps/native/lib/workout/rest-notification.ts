import { applicationId } from "expo-application";
import { startActivityAsync } from "expo-intent-launcher";
import * as Notifications from "expo-notifications";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { AppState, Platform } from "react-native";

import { useDb } from "@/db/context";
import type { Database } from "@/db/database";
import { getSettings, markNotificationsAsked } from "@/db/settings";
import { useI18n } from "@/lib/i18n";
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

export type NotificationStatus = "granted" | "denied" | "undetermined";

// iOS knows whether it has asked, even after a kill mid-prompt. Android reports denied before it
// has ever asked, so there Crowbar's own flag decides.
function wasAsked(permissions: Notifications.NotificationPermissionsStatus, db: Database) {
  return Platform.OS === "ios"
    ? permissions.status !== Notifications.PermissionStatus.UNDETERMINED
    : getSettings(db).notificationsAsked;
}

function statusOf(
  permissions: Notifications.NotificationPermissionsStatus,
  db: Database,
): NotificationStatus {
  if (permissions.granted) return "granted";
  return wasAsked(permissions, db) ? "denied" : "undetermined";
}

// Asking happens at a first Rest or from Settings, while the exact alarms prompt and the scheduled
// Rest live under the tabs, so the outcome reaches them here rather than through either screen.
let permissions = { askingExactAlarms: false, asks: 0 };
const permissionListeners = new Set<() => void>();

function updatePermissions(change: Partial<typeof permissions>) {
  permissions = { ...permissions, ...change };
  for (const listener of permissionListeners) listener();
}

function subscribeToPermissions(listener: () => void) {
  permissionListeners.add(listener);
  return () => permissionListeners.delete(listener);
}

function usePermissions() {
  return useSyncExternalStore(subscribeToPermissions, () => permissions);
}

// Marked before the prompt shows, so even a kill mid-prompt never leads to asking twice on Android.
async function askForNotificationsOnce(db: Database) {
  const current = await Notifications.getPermissionsAsync();
  if (wasAsked(current, db)) return;
  markNotificationsAsked(db);
  const granted =
    current.granted ||
    (
      await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowSound: true },
      })
    ).granted;
  const askingExactAlarms =
    granted &&
    Platform.OS === "android" &&
    Platform.Version >= EXACT_ALARMS_DENIED_BY_DEFAULT_SINCE;
  updatePermissions({ askingExactAlarms, asks: permissions.asks + 1 });
}

// Queued with the Rest's own sync, so a Rest started meanwhile never asks a second time.
export function askForNotifications(db: Database) {
  enqueue(() => askForNotificationsOnce(db));
}

// Lives under the tabs, which stay mounted for the whole launch, so the OS notification follows
// the Rest row whether the Ledger is open, minimized, or not yet shown after a cold start.
export function useRestNotification() {
  const db = useDb();
  const rest = useRest();
  const { t } = useI18n();
  const [mountedAt] = useState(Date.now);
  const [foregrounded, setForegrounded] = useState(0);
  const { askingExactAlarms, asks } = usePermissions();

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
      if (startedThisLaunch) await askForNotificationsOnce(db);
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
    // An answer from Settings reschedules a Rest already running.
  }, [db, endsAt, workoutExerciseId, title, startedThisLaunch, foregrounded, asks]);

  return {
    askingExactAlarms,
    // Declining keeps inexact delivery: Android still alerts, just possibly a little late.
    answerExactAlarms(allow: boolean) {
      updatePermissions({ askingExactAlarms: false });
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

// Read on focus, which follows the prompt at a first Rest, after an answer from Settings, and on
// every return to the app, which follows a change in system settings.
export function useNotificationStatus() {
  const db = useDb();
  const { asks } = usePermissions();
  const [status, setStatus] = useState<NotificationStatus | null>(null);
  useFocusEffect(
    useCallback(() => {
      const read = () =>
        void Notifications.getPermissionsAsync().then((current) =>
          setStatus(statusOf(current, db)),
        );
      read();
      const subscription = AppState.addEventListener("change", (state) => {
        if (state === "active") read();
      });
      return () => subscription.remove();
      // A Settings answer lands with no focus or foreground change, so asks re-runs the read.
    }, [db, asks]),
  );
  return status;
}
