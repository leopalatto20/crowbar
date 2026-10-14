import { SymbolView } from "expo-symbols";
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import Animated, { FadeIn } from "react-native-reanimated";

import { PressableScale } from "@/components/pressable-scale";
import type { RoutineExercise, TargetsChange } from "@/db/routines";
import { type I18n, useI18n } from "@/lib/i18n";
import {
  REP_PRESETS,
  RIR_PRESETS,
  SET_PRESETS,
  WARMUP_PRESETS,
  formatPlannedEffort,
  formatPlannedVolume,
  formatWarmups,
} from "@/lib/routine/model";
import { motion, radii, spacing, type, useColors } from "@/lib/theme";
import { useEffort } from "@/lib/workout/effort";
import { type Effort, formatEffortRange, formatRange } from "@/lib/workout/model";

import { RestPicker } from "./rest-picker";
import { type ChipSection, ChipSections, PanelHeader } from "./target-panel";

// Sets and reps share one pill, so the row reads like the Ledger's "Target 3 × 5–7" line.
export type TargetPill = "warmups" | "volume" | "effort";
export const PILLS: TargetPill[] = ["warmups", "volume", "effort"];

const PANEL_ENTER = FadeIn.duration(motion.panelEnter).easing(motion.enterEasing);

function pillLabel(entry: RoutineExercise, pill: TargetPill, effort: Effort, i18n: I18n) {
  switch (pill) {
    case "warmups":
      return formatWarmups(entry.warmups, i18n);
    case "volume":
      return formatPlannedVolume(entry);
    case "effort":
      return formatPlannedEffort(entry, effort, i18n);
  }
}

function panel(entry: RoutineExercise, pill: TargetPill, effort: Effort, { t }: I18n) {
  switch (pill) {
    case "warmups":
      return {
        title: t.routine.warmupSets,
        sections: [
          {
            title: t.routine.warmupSets,
            advances: true,
            chips: WARMUP_PRESETS.map((n) => ({
              label: n === 0 ? t.routine.none : `${n}`,
              selected: entry.warmups === n,
              patch: { warmups: n },
            })),
          },
        ] satisfies ChipSection[],
      };
    case "volume":
      // Sets stays open so both halves can be picked; the rep range is what moves on.
      return {
        title: t.routine.workingSetsByReps,
        sections: [
          {
            title: t.routine.sets,
            advances: false,
            chips: SET_PRESETS.map((n) => ({
              label: `${n}`,
              selected: entry.sets === n,
              patch: { sets: n },
            })),
          },
          {
            title: t.routine.reps,
            advances: true,
            customReps: true,
            chips: REP_PRESETS.map(([min, max]) => ({
              label: formatRange(min, max),
              selected: entry.repMin === min && entry.repMax === max,
              patch: { repMin: min, repMax: max },
            })),
          },
        ] satisfies ChipSection[],
      };
    case "effort":
      return {
        title: t.routine.effortPanel(t.effort[effort]),
        sections: [
          {
            title: t.effort[effort],
            advances: true,
            chips: RIR_PRESETS.map(([min, max]) => ({
              label: formatEffortRange(min, max, effort),
              selected: entry.rirMin === min && entry.rirMax === max,
              patch: { rirMin: min, rirMax: max },
            })),
          },
        ] satisfies ChipSection[],
      };
  }
}

export function RoutineExerciseCard({
  entry,
  open,
  handle,
  onPill,
  onPick,
  onClose,
  onChange,
  onRemove,
}: {
  entry: RoutineExercise;
  open: TargetPill | null;
  handle: (children: ReactNode) => ReactNode;
  onPill: (pill: TargetPill) => void;
  onPick: (pill: TargetPill, patch: TargetsChange, advances: boolean) => void;
  onClose: () => void;
  onChange: (patch: TargetsChange) => void;
  onRemove: () => void;
}) {
  const p = useColors();
  const effort = useEffort();
  const i18n = useI18n();
  const { t } = i18n;
  const content = open ? panel(entry, open, effort, i18n) : null;

  return (
    <ReanimatedSwipeable
      friction={1.5}
      rightThreshold={60}
      overshootRight={false}
      renderRightActions={() => (
        <Pressable
          onPress={onRemove}
          accessibilityRole="button"
          accessibilityLabel={t.routine.removeExercise(entry.exercise.name)}
          style={{
            width: 88,
            marginLeft: spacing.md,
            borderRadius: radii.card,
            borderCurve: "continuous",
            backgroundColor: p.red,
            alignItems: "center",
            justifyContent: "center",
            gap: spacing.xxs,
          }}
        >
          <SymbolView
            name={{ ios: "trash.fill", android: "delete" }}
            size={18}
            tintColor={p.onAccent}
          />
          <Text style={{ color: p.onAccent, ...type.footnote, fontWeight: "600" }}>
            {t.routine.remove}
          </Text>
        </Pressable>
      )}
    >
      <View
        style={{
          backgroundColor: p.card,
          borderRadius: radii.card,
          borderCurve: "continuous",
          padding: spacing.lg,
          gap: 10,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
          <View style={{ flex: 1, gap: 3 }}>
            <Text numberOfLines={1} style={{ color: p.label, ...type.callout, fontWeight: "600" }}>
              {entry.exercise.name}
            </Text>
            <RestPicker
              seconds={entry.restSeconds}
              onChange={(restSeconds) => onChange({ restSeconds })}
            />
          </View>
          {handle(
            <SymbolView
              name={{ ios: "line.3.horizontal", android: "drag_handle" }}
              size={22}
              tintColor={p.tertiary}
            />,
          )}
        </View>

        {/* Wrapping is only the fallback for large Dynamic Type; at default size this is one row. */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {PILLS.map((pill) => (
            <Pill
              key={pill}
              label={pillLabel(entry, pill, effort, i18n)}
              active={open === pill}
              muted={pill === "warmups" && entry.warmups === 0}
              warmup={pill === "warmups" && entry.warmups > 0}
              onPress={() => onPill(pill)}
            />
          ))}
        </View>

        {open && content ? (
          <Animated.View
            key={open}
            entering={PANEL_ENTER}
            style={{
              borderTopWidth: 0.5,
              borderTopColor: p.separator,
              paddingTop: 10,
              gap: spacing.md,
            }}
          >
            <PanelHeader
              title={content.title}
              closeLabel={open === PILLS.at(-1) ? t.routine.done : t.routine.close}
              onClose={onClose}
            />
            <ChipSections
              entry={entry}
              sections={content.sections}
              onPick={(patch, advances) => onPick(open, patch, advances)}
            />
          </Animated.View>
        ) : null}
      </View>
    </ReanimatedSwipeable>
  );
}

function Pill({
  label,
  active,
  muted,
  warmup,
  onPress,
}: {
  label: string;
  active: boolean;
  muted: boolean;
  warmup: boolean;
  onPress: () => void;
}) {
  const p = useColors();
  const background = active ? p.blue : warmup ? p.orangeTint : p.fill;
  const color = active ? p.onAccent : warmup ? p.orange : muted ? p.secondary : p.label;
  return (
    <PressableScale
      onPress={onPress}
      style={{
        height: 30,
        paddingHorizontal: 10,
        borderRadius: radii.control,
        borderCurve: "continuous",
        justifyContent: "center",
        backgroundColor: background,
      }}
    >
      <Text style={{ color, ...type.cell, fontWeight: "600", fontVariant: ["tabular-nums"] }}>
        {label}
      </Text>
    </PressableScale>
  );
}
