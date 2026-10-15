import { SymbolView } from "expo-symbols";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, View } from "react-native";

import { ExercisePickerSheet } from "@/components/exercise-picker-sheet";
import { PressableScale } from "@/components/pressable-scale";
import { useDb } from "@/db/context";
import {
  type Ledger,
  addWorkoutExercise,
  setWorkoutDuration,
  setWorkoutStart,
  swapWorkoutExercise,
} from "@/db/workouts";
import { useI18n } from "@/lib/i18n";
import { radii, spacing, type, useColors } from "@/lib/theme";
import { epochOf } from "@/lib/workout/time";
import { useRest } from "@/lib/workout/use-workout";

import { ExerciseCard, type LedgerMode } from "./exercise-card";
import { LedgerText } from "./ledger-text";
import { RestBar } from "./rest-bar";
import { WorkoutMeta } from "./workout-meta";
import { WorkoutTimes } from "./workout-times";

type Picking = { purpose: "add" } | { purpose: "swap"; workoutExerciseId: string };

export function WorkoutLog({ ledger, mode }: { ledger: Ledger; mode: LedgerMode }) {
  const db = useDb();
  const router = useRouter();
  const p = useColors();
  const i18n = useI18n();
  const { t } = i18n;
  const [picking, setPicking] = useState<Picking | null>(null);
  const rest = useRest();
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
          started={
            mode === "live"
              ? t.ledger.started(i18n.formatTime(ledger.startedAt))
              : mode === "read"
                ? t.history.started(
                    i18n.formatDate(ledger.startedAt, ledger.timeZone),
                    i18n.formatTime(ledger.startedAt, ledger.timeZone),
                  )
                : undefined
          }
          onChangeGym={
            mode === "read"
              ? undefined
              : () => router.push({ pathname: "/gym-picker", params: { workoutId: ledger.id } })
          }
        />
        {mode === "edit" && ledger.finishedAt !== null && (
          <WorkoutTimes
            startedAt={ledger.startedAt}
            finishedAt={ledger.finishedAt}
            timeZone={ledger.timeZone}
            onChangeStart={(start) => {
              // A start later than now is refused, so the picker snaps back to the stored one.
              if (epochOf(start, ledger.timeZone) <= Date.now()) {
                setWorkoutStart(db, ledger.id, start);
              }
            }}
            onChangeDuration={(minutes) => setWorkoutDuration(db, ledger.id, minutes)}
          />
        )}
        {ledger.exercises.map((entry, position) => (
          <ExerciseCard
            key={entry.id}
            entry={entry}
            position={position}
            count={ledger.exercises.length}
            mode={mode}
            onSwap={() => setPicking({ purpose: "swap", workoutExerciseId: entry.id })}
            onHistory={() =>
              router.push({
                pathname: "/exercise-history",
                params: {
                  exerciseId: entry.exercise.id,
                  gymId: ledger.gymId,
                  // An Exercise with nothing logged at the Gym yet has no Station of its own.
                  ...(entry.station && { stationId: entry.station.id }),
                },
              })
            }
          />
        ))}
        {mode !== "read" && (
          <PressableScale
            onPress={() => setPicking({ purpose: "add" })}
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
        )}
      </ScrollView>
      {mode === "live" && rest && resting && (
        <RestBar rest={rest} exerciseName={resting.exercise.name} />
      )}
      {mode !== "read" && (
        <ExercisePickerSheet
          visible={picking !== null}
          title={picking?.purpose === "swap" ? t.ledger.swap : t.exercisePicker.title}
          marked={{
            ids: ledger.exercises.map((entry) => entry.exercise.id),
            label: t.exercisePicker.inWorkout,
          }}
          onClose={() => setPicking(null)}
          onPick={(exercise) =>
            picking?.purpose === "swap"
              ? swapWorkoutExercise(db, picking.workoutExerciseId, exercise.id)
              : addWorkoutExercise(db, ledger.id, exercise.id)
          }
        />
      )}
    </View>
  );
}
