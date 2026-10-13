import { Stack } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import { LayoutAnimationConfig } from "react-native-reanimated";

import { ExercisePickerSheet } from "@/components/exercise-picker-sheet";
import { PressableScale } from "@/components/pressable-scale";
import { ReorderableList } from "@/components/reorderable-list";
import { haptics } from "@/lib/haptics";
import { useI18n } from "@/lib/i18n";
import { type RoutineExercisePatch, newRoutineExercise } from "@/lib/routine/model";
import { useRoutine } from "@/lib/routine/use-routine";
import { radii, spacing, type, useColors } from "@/lib/theme";

import { PILLS, RoutineExerciseCard, type TargetPill } from "./routine-exercise-card";

export function RoutineEditor() {
  const p = useColors();
  const { t } = useI18n();
  const routine = useRoutine();
  const [open, setOpen] = useState<{ id: string; pill: TargetPill } | null>(null);
  const [picking, setPicking] = useState(false);
  const workingSets = routine.exercises.reduce((n, e) => n + e.target.sets, 0);

  // Picking a value moves straight on to the next pill, so a whole Target takes a few taps.
  function pick(id: string, pill: TargetPill, patch: RoutineExercisePatch, advances: boolean) {
    haptics.selection();
    routine.update(id, patch);
    if (!advances) return;
    const next = PILLS[PILLS.indexOf(pill) + 1];
    setOpen(next ? { id, pill: next } : null);
  }

  return (
    <View style={{ flex: 1, backgroundColor: p.background }}>
      <Stack.Screen options={{ title: routine.name || t.routine.untitled }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={{ padding: spacing.xl, paddingBottom: 80, gap: spacing.lg }}
      >
        <View style={{ gap: spacing.xs }}>
          <TextInput
            value={routine.name}
            onChangeText={routine.setName}
            placeholder={t.routine.namePlaceholder}
            placeholderTextColor={p.tertiary}
            style={{ color: p.label, ...type.title, padding: 0 }}
          />
          <Text style={{ color: p.secondary, ...type.footnote }}>
            {t.routine.summary(routine.exercises.length, workingSets)}
          </Text>
        </View>

        <LayoutAnimationConfig skipEntering>
          <ReorderableList
            items={routine.exercises}
            keyOf={(e) => e.id}
            gap={spacing.md}
            onReorder={routine.reorder}
            renderItem={(entry, handle) => {
              const pill = open?.id === entry.id ? open.pill : null;
              return (
                <RoutineExerciseCard
                  entry={entry}
                  open={pill}
                  handle={handle}
                  onPill={(next) => setOpen(pill === next ? null : { id: entry.id, pill: next })}
                  onPick={(from, patch, advances) => pick(entry.id, from, patch, advances)}
                  onClose={() => setOpen(null)}
                  onChange={(patch) => routine.update(entry.id, patch)}
                  onRemove={() => routine.remove(entry.id)}
                />
              );
            }}
          />
        </LayoutAnimationConfig>

        <PressableScale
          onPress={() => setPicking(true)}
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
          <Text style={{ color: p.blue, ...type.headline }}>{t.routine.addExercise}</Text>
        </PressableScale>
      </ScrollView>

      <ExercisePickerSheet
        visible={picking}
        inRoutine={routine.exercises.map((e) => e.exercise.id)}
        onClose={() => setPicking(false)}
        onPick={(exercise) => {
          const entry = newRoutineExercise(exercise);
          routine.add(entry);
          // A new Exercise opens on its first pill so its Target can be set right away.
          setOpen({ id: entry.id, pill: PILLS[0] });
        }}
      />
    </View>
  );
}
