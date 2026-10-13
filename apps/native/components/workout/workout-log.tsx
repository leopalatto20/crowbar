import { ScrollView, View } from "react-native";

import { spacing, useColors } from "@/lib/theme";
import { SAMPLE_WORKOUT } from "@/lib/workout/sample-workout";
import { useWorkout } from "@/lib/workout/use-workout";

import { ExerciseCard } from "./exercise-card";
import { RestBar } from "./rest-bar";
import { WorkoutMeta } from "./workout-meta";

export function WorkoutLog() {
  const workout = useWorkout();
  const p = useColors();

  return (
    <View style={{ flex: 1, backgroundColor: p.background }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={{ padding: spacing.xl, paddingBottom: 160, gap: spacing.xl }}
      >
        <WorkoutMeta gym={SAMPLE_WORKOUT.gym} startedAt={SAMPLE_WORKOUT.startedAt} />
        {workout.exercises.map((exercise) => (
          <ExerciseCard key={exercise.id} exercise={exercise} workout={workout} />
        ))}
      </ScrollView>
      <RestBar workout={workout} />
    </View>
  );
}
