import { useLocalSearchParams, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Suspense, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { NamePrompt } from "@/components/name-prompt";
import { useDb } from "@/db/context";
import { createGym } from "@/db/gyms";
import { type Relabel, changeWorkoutGym, listGymChangeRelabels } from "@/db/workouts";
import { useGyms } from "@/lib/gym/use-gyms";
import { haptics } from "@/lib/haptics";
import { useI18n } from "@/lib/i18n";
import { spacing, type, useColors } from "@/lib/theme";
import { useWorkout } from "@/lib/workout/use-workout";

export default function GymPickerSheet() {
  return (
    <Suspense fallback={null}>
      <GymPicker />
    </Suspense>
  );
}

type Move = { gymId: string; gymName: string; relabels: Relabel[] };

// Picking or adding a Gym applies it to the Workout straight away, unless logged numbers would
// read in another unit at the new Gym: that needs the lifter to agree first.
function GymPicker() {
  const db = useDb();
  const router = useRouter();
  const p = useColors();
  const { t, language } = useI18n();
  const { workoutId } = useLocalSearchParams<{ workoutId: string }>();
  const ledger = useWorkout(workoutId);
  const gyms = useGyms();
  const [naming, setNaming] = useState(false);
  const [confirming, setConfirming] = useState<Move | null>(null);
  if (!ledger) return null;
  const currentGymId = ledger.gymId;
  // A correction to history has no haptics.
  const live = ledger.finishedAt === null;

  function move(gymId: string) {
    changeWorkoutGym(db, workoutId, gymId);
    router.back();
  }

  function pick(gymId: string, gymName: string) {
    if (live) haptics.light();
    if (gymId === currentGymId) {
      router.back();
      return;
    }
    const relabels = listGymChangeRelabels(db, workoutId, gymId, language);
    if (relabels.length > 0) setConfirming({ gymId, gymName, relabels });
    else move(gymId);
  }

  return (
    <View style={{ paddingTop: spacing.xxl, paddingBottom: spacing.xl }}>
      <Text
        style={{
          color: p.label,
          ...type.headline,
          paddingHorizontal: spacing.xxl,
          paddingBottom: spacing.md,
        }}
      >
        {t.gymPicker.title}
      </Text>
      {gyms.map((gym) => {
        const current = gym.id === currentGymId;
        return (
          <Row
            key={gym.id}
            onPress={() => pick(gym.id, gym.name)}
            accessibilityLabel={current ? `${gym.name}, ${t.gymPicker.current}` : undefined}
          >
            <Text style={{ flex: 1, color: p.label, ...type.body }}>{gym.name}</Text>
            {current && (
              <SymbolView
                name={{ ios: "checkmark", android: "check" }}
                size={17}
                weight="semibold"
                tintColor={p.blue}
              />
            )}
          </Row>
        );
      })}
      <Row onPress={() => setNaming(true)}>
        <SymbolView
          name={{ ios: "plus.circle.fill", android: "add_circle" }}
          size={22}
          tintColor={p.blue}
        />
        <Text style={{ flex: 1, color: p.blue, ...type.body }}>{t.gymPicker.newGym}</Text>
      </Row>
      <NamePrompt
        visible={naming}
        title={t.gymPrompt.newGymTitle}
        placeholder={t.gymPrompt.placeholder}
        message={t.gymPrompt.message}
        confirmLabel={t.gymPrompt.add}
        onSave={(name) => {
          setNaming(false);
          pick(createGym(db, name), name);
        }}
        onDismiss={() => setNaming(false)}
      />
      <ConfirmDialog
        visible={confirming !== null}
        title={t.gymPicker.moveTitle(confirming?.gymName ?? "")}
        message={t.gymPicker.relabelMessage(
          (confirming?.relabels ?? []).map(({ exerciseName, from, to }) => ({
            exerciseName,
            from: t.unitName[from],
            to: t.unitName[to],
          })),
        )}
        confirmLabel={t.gymPicker.move}
        cancelLabel={t.gymPicker.cancel}
        onConfirm={() => {
          // Not `confirming!`: the React Compiler reads a non-null-asserted path during render,
          // where `confirming` is still null.
          if (!confirming) return;
          setConfirming(null);
          move(confirming.gymId);
        }}
        onDismiss={() => setConfirming(null)}
      />
    </View>
  );
}

function Row({
  children,
  onPress,
  accessibilityLabel,
}: {
  children: React.ReactNode;
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  const p = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        minHeight: 50,
        paddingHorizontal: spacing.xxl,
        backgroundColor: pressed ? p.fill : "transparent",
      })}
    >
      {children}
    </Pressable>
  );
}
