import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import Animated, { FadeIn } from "react-native-reanimated";

import { PressableScale } from "@/components/pressable-scale";
import { ENTER_EASING } from "@/lib/motion";
import { usePalette } from "@/lib/palette";
import { useEffort } from "@/lib/workout/effort";
import {
  REP_PRESETS,
  RIR_PRESETS,
  type RoutineExercise,
  type RoutineExercisePatch,
  SET_PRESETS,
  WARMUP_PRESETS,
  formatWarmups,
} from "@/lib/routine/model";
import { type Effort, formatEffortRange, formatRange, formatVolume } from "@/lib/workout/model";

import { RestPicker } from "./rest-picker";
import { type ChipSection, ChipSections, PanelHeader } from "./target-panel";

// Sets and reps share one pill, so the row reads like the Ledger's "Target 3 × 5–7" line.
export type TargetPill = "warmups" | "volume" | "effort";
export const PILLS: TargetPill[] = ["warmups", "volume", "effort"];

const PANEL_ENTER = FadeIn.duration(180).easing(ENTER_EASING);
const DESTRUCTIVE = "#FF3B30";

function pillLabel(entry: RoutineExercise, pill: TargetPill, effort: Effort) {
  switch (pill) {
    case "warmups":
      return formatWarmups(entry.warmups);
    case "volume":
      return formatVolume(entry.target);
    case "effort":
      return `${effort} ${formatEffortRange(entry.target.rirMin, entry.target.rirMax, effort)}`;
  }
}

function panel(entry: RoutineExercise, pill: TargetPill, effort: Effort) {
  const { target } = entry;
  switch (pill) {
    case "warmups":
      return {
        title: "Warm-up sets",
        sections: [
          {
            title: "Warm-up sets",
            advances: true,
            chips: WARMUP_PRESETS.map((n) => ({
              label: n === 0 ? "None" : `${n}`,
              selected: entry.warmups === n,
              patch: { warmups: n },
            })),
          },
        ] satisfies ChipSection[],
      };
    case "volume":
      // Sets stays open so both halves can be picked; the rep range is what moves on.
      return {
        title: "Working sets × reps",
        sections: [
          {
            title: "Sets",
            advances: false,
            chips: SET_PRESETS.map((n) => ({
              label: `${n}`,
              selected: target.sets === n,
              patch: { sets: n },
            })),
          },
          {
            title: "Reps",
            advances: true,
            customReps: true,
            chips: REP_PRESETS.map(([min, max]) => ({
              label: formatRange(min, max),
              selected: target.repMin === min && target.repMax === max,
              patch: { repMin: min, repMax: max },
            })),
          },
        ] satisfies ChipSection[],
      };
    case "effort":
      return {
        title: `Effort (${effort})`,
        sections: [
          {
            title: effort,
            advances: true,
            chips: RIR_PRESETS.map(([min, max]) => ({
              label: formatEffortRange(min, max, effort),
              selected: target.rirMin === min && target.rirMax === max,
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
  onPick: (pill: TargetPill, patch: RoutineExercisePatch, advances: boolean) => void;
  onClose: () => void;
  onChange: (patch: RoutineExercisePatch) => void;
  onRemove: () => void;
}) {
  const p = usePalette();
  const effort = useEffort();
  const content = open ? panel(entry, open, effort) : null;

  return (
    <ReanimatedSwipeable
      friction={1.5}
      rightThreshold={60}
      overshootRight={false}
      renderRightActions={() => (
        <Pressable
          onPress={onRemove}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${entry.exercise.name}`}
          style={{
            width: 88,
            marginLeft: 8,
            borderRadius: 14,
            borderCurve: "continuous",
            backgroundColor: DESTRUCTIVE,
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
          }}
        >
          <Ionicons name="trash" size={18} color="#FFFFFF" />
          <Text style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "600" }}>Remove</Text>
        </Pressable>
      )}
    >
      <View
        style={{
          backgroundColor: p.card,
          borderRadius: 14,
          borderCurve: "continuous",
          padding: 12,
          gap: 10,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ flex: 1, gap: 3 }}>
            <Text numberOfLines={1} style={{ color: p.label, fontSize: 16, fontWeight: "600" }}>
              {entry.exercise.name}
            </Text>
            <RestPicker
              seconds={entry.restSeconds}
              onChange={(restSeconds) => onChange({ restSeconds })}
            />
          </View>
          {handle(<Ionicons name="reorder-three" size={24} color={p.tertiary} />)}
        </View>

        {/* Wrapping is only the fallback for large Dynamic Type; at default size this is one row. */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {PILLS.map((pill) => (
            <Pill
              key={pill}
              label={pillLabel(entry, pill, effort)}
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
            style={{ borderTopWidth: 0.5, borderTopColor: p.separator, paddingTop: 10, gap: 8 }}
          >
            <PanelHeader
              title={content.title}
              closeLabel={open === PILLS.at(-1) ? "Done" : "Close"}
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
  const p = usePalette();
  const background = active ? p.blue : warmup ? p.orangeTint : p.fill;
  const color = active ? p.onAccent : warmup ? p.orange : muted ? p.secondary : p.label;
  return (
    <PressableScale
      onPress={onPress}
      style={{
        height: 30,
        paddingHorizontal: 10,
        borderRadius: 8,
        borderCurve: "continuous",
        justifyContent: "center",
        backgroundColor: background,
      }}
    >
      <Text style={{ color, fontSize: 14, fontWeight: "600", fontVariant: ["tabular-nums"] }}>
        {label}
      </Text>
    </PressableScale>
  );
}
