import { SymbolView } from "expo-symbols";
import { TextInput, View } from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";

import { PressableScale } from "@/components/pressable-scale";
import { haptics } from "@/lib/haptics";
import { type I18n, useI18n } from "@/lib/i18n";
import { parseDecimal } from "@/lib/i18n/locale";
import { LEDGER_MAX_FONT_SCALE, motion, radii, type, useColors } from "@/lib/theme";
import { useEffort } from "@/lib/workout/effort";
import {
  type Field,
  type LoggedSet,
  type WorkoutExercise,
  formatPerformance,
  formatTarget,
  fromEffortDisplay,
  toEffortDisplay,
  workingIndex,
} from "@/lib/workout/model";
import type { Workout } from "@/lib/workout/use-workout";

import { LedgerText } from "./ledger-text";
import { StationChip } from "./station-chip";

const COLUMNS = { set: 34, previous: 1.4, field: 1, check: 40 };

export function ExerciseCard({
  exercise,
  workout,
}: {
  exercise: WorkoutExercise;
  workout: Workout;
}) {
  const p = useColors();
  const effort = useEffort();
  const i18n = useI18n();
  const { t } = i18n;

  return (
    <View
      style={{
        backgroundColor: p.card,
        borderRadius: radii.card,
        borderCurve: "continuous",
        paddingVertical: 14,
      }}
    >
      <View style={{ paddingHorizontal: 14, gap: 4, paddingBottom: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <LedgerText style={{ color: p.label, ...type.headline }}>{exercise.name}</LedgerText>
          {exercise.stationLabel ? <StationChip label={exercise.stationLabel} /> : null}
        </View>
        <LedgerText style={{ color: p.secondary, ...type.footnote, fontVariant: ["tabular-nums"] }}>
          {formatTarget(exercise.target, exercise.restSeconds, effort, i18n)}
        </LedgerText>
        {exercise.notes ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingTop: 2 }}>
            <SymbolView
              name={{ ios: "pin.fill", android: "push_pin" }}
              size={12}
              tintColor={p.orange}
            />
            <LedgerText selectable style={{ color: p.label, ...type.footnote }}>
              {exercise.notes}
            </LedgerText>
          </View>
        ) : null}
      </View>

      <View style={{ flexDirection: "row", paddingHorizontal: 10, paddingVertical: 4, gap: 6 }}>
        <HeaderCell width={COLUMNS.set}>{t.ledger.setColumn}</HeaderCell>
        <HeaderCell flex={COLUMNS.previous}>{t.ledger.lastHereColumn}</HeaderCell>
        <HeaderCell flex={COLUMNS.field}>{t.unit[exercise.unit]}</HeaderCell>
        <HeaderCell flex={COLUMNS.field}>{t.ledger.repsColumn}</HeaderCell>
        <HeaderCell flex={COLUMNS.field}>{t.effort[effort]}</HeaderCell>
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
          borderRadius: radii.control,
          borderCurve: "continuous",
          backgroundColor: p.fill,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: 4,
        }}
      >
        <SymbolView name={{ ios: "plus", android: "add" }} size={16} tintColor={p.label} />
        <LedgerText style={{ color: p.label, ...type.cell, fontWeight: "500" }}>
          {t.ledger.addSet}
        </LedgerText>
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
  const p = useColors();
  return (
    <LedgerText
      style={{ width, flex, textAlign: "center", color: p.secondary, ...type.columnHeader }}
    >
      {children}
    </LedgerText>
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
  const p = useColors();
  const effort = useEffort();
  const i18n = useI18n();
  const { t } = i18n;
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
        transitionDuration: motion.confirmTint,
        transitionTimingFunction: motion.easeOut,
      }}
    >
      <PressableScale
        onPress={() => {
          haptics.selection();
          workout.toggleKind(exercise.id, set.id);
        }}
        accessibilityLabel={warmup ? t.ledger.makeWorking : t.ledger.makeWarmup}
        style={{
          width: COLUMNS.set,
          height: 30,
          borderRadius: radii.control,
          borderCurve: "continuous",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: warmup ? p.orangeTint : p.fill,
        }}
      >
        <LedgerText
          style={{
            color: warmup ? p.orange : p.label,
            ...type.cell,
            fontWeight: "700",
            fontVariant: ["tabular-nums"],
          }}
        >
          {warmup ? t.ledger.warmupMarker : workingIndex(exercise.sets, index)}
        </LedgerText>
      </PressableScale>

      <LedgerText
        numberOfLines={1}
        style={{
          flex: COLUMNS.previous,
          textAlign: "center",
          color: p.secondary,
          ...type.cell,
          fontVariant: ["tabular-nums"],
        }}
      >
        {formatPerformance(set.previous, exercise.unit, effort, i18n)}
      </LedgerText>

      <ValueInput exercise={exercise} set={set} field="weight" workout={workout} i18n={i18n} />
      <ValueInput exercise={exercise} set={set} field="reps" workout={workout} i18n={i18n} />
      {warmup ? (
        <LedgerText
          style={{
            flex: COLUMNS.field,
            textAlign: "center",
            color: p.tertiary,
            ...type.subheadline,
          }}
        >
          –
        </LedgerText>
      ) : (
        <ValueInput exercise={exercise} set={set} field="rir" workout={workout} i18n={i18n} />
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
  i18n,
}: {
  exercise: WorkoutExercise;
  set: LoggedSet;
  field: Field;
  workout: Workout;
  i18n: I18n;
}) {
  const p = useColors();
  const effort = useEffort();
  const isEffort = field === "rir";
  const toDisplay = (v: number | null) => (isEffort ? toEffortDisplay(v, effort) : v);
  const value = toDisplay(set[field]);
  const ghost = toDisplay(set.previous?.[field] ?? null);

  return (
    <TextInput
      value={value === null ? "" : i18n.formatEditableDecimal(value)}
      placeholder={ghost === null ? "–" : i18n.formatEditableDecimal(ghost)}
      placeholderTextColor={p.tertiary}
      keyboardType={field === "weight" ? "decimal-pad" : "number-pad"}
      selectTextOnFocus
      maxFontSizeMultiplier={LEDGER_MAX_FONT_SCALE}
      onChangeText={(text) => {
        const parsed = parseDecimal(text);
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
        borderRadius: radii.control,
        borderCurve: "continuous",
        backgroundColor: set.done ? "transparent" : p.fill,
        textAlign: "center",
        color: p.label,
        ...type.callout,
        fontWeight: "600",
        fontVariant: ["tabular-nums"],
        padding: 0,
      }}
    />
  );
}

function CheckButton({ done, onPress }: { done: boolean; onPress: () => void }) {
  const p = useColors();
  const { t } = useI18n();
  const reduced = useReducedMotion();
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.92}
      accessibilityLabel={done ? t.ledger.reopenSet : t.ledger.completeSet}
      style={{
        width: COLUMNS.check,
        height: 30,
        borderRadius: radii.control,
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
          transitionDuration: motion.confirmPop,
          transitionTimingFunction: motion.easeOut,
        }}
      >
        <SymbolView
          name={{ ios: "checkmark", android: "check" }}
          weight="semibold"
          size={18}
          tintColor={done ? p.onAccent : p.secondary}
        />
      </Animated.View>
    </PressableScale>
  );
}
