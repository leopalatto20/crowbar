import { Stack } from "expo-router";

import { WorkoutLog } from "@/components/workout/workout-log";
import { useColors } from "@/lib/theme";
import { SAMPLE_WORKOUT } from "@/lib/workout/sample-workout";

export default function WorkoutScreen() {
  const p = useColors();
  return (
    <>
      <Stack.Screen
        options={{
          title: SAMPLE_WORKOUT.routine,
          headerStyle: { backgroundColor: p.background },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: "minimal",
        }}
      />
      <WorkoutLog />
    </>
  );
}
