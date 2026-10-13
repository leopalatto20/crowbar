import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { PressableScale } from "@/components/pressable-scale";
import { usePalette } from "@/lib/palette";
import type { RoutineExercise, RoutineExercisePatch } from "@/lib/routine/model";

export type ChipSpec = { label: string; selected: boolean; patch: RoutineExercisePatch };

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
  const p = usePalette();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Text
        numberOfLines={1}
        style={{
          flex: 1,
          color: p.secondary,
          fontSize: 11,
          fontWeight: "600",
          textTransform: "uppercase",
          letterSpacing: 0.4,
        }}
      >
        {title}
      </Text>
      <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button">
        <Text style={{ color: p.blue, fontSize: 15, fontWeight: "600" }}>{closeLabel}</Text>
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
  onPick: (patch: RoutineExercisePatch, advances: boolean) => void;
}) {
  const p = usePalette();
  const [custom, setCustom] = useState(false);
  const labeled = sections.length > 1;

  return (
    <View style={{ gap: 10 }}>
      {sections.map((section) => (
        <View key={section.title} style={{ gap: 6 }}>
          {labeled ? (
            <Text style={{ color: p.secondary, fontSize: 13 }}>{section.title}</Text>
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
              contentContainerStyle={{ gap: 6 }}
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
                <Chip label="Custom…" selected={false} onPress={() => setCustom(true)} />
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
  const p = usePalette();
  return (
    <PressableScale
      onPress={onPress}
      style={{
        minWidth: 44,
        height: 36,
        paddingHorizontal: 12,
        borderRadius: 18,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: selected ? p.blueTint : p.fill,
      }}
    >
      <Text
        style={{
          color: selected ? p.blue : p.label,
          fontSize: 15,
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
  const p = usePalette();
  const [min, setMin] = useState(String(entry.target.repMin));
  const [max, setMax] = useState(String(entry.target.repMax));
  const a = Number.parseInt(min, 10);
  const b = Number.parseInt(max, 10) || a;
  const valid = a > 0 && b > 0;

  const field = {
    keyboardType: "number-pad" as const,
    selectTextOnFocus: true,
    style: {
      width: 64,
      height: 36,
      borderRadius: 8,
      borderCurve: "continuous" as const,
      backgroundColor: p.fill,
      textAlign: "center" as const,
      color: p.label,
      fontSize: 17,
      fontWeight: "600" as const,
      fontVariant: ["tabular-nums" as const],
      padding: 0,
    },
  };

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <TextInput
        {...field}
        value={min}
        onChangeText={setMin}
        autoFocus
        accessibilityLabel="Minimum reps"
      />
      <Text style={{ color: p.secondary }}>to</Text>
      <TextInput {...field} value={max} onChangeText={setMax} accessibilityLabel="Maximum reps" />
      <View style={{ flex: 1 }} />
      <PressableScale
        onPress={() => valid && onDone(Math.min(a, b), Math.max(a, b))}
        disabled={!valid}
        style={{
          height: 36,
          paddingHorizontal: 14,
          borderRadius: 18,
          justifyContent: "center",
          backgroundColor: valid ? p.blue : p.fill,
        }}
      >
        <Text style={{ color: valid ? p.onAccent : p.secondary, fontSize: 15, fontWeight: "600" }}>
          Set
        </Text>
      </PressableScale>
    </View>
  );
}
