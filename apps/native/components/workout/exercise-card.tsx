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
import { formatTarget } from "@/lib/routine/model";
import {
  LEDGER_MAX_FONT_SCALE,
  motion,
  radii,
  transitionEaseOut,
  type,
  useColors,
} from "@/lib/theme";
import { useEffort } from "@/lib/workout/effort";
import {
  type Field,
  type LoadFormat,
  formatPerformance,
  parseSetValue,
  toEffortDisplay,
  workingIndex,
} from "@/lib/workout/model";

import { LedgerText } from "./ledger-text";

const COLUMNS = { set: 34, lastHere: 1.4, field: 1, check: 40 };
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
  const i18n = useI18n();
  const { t } = i18n;
  const { loadType, unilateral, equipmentType } = entry.exercise;
  const format: LoadFormat = { unit: entry.unit, loadType, unilateral };
  const hint = t.load.hints[equipmentType];
  // Bodyweight and Assisted loads are entered as the amount added or taken off bodyweight.
  const loadSign = { external: "", bodyweight: "+", assisted: "−" }[loadType];

  return (
    <View
      style={{
        backgroundColor: p.card,
        borderRadius: radii.card,
        borderCurve: "continuous",
        paddingVertical: 14,
      }}
    >
      <View style={{ paddingHorizontal: 14, paddingBottom: 10, gap: 2 }}>
        <LedgerText style={{ color: p.label, ...type.headline }}>{entry.exercise.name}</LedgerText>
        {/* A guide only: always the same quiet line, however the logged sets compare. */}
        {entry.target && (
          <LedgerText style={{ color: p.secondary, ...type.footnote }}>
            {formatTarget(entry.target, effort, i18n)}
          </LedgerText>
        )}
        {hint && <LedgerText style={{ color: p.tertiary, ...type.footnote }}>{hint}</LedgerText>}
      </View>

      <View style={{ flexDirection: "row", paddingHorizontal: 10, paddingVertical: 4, gap: 6 }}>
        <HeaderCell width={COLUMNS.set}>{t.ledger.setColumn}</HeaderCell>
        <HeaderCell flex={COLUMNS.lastHere}>{t.ledger.lastHereColumn}</HeaderCell>
        <HeaderCell flex={COLUMNS.field}>{`${loadSign}${t.unit[entry.unit]}`}</HeaderCell>
        <HeaderCell flex={COLUMNS.field}>
          {unilateral ? t.load.perSide(t.ledger.repsColumn) : t.ledger.repsColumn}
        </HeaderCell>
        <HeaderCell flex={COLUMNS.field}>{t.effort[effort]}</HeaderCell>
        <View style={{ width: COLUMNS.check }} />
      </View>

      {entry.sets.map((set, index) => (
        <SetRow
          key={set.id}
          set={set}
          format={format}
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
      numberOfLines={1}
      adjustsFontSizeToFit
      style={{ width, flex, textAlign: "center", color: p.secondary, ...type.columnHeader }}
    >
      {children}
    </LedgerText>
  );
}

// Typed text stays a draft until it's committed (blur or confirm), so nothing is written per
// keystroke. Confirming commits the drafts too, since tapping ✓ doesn't blur the field. An empty
// field shows its ghost value from "Last here", which confirming commits. A Bodyweight load left
// empty with nothing to show means bodyweight only.
function SetRow({
  set,
  format,
  workingNumber,
  onConfirmed,
}: {
  set: LedgerSet;
  format: LoadFormat;
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
  const isBodyweightLoad = (field: Field) => field === "load" && format.loadType === "bodyweight";

  // Drafts that can't be stored are dropped, and a logged set can't lose its load or reps.
  function draftChange() {
    const change: SetChange = {};
    for (const field of FIELDS) {
      const text = drafts[field];
      if (text === undefined) continue;
      const value = parseSetValue(field, text, effort);
      if (value === null && set.done && isBodyweightLoad(field)) {
        change.load = 0;
        continue;
      }
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
  const canConfirm =
    (isBodyweightLoad("load") || (pending.load ?? set.lastHere?.load ?? null) !== null) &&
    (pending.reps ?? set.lastHere?.reps ?? null) !== null;

  // A Bodyweight load of 0 is left empty so the field reads "BW" instead.
  function formatValue(field: Field, value: number | null | undefined) {
    const shown = field === "rir" ? toEffortDisplay(value ?? null, effort) : value;
    if (shown === null || shown === undefined) return "";
    if (isBodyweightLoad(field) && shown === 0) return "";
    return i18n.formatEditableDecimal(shown);
  }

  function input(field: Field) {
    return (
      <ValueInput
        text={drafts[field] ?? formatValue(field, set[field])}
        // A confirmed set already holds its ghost values, and a stored Bodyweight 0 shows empty, so
        // a ghost only fills a field with nothing stored.
        ghost={set.done || set[field] !== null ? "" : formatValue(field, set.lastHere?.[field])}
        empty={isBodyweightLoad(field) ? t.load.bodyweight : "–"}
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
        transitionTimingFunction: transitionEaseOut,
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

      <LedgerText
        numberOfLines={1}
        // Bodyweight and Unilateral sets read longer, as in "BW +20 × 8/side @2".
        adjustsFontSizeToFit
        minimumFontScale={0.75}
        style={{
          flex: COLUMNS.lastHere,
          textAlign: "center",
          color: p.secondary,
          ...type.cell,
          fontVariant: ["tabular-nums"],
        }}
      >
        {set.lastHere ? formatPerformance(set.lastHere, format, effort, i18n) : "–"}
      </LedgerText>

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
  ghost,
  empty,
  decimal,
  done,
  onChangeText,
  onCommit,
}: {
  text: string;
  ghost: string;
  empty: string;
  decimal: boolean;
  done: boolean;
  onChangeText: (text: string) => void;
  onCommit: () => void;
}) {
  const p = useColors();
  return (
    <TextInput
      value={text}
      placeholder={ghost || empty}
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
          transitionTimingFunction: transitionEaseOut,
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
