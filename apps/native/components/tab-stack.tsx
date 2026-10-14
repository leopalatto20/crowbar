import { Stack } from "expo-router";
import { Platform, StyleSheet, View } from "react-native";

import { WorkoutBar } from "@/components/workout/workout-bar";
import { useColors } from "@/lib/theme";
import { useWorkoutInProgress } from "@/lib/workout/use-workout";

// On Android the Workout bar sits under each tab's Stack, which NativeTabs already keeps above
// the tab bar; iOS shows it as the tab bar's own accessory instead.
export function TabStack() {
  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerLargeTitle: true }} />
      {Platform.OS === "android" && <PinnedWorkoutBar />}
    </View>
  );
}

function PinnedWorkoutBar() {
  const p = useColors();
  const workout = useWorkoutInProgress();
  if (!workout) return null;
  return (
    <View
      style={{
        height: 56,
        backgroundColor: p.card,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: p.separator,
      }}
    >
      <WorkoutBar workout={workout} />
    </View>
  );
}
