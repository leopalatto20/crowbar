import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Pressable, Text } from "react-native";

import { useI18n } from "@/lib/i18n";
import { spacing, type, useColors } from "@/lib/theme";
import { formatElapsed, workoutTitle } from "@/lib/workout/model";
import { useElapsedSeconds } from "@/lib/workout/use-workout";

export type WorkoutInProgress = { routineName: string | null; startedAt: number };

// Transparent, so it takes the iOS accessory's glass or the Android bar's surface.
export function WorkoutBar({ workout }: { workout: WorkoutInProgress }) {
  const router = useRouter();
  const p = useColors();
  const i18n = useI18n();
  const title = workoutTitle(workout.routineName, i18n);
  const elapsed = formatElapsed(useElapsedSeconds(workout.startedAt));

  return (
    <Pressable
      // navigate, not push: reopening never stacks a second Ledger.
      onPress={() => router.navigate("/workout")}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityValue={{ text: elapsed }}
      accessibilityHint={i18n.t.workoutBar.open}
      style={{
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.lg,
        paddingHorizontal: spacing.xl,
      }}
    >
      <SymbolView
        name={{ ios: "dumbbell.fill", android: "fitness_center" }}
        size={18}
        tintColor={p.blue}
      />
      <Text
        numberOfLines={1}
        style={{ flex: 1, color: p.label, ...type.subheadline, fontWeight: "600" }}
      >
        {title}
      </Text>
      <Text style={{ color: p.secondary, ...type.subheadline, fontVariant: ["tabular-nums"] }}>
        {elapsed}
      </Text>
    </Pressable>
  );
}
