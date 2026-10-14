import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { PressableScale } from "@/components/pressable-scale";
import type { RoutineExercise, TargetsChange } from "@/db/routines";
import { useI18n } from "@/lib/i18n";
import { radii, spacing, type, useColors } from "@/lib/theme";

export type ChipSpec = { label: string; selected: boolean; patch: TargetsChange };

// One group of chips in a panel. Picking from an advancing section moves on to the next pill.
export type ChipSection = {
  title: string;
  chips: ChipSpec[];
  advances: boolean;
  customReps?: boolean;
};

export function PanelHeader({
  title,
  closeLabel,
  onClose,
}: {
  title: string;
  closeLabel: string;
  onClose: () => void;
}) {
  const p = useColors();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
      <Text numberOfLines={1} style={{ flex: 1, color: p.secondary, ...type.columnHeader }}>
        {title}
      </Text>
      <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button">
        <Text style={{ color: p.blue, ...type.subheadline, fontWeight: "600" }}>{closeLabel}</Text>
      </Pressable>
    </View>
  );
}

export function ChipSections({
  entry,
  sections,
  onPick,
}: {
  entry: RoutineExercise;
  sections: ChipSection[];
  onPick: (patch: TargetsChange, advances: boolean) => void;
}) {
  const p = useColors();
  const { t } = useI18n();
  const [custom, setCustom] = useState(false);
  const labeled = sections.length > 1;

  return (
    <View style={{ gap: 10 }}>
      {sections.map((section) => (
        <View key={section.title} style={{ gap: spacing.sm }}>
          {labeled ? (
            <Text style={{ color: p.secondary, ...type.footnote }}>{section.title}</Text>
          ) : null}
          {custom && section.customReps ? (
            <CustomReps
              entry={entry}
              onDone={(repMin, repMax) => {
                setCustom(false);
                onPick({ repMin, repMax }, section.advances);
              }}
            />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ gap: spacing.sm }}
            >
              {section.chips.map((chip) => (
                <Chip
                  key={chip.label}
                  label={chip.label}
                  selected={chip.selected}
                  onPress={() => onPick(chip.patch, section.advances)}
                />
              ))}
              {section.customReps ? (
                <Chip
                  label={t.routine.customReps}
                  selected={false}
                  onPress={() => setCustom(true)}
                />
              ) : null}
            </ScrollView>
          )}
        </View>
      ))}
    </View>
  );
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const p = useColors();
  return (
    <PressableScale
      onPress={onPress}
      style={{
        minWidth: 44,
        height: 36,
        paddingHorizontal: spacing.lg,
        borderRadius: radii.pill,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: selected ? p.blueTint : p.fill,
      }}
    >
      <Text
        style={{
          color: selected ? p.blue : p.label,
          ...type.subheadline,
          fontWeight: selected ? "700" : "500",
          fontVariant: ["tabular-nums"],
        }}
      >
        {label}
      </Text>
    </PressableScale>
  );
}

function CustomReps({
  entry,
  onDone,
}: {
  entry: RoutineExercise;
  onDone: (repMin: number, repMax: number) => void;
}) {
  const p = useColors();
  const { t } = useI18n();
  const [min, setMin] = useState(String(entry.repMin ?? ""));
  const [max, setMax] = useState(String(entry.repMax ?? ""));
  const a = Number.parseInt(min, 10);
  const b = Number.parseInt(max, 10) || a;
  const valid = a > 0 && b > 0;

  const field = {
    keyboardType: "number-pad" as const,
    selectTextOnFocus: true,
    style: {
      width: 64,
      height: 36,
      borderRadius: radii.control,
      borderCurve: "continuous" as const,
      backgroundColor: p.fill,
      textAlign: "center" as const,
      color: p.label,
      ...type.body,
      fontWeight: "600" as const,
      fontVariant: ["tabular-nums" as const],
      padding: 0,
    },
  };

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
      <TextInput
        {...field}
        value={min}
        onChangeText={setMin}
        autoFocus
        accessibilityLabel={t.routine.minReps}
      />
      <Text style={{ color: p.secondary }}>{t.routine.repRangeTo}</Text>
      <TextInput
        {...field}
        value={max}
        onChangeText={setMax}
        accessibilityLabel={t.routine.maxReps}
      />
      <View style={{ flex: 1 }} />
      <PressableScale
        onPress={() => valid && onDone(Math.min(a, b), Math.max(a, b))}
        disabled={!valid}
        style={{
          height: 36,
          paddingHorizontal: 14,
          borderRadius: radii.pill,
          justifyContent: "center",
          backgroundColor: valid ? p.blue : p.fill,
        }}
      >
        <Text
          style={{
            color: valid ? p.onAccent : p.secondary,
            ...type.subheadline,
            fontWeight: "600",
          }}
        >
          {t.routine.setReps}
        </Text>
      </PressableScale>
    </View>
  );
}
