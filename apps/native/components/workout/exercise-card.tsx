import { SymbolView } from "expo-symbols";
import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { PressableScale } from "@/components/pressable-scale";
import { StationLabelPrompt } from "@/components/station-label-prompt";
import { useDb } from "@/db/context";
import {
  type LedgerExercise,
  type LedgerSet,
  type SetChange,
  addSet,
  addStation,
  confirmSet,
  deleteSet,
  moveWorkoutExercise,
  removeWorkoutExercise,
  reopenSet,
  setMachineNotes,
  switchStation,
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
  spacing,
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

import { ExerciseMenu } from "./exercise-menu";
import { LedgerText } from "./ledger-text";

const COLUMNS = { set: 34, lastHere: 1.4, field: 1, check: 40 };
const FIELDS: Field[] = ["load", "reps", "rir"];

// Edit mode corrects a finished Workout in place: a Rest or haptics would only answer logging.
export type LedgerMode = "live" | "edit" | "read";

export function ExerciseCard({
  entry,
  position,
  count,
  mode,
  onConfirmed,
  onSwap,
  onHistory,
}: {
  entry: LedgerExercise;
  // Its index in the Ledger, of `count` Exercises.
  position: number;
  count: number;
  mode: LedgerMode;
  onConfirmed: (set: LedgerSet) => void;
  onSwap: () => void;
  onHistory: () => void;
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
  const [editingNotes, setEditingNotes] = useState(false);
  const [namingStation, setNamingStation] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const logged = entry.sets.some((set) => set.done);
  const notes = entry.station?.notes ?? null;
  // The chip only tells Stations apart, so a lone Station shows none.
  const chipLabel = entry.stations.length > 1 ? entry.station?.label : null;

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
        {mode === "read" ? (
          <LedgerText style={{ color: p.label, ...type.headline }}>
            {entry.exercise.name}
          </LedgerText>
        ) : (
          <ExerciseMenu
            name={entry.exercise.name}
            stations={entry.stations}
            currentStationId={entry.station?.id ?? null}
            hasNotes={notes !== null}
            canSwap={!logged}
            canMoveUp={position > 0}
            canMoveDown={position < count - 1}
            onHistory={onHistory}
            onSwitchStation={(stationId) => {
              if (mode === "live") haptics.selection();
              switchStation(db, entry.id, stationId);
            }}
            onNewStation={() => setNamingStation(true)}
            onEditNotes={() => setEditingNotes(true)}
            onSwap={onSwap}
            onMoveUp={() => moveWorkoutExercise(db, entry.id, position - 1)}
            onMoveDown={() => moveWorkoutExercise(db, entry.id, position + 1)}
            // An Exercise with nothing logged is cheap to add back, so it needs no confirm.
            onRemove={() =>
              logged ? setConfirmingRemove(true) : removeWorkoutExercise(db, entry.id)
            }
          />
        )}
        {chipLabel && <StationChip label={chipLabel} />}
        {editingNotes ? (
          <NotesInput
            notes={notes}
            onCommit={(text) => {
              setMachineNotes(db, entry.id, text);
              setEditingNotes(false);
            }}
          />
        ) : (
          notes && (
            <NotesLine
              notes={notes}
              onPress={mode === "read" ? undefined : () => setEditingNotes(true)}
            />
          )
        )}
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
        {mode !== "read" && <View style={{ width: COLUMNS.check }} />}
      </View>

      {entry.sets.map((set, index) =>
        mode === "read" ? (
          <LoggedSetRow
            key={set.id}
            set={set}
            format={format}
            workingNumber={workingIndex(entry.sets, index)}
          />
        ) : (
          <SetRow
            key={set.id}
            set={set}
            format={format}
            workingNumber={workingIndex(entry.sets, index)}
            editing={mode === "edit"}
            onConfirmed={() => onConfirmed(set)}
          />
        ),
      )}

      {mode !== "read" && (
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
      )}
      <StationLabelPrompt
        visible={namingStation}
        // The Gym's only Station is still unnamed, so it's named along with the new one.
        nameExisting={entry.stations.length === 1 && entry.stations[0]!.label === null}
        onSave={(labels) => {
          setNamingStation(false);
          addStation(db, entry.id, labels);
        }}
        onDismiss={() => setNamingStation(false)}
      />
      <ConfirmDialog
        visible={confirmingRemove}
        title={t.ledger.removeTitle(entry.exercise.name)}
        message={t.ledger.removeMessage}
        confirmLabel={t.ledger.remove}
        cancelLabel={mode === "live" ? t.ledger.keepLogging : t.history.cancel}
        onConfirm={() => {
          setConfirmingRemove(false);
          removeWorkoutExercise(db, entry.id);
        }}
        onDismiss={() => setConfirmingRemove(false)}
      />
    </View>
  );
}

function StationChip({ label }: { label: string }) {
  const p = useColors();
  const { t } = useI18n();
  return (
    <View
      accessible
      accessibilityLabel={t.ledger.station(label)}
      style={{
        alignSelf: "flex-start",
        marginVertical: 2,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: radii.pill,
        backgroundColor: p.fill,
      }}
    >
      <LedgerText numberOfLines={1} style={{ color: p.label, ...type.footnote, fontWeight: "600" }}>
        {label}
      </LedgerText>
    </View>
  );
}

function PinIcon() {
  const p = useColors();
  return (
    <SymbolView
      name={{ ios: "pin.fill", android: "push_pin" }}
      size={12}
      tintColor={p.secondary}
      style={{ marginTop: 2 }}
    />
  );
}

function NotesLine({ notes, onPress }: { notes: string; onPress?: () => void }) {
  const p = useColors();
  const { t } = useI18n();
  const content = (
    <>
      <PinIcon />
      <LedgerText style={{ flex: 1, color: p.secondary, ...type.footnote }}>{notes}</LedgerText>
    </>
  );
  const style = { flexDirection: "row", alignItems: "flex-start", gap: spacing.xs } as const;
  if (!onPress) return <View style={style}>{content}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={notes}
      accessibilityHint={t.ledger.editNotes}
      style={style}
    >
      {content}
    </Pressable>
  );
}

// Edited in place and saved when the field loses focus, as the set fields are.
function NotesInput({
  notes,
  onCommit,
}: {
  notes: string | null;
  onCommit: (text: string) => void;
}) {
  const p = useColors();
  const { t } = useI18n();
  const [text, setText] = useState(notes ?? "");
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.xs }}>
      <PinIcon />
      <TextInput
        value={text}
        onChangeText={setText}
        onBlur={() => onCommit(text)}
        autoFocus
        // Wraps a long note, while Return saves it: notes are a line or two, never paragraphs.
        multiline
        submitBehavior="blurAndSubmit"
        returnKeyType="done"
        placeholder={t.ledger.notesPlaceholder}
        placeholderTextColor={p.tertiary}
        maxFontSizeMultiplier={LEDGER_MAX_FONT_SCALE}
        style={{ flex: 1, color: p.label, ...type.footnote, padding: 0 }}
      />
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
// empty with nothing to show means bodyweight only. While `editing` a finished Workout, a logged
// set is deleted rather than reopened: nothing there is waiting to be done.
function SetRow({
  set,
  format,
  workingNumber,
  editing,
  onConfirmed,
}: {
  set: LedgerSet;
  format: LoadFormat;
  workingNumber: number;
  editing: boolean;
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
          if (!editing) haptics.selection();
          toggleSetKind(db, set.id);
          // A warm-up takes no effort, so a half-typed one mustn't be confirmed with it.
          dropDraft("rir");
        }}
        accessibilityLabel={warmup ? t.ledger.makeWorking : t.ledger.makeWarmup}
        style={setNumberStyle(warmup, p)}
      >
        <SetNumber warmup={warmup} workingNumber={workingNumber} />
      </PressableScale>

      <LastHere lastHere={set.lastHere} format={format} />

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

      {editing && set.done ? (
        <DeleteButton onPress={() => deleteSet(db, set.id)} />
      ) : (
        <CheckButton
          done={set.done}
          disabled={!set.done && !canConfirm}
          onPress={() => {
            if (set.done) {
              reopenSet(db, set.id);
              return;
            }
            confirmSet(db, set.id, draftChange());
            if (!editing) haptics.light();
            setDrafts({});
            onConfirmed();
          }}
        />
      )}
    </Animated.View>
  );
}

function setNumberStyle(warmup: boolean, p: ReturnType<typeof useColors>) {
  return {
    width: COLUMNS.set,
    height: 30,
    borderRadius: radii.control,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: warmup ? p.orangeTint : p.fill,
  } as const;
}

function SetNumber({ warmup, workingNumber }: { warmup: boolean; workingNumber: number }) {
  const p = useColors();
  const { t } = useI18n();
  return (
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
  );
}

function LastHere({ lastHere, format }: { lastHere: LedgerSet["lastHere"]; format: LoadFormat }) {
  const p = useColors();
  const effort = useEffort();
  const i18n = useI18n();
  return (
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
      {lastHere ? formatPerformance(lastHere, format, effort, i18n) : "–"}
    </LedgerText>
  );
}

// A past set as logged: the values it was confirmed with, with nothing to type or tap.
function LoggedSetRow({
  set,
  format,
  workingNumber,
}: {
  set: LedgerSet;
  format: LoadFormat;
  workingNumber: number;
}) {
  const p = useColors();
  const effort = useEffort();
  const i18n = useI18n();
  const { t } = i18n;
  const warmup = set.kind === "warmup";
  // A Bodyweight load of 0 is bodyweight only, as the Ledger shows it.
  const load =
    set.load === null
      ? "–"
      : format.loadType === "bodyweight" && set.load === 0
        ? t.load.bodyweight
        : i18n.formatDecimal(set.load);
  const rir = toEffortDisplay(set.rir, effort);

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 5,
      }}
    >
      <View style={setNumberStyle(warmup, p)}>
        <SetNumber warmup={warmup} workingNumber={workingNumber} />
      </View>
      <LastHere lastHere={set.lastHere} format={format} />
      <LoggedValue>{load}</LoggedValue>
      <LoggedValue>{set.reps === null ? "–" : String(set.reps)}</LoggedValue>
      <LoggedValue>{rir === null ? "–" : String(rir)}</LoggedValue>
    </View>
  );
}

function LoggedValue({ children }: { children: string }) {
  const p = useColors();
  return (
    <LedgerText
      numberOfLines={1}
      style={{
        flex: COLUMNS.field,
        textAlign: "center",
        color: p.label,
        ...type.callout,
        fontWeight: "600",
        fontVariant: ["tabular-nums"],
      }}
    >
      {children}
    </LedgerText>
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

function DeleteButton({ onPress }: { onPress: () => void }) {
  const p = useColors();
  const { t } = useI18n();
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.92}
      accessibilityLabel={t.history.deleteSet}
      style={{
        width: COLUMNS.check,
        height: 30,
        borderRadius: radii.control,
        borderCurve: "continuous",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: p.fillStrong,
      }}
    >
      <SymbolView
        name={{ ios: "minus", android: "remove" }}
        weight="semibold"
        size={18}
        tintColor={p.red}
      />
    </PressableScale>
  );
}
