import { Stack, useNavigation } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect, useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import { LayoutAnimationConfig } from "react-native-reanimated";

import { ExercisePickerSheet } from "@/components/exercise-picker-sheet";
import { PressableScale } from "@/components/pressable-scale";
import { ReorderableList } from "@/components/reorderable-list";
import { useDb } from "@/db/context";
import {
  type RoutineDetail,
  type TargetsChange,
  addRoutineExercise,
  discardBlankRoutine,
  removeRoutineExercise,
  renameRoutine,
  reorderRoutineExercises,
  swapRoutineExercise,
  updateRoutineExercise,
} from "@/db/routines";
import { haptics } from "@/lib/haptics";
import { useI18n } from "@/lib/i18n";
import { useRoutine } from "@/lib/routine/use-routine";
import { radii, spacing, type, useColors } from "@/lib/theme";

import { PILLS, RoutineExerciseCard, type TargetPill } from "./routine-exercise-card";

export function RoutineEditor({ id }: { id: string }) {
  const db = useDb();
  const routine = useRoutine(id);
  const navigation = useNavigation();

  useEffect(
    () => navigation.addListener("beforeRemove", () => discardBlankRoutine(db, id)),
    [navigation, db, id],
  );

  return routine ? <Editor routine={routine} /> : null;
}

type Picking = { purpose: "add" } | { purpose: "swap"; routineExerciseId: string };

// Every edit writes straight to SQLite, so nothing is lost if the app is killed mid-edit.
function Editor({ routine }: { routine: RoutineDetail }) {
  const db = useDb();
  const p = useColors();
  const { t } = useI18n();
  // Kept locally so the field never lags behind the keyboard waiting on a re-read.
  const [name, setName] = useState(routine.name);
  const [open, setOpen] = useState<{ id: string; pill: TargetPill } | null>(null);
  const [picking, setPicking] = useState<Picking | null>(null);
  const workingSets = routine.exercises.reduce((n, e) => n + (e.sets ?? 0), 0);

  function rename(next: string) {
    setName(next);
    renameRoutine(db, routine.id, next);
  }

  // Picking a value moves straight on to the next pill, so a whole Target takes a few taps.
  function pick(id: string, pill: TargetPill, patch: TargetsChange, advances: boolean) {
    haptics.selection();
    updateRoutineExercise(db, id, patch);
    if (!advances) return;
    const next = PILLS[PILLS.indexOf(pill) + 1];
    setOpen(next ? { id, pill: next } : null);
  }

  return (
    <View style={{ flex: 1, backgroundColor: p.background }}>
      <Stack.Screen options={{ title: name.trim() || t.routine.untitled }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={{ padding: spacing.xl, paddingBottom: 80, gap: spacing.lg }}
      >
        <View style={{ gap: spacing.xs }}>
          <TextInput
            value={name}
            onChangeText={rename}
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
            onReorder={(ids) => reorderRoutineExercises(db, ids)}
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
                  onChange={(patch) => updateRoutineExercise(db, entry.id, patch)}
                  onSwap={() => setPicking({ purpose: "swap", routineExerciseId: entry.id })}
                  onRemove={() => removeRoutineExercise(db, entry.id)}
                />
              );
            }}
          />
        </LayoutAnimationConfig>

        <PressableScale
          onPress={() => setPicking({ purpose: "add" })}
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
        title={picking?.purpose === "swap" ? t.routine.swap : t.exercisePicker.title}
        visible={picking !== null}
        marked={{
          ids: routine.exercises.map((e) => e.exercise.id),
          label: t.exercisePicker.inRoutine,
        }}
        doneAt="anyGym"
        onClose={() => setPicking(null)}
        onPick={(exercise) => {
          if (picking?.purpose === "swap") {
            swapRoutineExercise(db, picking.routineExerciseId, exercise.id);
            return;
          }
          const added = addRoutineExercise(db, routine.id, exercise.id);
          // A new Exercise opens on its first pill so its Target can be set right away.
          setOpen({ id: added, pill: PILLS[0] });
        }}
      />
    </View>
  );
}
