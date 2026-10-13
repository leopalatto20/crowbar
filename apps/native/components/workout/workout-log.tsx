import { ScrollView, View } from "react-native";

import { usePalette } from "@/lib/palette";
import { SAMPLE_WORKOUT } from "@/lib/workout/sample-workout";
import { useWorkout } from "@/lib/workout/use-workout";

import { ExerciseCard } from "./exercise-card";
import { RestBar } from "./rest-bar";
import { WorkoutMeta } from "./workout-meta";

export function WorkoutLog() {
  const workout = useWorkout();
  const p = usePalette();

  return (
    <View style={{ flex: 1, backgroundColor: p.background }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={{ padding: 16, paddingBottom: 160, gap: 16 }}
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
