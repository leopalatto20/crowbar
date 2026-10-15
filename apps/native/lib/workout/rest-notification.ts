import { applicationId } from "expo-application";
import { startActivityAsync } from "expo-intent-launcher";
import * as Notifications from "expo-notifications";
import { useEffect, useState } from "react";
import { AppState, Platform } from "react-native";

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

// Asked only while undetermined, so a lifter who declined is never asked again. Expo reports
// Android as undetermined until the app first asks, like iOS.
async function askForNotifications() {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== "undetermined") return false;
  const { granted } = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true },
  });
  return granted;
}

// Keeps the OS notification in step with the Rest row: it schedules, reschedules and cancels as
// the Rest starts, is replaced, adjusted or ends, and reconciles on launch and on foreground.
// Lives under the tabs, which stay mounted for the whole launch.
export function useRestNotification() {
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
      if (startedThisLaunch && (await askForNotifications())) {
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
  }, [endsAt, workoutExerciseId, title, startedThisLaunch, foregrounded]);

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

// The Workout Exercise whose Rest a tapped notification announced; null for any other tap.
export function restExerciseOf(response: Notifications.NotificationResponse | null) {
  const data = response?.notification.request.content.data as
    | Partial<RestNotificationData>
    | undefined;
  return typeof data?.workoutExerciseId === "string" ? data.workoutExerciseId : null;
}

export type NotificationStatus = Notifications.PermissionStatus;

// Read fresh on every return to the app: the lifter may have flipped it in system settings.
export function useNotificationStatus() {
  const [status, setStatus] = useState<NotificationStatus | null>(null);
  useEffect(() => {
    const read = () =>
      void Notifications.getPermissionsAsync().then((permissions) => setStatus(permissions.status));
    read();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") read();
    });
    return () => subscription.remove();
  }, []);
  return status;
}
