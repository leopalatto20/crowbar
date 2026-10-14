import { Stack } from "expo-router";
import { Platform, StyleSheet, View } from "react-native";

import { WorkoutBar } from "@/components/workout/workout-bar";
import { useColors } from "@/lib/theme";
import { useWorkoutInProgress } from "@/lib/workout/use-workout";

// Each tab's Stack. On Android the Workout bar sits under it, which NativeTabs already keeps
// above the tab bar; iOS shows the bar as the tab bar's own accessory instead.
export function TabStack() {
  const p = useColors();
  const workout = useWorkoutInProgress();
  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerLargeTitle: true }} />
      {Platform.OS === "android" && workout && (
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
      )}
    </View>
  );
}
