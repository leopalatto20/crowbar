import { SymbolView } from "expo-symbols";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, View } from "react-native";

import { ExercisePickerSheet } from "@/components/exercise-picker-sheet";
import { PressableScale } from "@/components/pressable-scale";
import { useDb } from "@/db/context";
import { type Ledger, addWorkoutExercise } from "@/db/workouts";
import { useI18n } from "@/lib/i18n";
import { useSettings } from "@/lib/settings";
import { radii, spacing, type, useColors } from "@/lib/theme";
import type { Rest } from "@/lib/workout/use-workout";

import { ExerciseCard } from "./exercise-card";
import { LedgerText } from "./ledger-text";
import { RestBar } from "./rest-bar";
import { WorkoutMeta } from "./workout-meta";

export function WorkoutLog({ ledger }: { ledger: Ledger }) {
  const db = useDb();
  const router = useRouter();
  const p = useColors();
  const { t } = useI18n();
  const { defaultRestSeconds } = useSettings();
  const [picking, setPicking] = useState(false);
  const [rest, setRest] = useState<Rest | null>(null);
  const resting = ledger.exercises.find((entry) => entry.id === rest?.workoutExerciseId);

  return (
    <View style={{ flex: 1, backgroundColor: p.background }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={{ padding: spacing.xl, paddingBottom: 160, gap: spacing.xl }}
      >
        <WorkoutMeta
          gym={ledger.gymName}
          startedAt={ledger.startedAt}
          onChangeGym={() => router.push("/gym-picker")}
        />
        {ledger.exercises.map((entry) => (
          <ExerciseCard
            key={entry.id}
            entry={entry}
            onConfirmed={(set) => {
              // Warm-ups flow straight into the next set.
              if (set.kind === "warmup") return;
              const duration = entry.target?.restSeconds ?? defaultRestSeconds;
              setRest({
                endsAt: Date.now() + duration * 1000,
                duration,
                workoutExerciseId: entry.id,
              });
            }}
          />
        ))}
        <PressableScale
          onPress={() => setPicking(true)}
          style={{
            height: 50,
            borderRadius: radii.card,
            borderCurve: "continuous",
            borderWidth: 1,
            borderStyle: "dashed",
            borderColor: p.separator,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: spacing.sm,
          }}
        >
          <SymbolView name={{ ios: "plus", android: "add" }} size={20} tintColor={p.blue} />
          <LedgerText style={{ color: p.blue, ...type.headline }}>
            {t.ledger.addExercise}
          </LedgerText>
        </PressableScale>
      </ScrollView>
      <RestBar
        rest={rest}
        exerciseName={resting?.exercise.name ?? ""}
        onAdjust={(seconds) =>
          setRest(
            (current) =>
              current && {
                ...current,
                endsAt: current.endsAt + seconds * 1000,
                duration: current.duration + seconds,
              },
          )
        }
        onEnd={() => setRest(null)}
      />
      <ExercisePickerSheet
        visible={picking}
        marked={{
          ids: ledger.exercises.map((entry) => entry.exercise.id),
          label: t.exercisePicker.inWorkout,
        }}
        onClose={() => setPicking(false)}
        onPick={(exercise) => addWorkoutExercise(db, ledger.id, exercise.id)}
      />
    </View>
  );
}
