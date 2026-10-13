import { Ionicons } from "@expo/vector-icons";
import { Text, TextInput, View } from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";

import { PressableScale } from "@/components/pressable-scale";
import { haptics } from "@/lib/haptics";
import { EASE_OUT } from "@/lib/motion";
import { type Palette, usePalette } from "@/lib/palette";
import { useEffort } from "@/lib/workout/effort";
import {
  type Field,
  type LoggedSet,
  type WorkoutExercise,
  formatClock,
  formatPerformance,
  formatTarget,
  fromEffortDisplay,
  toEffortDisplay,
  unitLabel,
  workingIndex,
} from "@/lib/workout/model";
import type { Workout } from "@/lib/workout/use-workout";

import { StationChip } from "./station-chip";

const COLUMNS = { set: 34, previous: 1.4, field: 1, check: 40 };

export function ExerciseCard({
  exercise,
  workout,
}: {
  exercise: WorkoutExercise;
  workout: Workout;
}) {
  const p = usePalette();
  const effort = useEffort();

  return (
    <View
      style={{
        backgroundColor: p.card,
        borderRadius: 14,
        borderCurve: "continuous",
        paddingVertical: 14,
      }}
    >
      <View style={{ paddingHorizontal: 14, gap: 4, paddingBottom: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={{ color: p.label, fontSize: 17, fontWeight: "600" }}>{exercise.name}</Text>
          {exercise.stationLabel ? <StationChip label={exercise.stationLabel} /> : null}
        </View>
        <Text style={{ color: p.secondary, fontSize: 13, fontVariant: ["tabular-nums"] }}>
          Target {formatTarget(exercise.target, effort)} · rest {formatClock(exercise.restSeconds)}
        </Text>
        {exercise.notes ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingTop: 2 }}>
            <Ionicons name="pin" size={12} color={p.orange} />
            <Text selectable style={{ color: p.label, fontSize: 13 }}>
              {exercise.notes}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={{ flexDirection: "row", paddingHorizontal: 10, paddingVertical: 4, gap: 6 }}>
        <HeaderCell width={COLUMNS.set}>Set</HeaderCell>
        <HeaderCell flex={COLUMNS.previous}>Last here</HeaderCell>
        <HeaderCell flex={COLUMNS.field}>{unitLabel(exercise.unit)}</HeaderCell>
        <HeaderCell flex={COLUMNS.field}>Reps</HeaderCell>
        <HeaderCell flex={COLUMNS.field}>{effort}</HeaderCell>
        <View style={{ width: COLUMNS.check }} />
      </View>

      {exercise.sets.map((set, index) => (
        <SetRow key={set.id} exercise={exercise} set={set} index={index} workout={workout} />
      ))}

      <PressableScale
        onPress={() => workout.addSet(exercise.id)}
        style={{
          marginHorizontal: 14,
          marginTop: 8,
          height: 36,
          borderRadius: 8,
          borderCurve: "continuous",
          backgroundColor: p.fill,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: 4,
        }}
      >
        <Ionicons name="add" size={16} color={p.label} />
        <Text style={{ color: p.label, fontSize: 14, fontWeight: "500" }}>Add set</Text>
      </PressableScale>
    </View>
  );
}

function HeaderCell({
  children,
  width,
  flex,
}: {
  children: string;
  width?: number;
  flex?: number;
}) {
  const p = usePalette();
  return (
    <Text
      style={{
        width,
        flex,
        textAlign: "center",
        color: p.secondary,
        fontSize: 11,
        fontWeight: "600",
        textTransform: "uppercase",
        letterSpacing: 0.4,
      }}
    >
      {children}
    </Text>
  );
}

function SetRow({
  exercise,
  set,
  index,
  workout,
}: {
  exercise: WorkoutExercise;
  set: LoggedSet;
  index: number;
  workout: Workout;
}) {
  const p = usePalette();
  const effort = useEffort();
  const warmup = set.kind === "warmup";

  return (
    <Animated.View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 5,
        backgroundColor: set.done ? p.greenTint : "transparent",
        transitionProperty: "backgroundColor",
        transitionDuration: 180,
        transitionTimingFunction: EASE_OUT,
      }}
    >
      <PressableScale
        onPress={() => {
          haptics.selection();
          workout.toggleKind(exercise.id, set.id);
        }}
        accessibilityLabel={
          warmup ? "Warm-up set, tap to make working" : "Working set, tap to make warm-up"
        }
        style={{
          width: COLUMNS.set,
          height: 30,
          borderRadius: 8,
          borderCurve: "continuous",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: warmup ? p.orangeTint : p.fill,
        }}
      >
        <Text
          style={{
            color: warmup ? p.orange : p.label,
            fontSize: 14,
            fontWeight: "700",
            fontVariant: ["tabular-nums"],
          }}
        >
          {warmup ? "W" : workingIndex(exercise.sets, index)}
        </Text>
      </PressableScale>

      <Text
        numberOfLines={1}
        style={{
          flex: COLUMNS.previous,
          textAlign: "center",
          color: p.secondary,
          fontSize: 14,
          fontVariant: ["tabular-nums"],
        }}
      >
        {formatPerformance(set.previous, exercise.unit, effort)}
      </Text>

      <ValueInput exercise={exercise} set={set} field="weight" workout={workout} palette={p} />
      <ValueInput exercise={exercise} set={set} field="reps" workout={workout} palette={p} />
      {warmup ? (
        <Text style={{ flex: COLUMNS.field, textAlign: "center", color: p.tertiary, fontSize: 15 }}>
          –
        </Text>
      ) : (
        <ValueInput exercise={exercise} set={set} field="rir" workout={workout} palette={p} />
      )}

      <CheckButton
        done={set.done}
        onPress={() => {
          if (set.done) {
            workout.reopenSet(exercise.id, set.id);
          } else {
            haptics.light();
            workout.completeSet(exercise.id, set.id);
          }
        }}
      />
    </Animated.View>
  );
}

function ValueInput({
  exercise,
  set,
  field,
  workout,
  palette: p,
}: {
  exercise: WorkoutExercise;
  set: LoggedSet;
  field: Field;
  workout: Workout;
  palette: Palette;
}) {
  const effort = useEffort();
  const isEffort = field === "rir";
  const toDisplay = (v: number | null) => (isEffort ? toEffortDisplay(v, effort) : v);
  const value = toDisplay(set[field]);
  const ghost = toDisplay(set.previous?.[field] ?? null);

  return (
    <TextInput
      value={value === null ? "" : String(value)}
      placeholder={ghost === null ? "–" : String(ghost)}
      placeholderTextColor={p.tertiary}
      keyboardType={field === "weight" ? "decimal-pad" : "number-pad"}
      selectTextOnFocus
      onChangeText={(text) => {
        const parsed = text === "" ? null : Number(text.replace(",", "."));
        if (parsed !== null && Number.isNaN(parsed)) return;
        workout.setValue(
          exercise.id,
          set.id,
          field,
          isEffort ? fromEffortDisplay(parsed, effort) : parsed,
        );
      }}
      style={{
        flex: COLUMNS.field,
        height: 30,
        borderRadius: 8,
        borderCurve: "continuous",
        backgroundColor: set.done ? "transparent" : p.fill,
        textAlign: "center",
        color: p.label,
        fontSize: 16,
        fontWeight: "600",
        fontVariant: ["tabular-nums"],
        padding: 0,
      }}
    />
  );
}

function CheckButton({ done, onPress }: { done: boolean; onPress: () => void }) {
  const p = usePalette();
  const reduced = useReducedMotion();
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.92}
      accessibilityLabel={done ? "Reopen set" : "Complete set"}
      style={{
        width: COLUMNS.check,
        height: 30,
        borderRadius: 8,
        borderCurve: "continuous",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: done ? p.green : p.fillStrong,
      }}
    >
      <Animated.View
        style={{
          transform: [{ scale: done && !reduced ? 1.12 : 1 }],
          transitionProperty: "transform",
          transitionDuration: 160,
          transitionTimingFunction: EASE_OUT,
        }}
      >
        <Ionicons name="checkmark" size={18} color={done ? p.onAccent : p.secondary} />
      </Animated.View>
    </PressableScale>
  );
}
