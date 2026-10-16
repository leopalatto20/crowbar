import { HStack, Image, ProgressView, Text, VStack } from "@expo/ui/swift-ui";
import {
  font,
  foregroundStyle,
  frame,
  labelsHidden,
  monospacedDigit,
  padding,
  tint,
} from "@expo/ui/swift-ui/modifiers";
import { type LiveActivity, type LiveActivityEnvironment, createLiveActivity } from "expo-widgets";
import { useEffect, useState } from "react";
import { AppState, Platform } from "react-native";

import { useI18n } from "@/lib/i18n";
import { restActivityStep, restLink } from "@/lib/workout/rest-activity";
import { useRest } from "@/lib/workout/use-workout";

// Times as epoch milliseconds: props cross to the widget as JSON, which has no dates.
type RestActivityProps = { title: string; startedAt: number; endsAt: number };

// Runs in the widget's own runtime, which sees only its arguments and the @expo/ui components, so
// nothing from the app's scope is used inside. The system ticks the countdown and progress itself
// and stops both at zero.
function RestActivityLayout(
  { title, startedAt, endsAt }: RestActivityProps,
  { colorScheme }: LiveActivityEnvironment,
) {
  "widget";
  // The theme's system blues, which the widget can't import. The Dynamic Island is always dark.
  const islandBlue = "#0A84FF";
  const bannerBlue = colorScheme === "dark" ? islandBlue : "#007AFF";
  const interval = { lower: new Date(startedAt), upper: new Date(endsAt) };
  const countdown = (size: number) => (
    <Text
      timerInterval={interval}
      modifiers={[font({ size, weight: "semibold" }), monospacedDigit()]}
    />
  );
  // Without a width a timer text claims the whole compact island.
  const compactCountdown = (
    <Text
      timerInterval={interval}
      modifiers={[monospacedDigit(), frame({ maxWidth: 44 }), foregroundStyle(islandBlue)]}
    />
  );
  // Hidden labels drop the elapsed time SwiftUI prints under a timer progress bar.
  const progress = (blue: string) => (
    <ProgressView
      timerInterval={interval}
      countsDown={false}
      modifiers={[tint(blue), labelsHidden()]}
    />
  );
  return {
    banner: (
      <VStack alignment="leading" spacing={8} modifiers={[padding({ all: 16 })]}>
        <Text modifiers={[font({ size: 13, weight: "semibold" }), foregroundStyle("secondary")]}>
          {title}
        </Text>
        {countdown(34)}
        {progress(bannerBlue)}
      </VStack>
    ),
    compactLeading: <Image systemName="timer" color={islandBlue} />,
    compactTrailing: compactCountdown,
    minimal: compactCountdown,
    expandedLeading: (
      <HStack modifiers={[padding({ leading: 4 })]}>
        <Text modifiers={[font({ size: 15, weight: "semibold" })]}>{title}</Text>
      </HStack>
    ),
    expandedTrailing: countdown(28),
    expandedBottom: progress(islandBlue),
  };
}

const RestActivity = createLiveActivity<RestActivityProps>("RestActivity", RestActivityLayout);

let shown: { workoutExerciseId: string; activity: LiveActivity<RestActivityProps> } | null = null;

// Each sync finishes before the next starts, so a Rest replaced, adjusted and skipped in quick
// succession leaves the activity showing the last state rather than whichever call landed last.
let syncing = Promise.resolve();
function enqueue(task: () => Promise<void>) {
  syncing = syncing.then(task).catch((error) => console.warn("Rest Live Activity", error));
}

async function endRestActivities() {
  shown = null;
  // Includes any left by an earlier launch, which this one can't match to a Rest.
  await Promise.all(RestActivity.getInstances().map((activity) => activity.end("immediate")));
}

// Lives under the tabs, which stay mounted for the whole launch, so the activity follows the Rest
// row whether the Ledger is open, minimized, or not yet shown after a cold start.
export function useRestLiveActivity() {
  const rest = useRest();
  const { t } = useI18n();
  // Bumped at zero and on every return to the app: a timer held back in the background fires on
  // return, and either way the next foreground after zero ends the activity.
  const [checks, setChecks] = useState(0);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") setChecks((count) => count + 1);
    });
    return () => subscription.remove();
  }, []);

  const endsAt = rest?.endsAt;
  useEffect(() => {
    if (endsAt === undefined) return;
    const timeout = setTimeout(
      () => setChecks((count) => count + 1),
      Math.max(0, endsAt - Date.now()),
    );
    return () => clearTimeout(timeout);
  }, [endsAt]);

  useEffect(() => {
    if (Platform.OS !== "ios") return;
    enqueue(async () => {
      const step = restActivityStep(shown?.workoutExerciseId ?? null, rest, Date.now());
      if (step === "end" || !rest) return endRestActivities();
      const props = {
        title: t.restCard.title(rest.exerciseName),
        startedAt: rest.startedAt,
        endsAt: rest.endsAt,
      };
      if (shown && step === "update") return shown.activity.update(props);
      await endRestActivities();
      shown = {
        workoutExerciseId: rest.workoutExerciseId,
        activity: RestActivity.start(props, restLink(rest.workoutExerciseId)),
      };
    });
  }, [rest, t, checks]);
}
