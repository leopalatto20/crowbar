import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import { LayoutAnimationConfig } from "react-native-reanimated";

import { ExercisePickerSheet } from "@/components/exercise-picker-sheet";
import { PressableScale } from "@/components/pressable-scale";
import { ReorderableList } from "@/components/reorderable-list";
import { haptics } from "@/lib/haptics";
import { usePalette } from "@/lib/palette";
import { type RoutineExercisePatch, newRoutineExercise } from "@/lib/routine/model";
import { useRoutine } from "@/lib/routine/use-routine";

import { PILLS, RoutineExerciseCard, type TargetPill } from "./routine-exercise-card";

export function RoutineEditor() {
  const p = usePalette();
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
      <Stack.Screen options={{ title: routine.name || "New Routine" }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={{ padding: 16, paddingBottom: 80, gap: 12 }}
      >
        <View style={{ gap: 4 }}>
          <TextInput
            value={routine.name}
            onChangeText={routine.setName}
            placeholder="Routine name"
            placeholderTextColor={p.tertiary}
            style={{ color: p.label, fontSize: 28, fontWeight: "700", padding: 0 }}
          />
          <Text style={{ color: p.secondary, fontSize: 13 }}>
            {routine.exercises.length} exercises · {workingSets} working sets
          </Text>
        </View>

        <LayoutAnimationConfig skipEntering>
          <ReorderableList
            items={routine.exercises}
            keyOf={(e) => e.id}
            gap={8}
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
            borderRadius: 14,
            borderCurve: "continuous",
            borderWidth: 1,
            borderStyle: "dashed",
            borderColor: p.separator,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 6,
          }}
        >
          <Ionicons name="add" size={20} color={p.blue} />
          <Text style={{ color: p.blue, fontSize: 17, fontWeight: "600" }}>Add Exercise</Text>
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
