import { SymbolView } from "expo-symbols";
import { useState } from "react";
import { TextInput, View } from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";

import { PressableScale } from "@/components/pressable-scale";
import { useDb } from "@/db/context";
import {
  type LedgerExercise,
  type LedgerSet,
  type SetChange,
  addSet,
  confirmSet,
  reopenSet,
  toggleSetKind,
  updateSet,
} from "@/db/workouts";
import { haptics } from "@/lib/haptics";
import { useI18n } from "@/lib/i18n";
import { LEDGER_MAX_FONT_SCALE, motion, radii, type, useColors } from "@/lib/theme";
import { useEffort } from "@/lib/workout/effort";
import { type Field, parseSetValue, toEffortDisplay, workingIndex } from "@/lib/workout/model";

import { LedgerText } from "./ledger-text";

const COLUMNS = { set: 34, field: 1, check: 40 };
const FIELDS: Field[] = ["load", "reps", "rir"];

export function ExerciseCard({
  entry,
  onConfirmed,
}: {
  entry: LedgerExercise;
  onConfirmed: (set: LedgerSet) => void;
}) {
  const db = useDb();
  const p = useColors();
  const effort = useEffort();
  const { t } = useI18n();

  return (
    <View
      style={{
        backgroundColor: p.card,
        borderRadius: radii.card,
        borderCurve: "continuous",
        paddingVertical: 14,
      }}
    >
      <View style={{ paddingHorizontal: 14, paddingBottom: 10 }}>
        <LedgerText style={{ color: p.label, ...type.headline }}>{entry.exercise.name}</LedgerText>
      </View>

      <View style={{ flexDirection: "row", paddingHorizontal: 10, paddingVertical: 4, gap: 6 }}>
        <HeaderCell width={COLUMNS.set}>{t.ledger.setColumn}</HeaderCell>
        <HeaderCell flex={COLUMNS.field}>{t.unit[entry.unit]}</HeaderCell>
        <HeaderCell flex={COLUMNS.field}>{t.ledger.repsColumn}</HeaderCell>
        <HeaderCell flex={COLUMNS.field}>{t.effort[effort]}</HeaderCell>
        <View style={{ width: COLUMNS.check }} />
      </View>

      {entry.sets.map((set, index) => (
        <SetRow
          key={set.id}
          set={set}
          workingNumber={workingIndex(entry.sets, index)}
          onConfirmed={() => onConfirmed(set)}
        />
      ))}

      <PressableScale
        onPress={() => addSet(db, entry.id)}
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

// Typed text stays a draft until it's committed (blur or confirm), so nothing is written per
// keystroke. Confirming commits the drafts too, since tapping ✓ doesn't blur the field.
function SetRow({
  set,
  workingNumber,
  onConfirmed,
}: {
  set: LedgerSet;
  workingNumber: number;
  onConfirmed: () => void;
}) {
  const db = useDb();
  const p = useColors();
  const effort = useEffort();
  const i18n = useI18n();
  const { t } = i18n;
  const [drafts, setDrafts] = useState<Partial<Record<Field, string>>>({});
  const warmup = set.kind === "warmup";

  // Drafts that can't be stored are dropped, and a logged set can't lose its load or reps.
  function draftChange() {
    const change: SetChange = {};
    for (const field of FIELDS) {
      const text = drafts[field];
      if (text === undefined) continue;
      const value = parseSetValue(field, text, effort);
      if (value === undefined || (value === null && set.done && field !== "rir")) continue;
      change[field] = value;
    }
    return change;
  }

  function dropDraft(field: Field) {
    setDrafts((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function commit(field: Field) {
    const value = draftChange()[field];
    if (value !== undefined) updateSet(db, set.id, { [field]: value });
    dropDraft(field);
  }

  const pending = { ...set, ...draftChange() };
  const canConfirm = pending.load !== null && pending.reps !== null;

  function display(field: Field) {
    const draft = drafts[field];
    if (draft !== undefined) return draft;
    const value = field === "rir" ? toEffortDisplay(set.rir, effort) : set[field];
    return value === null ? "" : i18n.formatEditableDecimal(value);
  }

  function input(field: Field) {
    return (
      <ValueInput
        text={display(field)}
        decimal={field === "load"}
        done={set.done}
        onChangeText={(text) => setDrafts((current) => ({ ...current, [field]: text }))}
        onCommit={() => commit(field)}
      />
    );
  }

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
          toggleSetKind(db, set.id);
          // A warm-up takes no effort, so a half-typed one mustn't be confirmed with it.
          dropDraft("rir");
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
          {warmup ? t.ledger.warmupMarker : workingNumber}
        </LedgerText>
      </PressableScale>

      {input("load")}
      {input("reps")}
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
        input("rir")
      )}

      <CheckButton
        done={set.done}
        disabled={!set.done && !canConfirm}
        onPress={() => {
          if (set.done) {
            reopenSet(db, set.id);
            return;
          }
          confirmSet(db, set.id, draftChange());
          haptics.light();
          setDrafts({});
          onConfirmed();
        }}
      />
    </Animated.View>
  );
}

function ValueInput({
  text,
  decimal,
  done,
  onChangeText,
  onCommit,
}: {
  text: string;
  decimal: boolean;
  done: boolean;
  onChangeText: (text: string) => void;
  onCommit: () => void;
}) {
  const p = useColors();
  return (
    <TextInput
      value={text}
      placeholder="–"
      placeholderTextColor={p.tertiary}
      keyboardType={decimal ? "decimal-pad" : "number-pad"}
      selectTextOnFocus
      maxFontSizeMultiplier={LEDGER_MAX_FONT_SCALE}
      onChangeText={onChangeText}
      onBlur={onCommit}
      style={{
        flex: COLUMNS.field,
        height: 30,
        borderRadius: radii.control,
        borderCurve: "continuous",
        backgroundColor: done ? "transparent" : p.fill,
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

function CheckButton({
  done,
  disabled,
  onPress,
}: {
  done: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const p = useColors();
  const { t } = useI18n();
  const reduced = useReducedMotion();
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
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
