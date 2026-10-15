import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Suspense, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { NamePrompt } from "@/components/name-prompt";
import { useDb } from "@/db/context";
import { createGym } from "@/db/gyms";
import { changeWorkoutGym } from "@/db/workouts";
import { useGyms } from "@/lib/gym/use-gyms";
import { haptics } from "@/lib/haptics";
import { useI18n } from "@/lib/i18n";
import { spacing, type, useColors } from "@/lib/theme";
import { useCurrentWorkout } from "@/lib/workout/use-workout";

export default function GymPickerSheet() {
  return (
    <Suspense fallback={null}>
      <GymPicker />
    </Suspense>
  );
}

// Picking or adding a Gym applies it to the Workout in progress straight away.
function GymPicker() {
  const db = useDb();
  const router = useRouter();
  const p = useColors();
  const { t } = useI18n();
  const ledger = useCurrentWorkout();
  const gyms = useGyms();
  const [naming, setNaming] = useState(false);
  if (!ledger) return null;
  const { id: workoutId, gymId: currentGymId } = ledger;

  function pick(gymId: string) {
    haptics.light();
    if (gymId !== currentGymId) changeWorkoutGym(db, workoutId, gymId);
    router.back();
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
            onPress={() => pick(gym.id)}
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
          pick(createGym(db, name));
        }}
        onDismiss={() => setNaming(false)}
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
