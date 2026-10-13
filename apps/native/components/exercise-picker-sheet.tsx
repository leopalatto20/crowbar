import { SymbolView } from "expo-symbols";
import { useState } from "react";
import { FlatList, Modal, Pressable, Text, TextInput, View } from "react-native";

import {
  type ExerciseSummary,
  SAMPLE_LIBRARY,
  makeExerciseId,
} from "@/lib/exercise/sample-library";
import { haptics } from "@/lib/haptics";
import { useI18n } from "@/lib/i18n";
import { radii, spacing, type, useColors } from "@/lib/theme";

// Minimal form of the shared Exercise picker from #13: search, tap to add, and a "Create" row
// when nothing matches exactly.
export function ExercisePickerSheet({
  visible,
  inRoutine,
  onClose,
  onPick,
}: {
  visible: boolean;
  inRoutine: string[];
  onClose: () => void;
  onPick: (exercise: ExerciseSummary) => void;
}) {
  const p = useColors();
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const matches = SAMPLE_LIBRARY.filter((ex) => ex.name.toLowerCase().includes(q));
  const exact = SAMPLE_LIBRARY.some((ex) => ex.name.toLowerCase() === q);

  function pick(exercise: ExerciseSummary) {
    haptics.light();
    setQuery("");
    onPick(exercise);
    onClose();
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: p.background }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: spacing.xl,
            paddingTop: spacing.xl,
            paddingBottom: 10,
          }}
        >
          <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button">
            <Text style={{ color: p.blue, ...type.body }}>{t.exercisePicker.cancel}</Text>
          </Pressable>
          <Text style={{ color: p.label, ...type.headline }}>{t.exercisePicker.title}</Text>
          <View style={{ width: 52 }} />
        </View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.sm,
            marginHorizontal: spacing.xl,
            marginBottom: spacing.md,
            paddingHorizontal: 10,
            height: 36,
            borderRadius: radii.field,
            borderCurve: "continuous",
            backgroundColor: p.fill,
          }}
        >
          <SymbolView
            name={{ ios: "magnifyingglass", android: "search" }}
            size={16}
            tintColor={p.secondary}
          />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t.exercisePicker.search}
            autoFocus
            placeholderTextColor={p.secondary}
            autoCorrect={false}
            returnKeyType="search"
            style={{ flex: 1, color: p.label, ...type.body, padding: 0 }}
          />
        </View>
        <FlatList
          data={matches}
          keyExtractor={(ex) => ex.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 40 }}
          ListHeaderComponent={
            q && !exact ? (
              <Row
                onPress={() =>
                  pick({ id: makeExerciseId(), name: query.trim(), muscleGroup: null })
                }
              >
                <SymbolView
                  name={{ ios: "plus.circle.fill", android: "add_circle" }}
                  size={22}
                  tintColor={p.blue}
                />
                <Text style={{ flex: 1, color: p.blue, ...type.body }}>
                  {t.exercisePicker.create(query.trim())}
                </Text>
              </Row>
            ) : null
          }
          renderItem={({ item }) => (
            <Row onPress={() => pick(item)}>
              <View style={{ flex: 1, gap: spacing.xxs }}>
                <Text style={{ color: p.label, ...type.body }}>{item.name}</Text>
                {item.muscleGroup ? (
                  <Text style={{ color: p.secondary, ...type.footnote }}>
                    {t.muscleGroup[item.muscleGroup]}
                  </Text>
                ) : null}
              </View>
              {inRoutine.includes(item.id) ? (
                <Text style={{ color: p.secondary, ...type.footnote }}>
                  {t.exercisePicker.inRoutine}
                </Text>
              ) : null}
            </Row>
          )}
        />
      </View>
    </Modal>
  );
}

function Row({ children, onPress }: { children: React.ReactNode; onPress: () => void }) {
  const p = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        minHeight: 56,
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: pressed ? p.fill : "transparent",
        borderBottomWidth: 0.5,
        borderBottomColor: p.separator,
      })}
    >
      {children}
    </Pressable>
  );
}
