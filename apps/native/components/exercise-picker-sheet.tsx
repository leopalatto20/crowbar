import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { FlatList, Modal, Pressable, Text, TextInput, View } from "react-native";

import { haptics } from "@/lib/haptics";
import { usePalette } from "@/lib/palette";

import {
  type ExerciseSummary,
  SAMPLE_LIBRARY,
  makeExerciseId,
} from "@/lib/exercise/sample-library";

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
  const p = usePalette();
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
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: 10,
          }}
        >
          <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button">
            <Text style={{ color: p.blue, fontSize: 17 }}>Cancel</Text>
          </Pressable>
          <Text style={{ color: p.label, fontSize: 17, fontWeight: "600" }}>Add Exercise</Text>
          <View style={{ width: 52 }} />
        </View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            marginHorizontal: 16,
            marginBottom: 8,
            paddingHorizontal: 10,
            height: 36,
            borderRadius: 10,
            borderCurve: "continuous",
            backgroundColor: p.fill,
          }}
        >
          <Ionicons name="search" size={16} color={p.secondary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search exercises"
            autoFocus
            placeholderTextColor={p.secondary}
            autoCorrect={false}
            returnKeyType="search"
            style={{ flex: 1, color: p.label, fontSize: 17, padding: 0 }}
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
                  pick({ id: makeExerciseId(), name: query.trim(), muscleGroup: "Other" })
                }
              >
                <Ionicons name="add-circle" size={22} color={p.blue} />
                <Text style={{ flex: 1, color: p.blue, fontSize: 17 }}>
                  Create “{query.trim()}”
                </Text>
              </Row>
            ) : null
          }
          renderItem={({ item }) => (
            <Row onPress={() => pick(item)}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ color: p.label, fontSize: 17 }}>{item.name}</Text>
                <Text style={{ color: p.secondary, fontSize: 13 }}>{item.muscleGroup}</Text>
              </View>
              {inRoutine.includes(item.id) ? (
                <Text style={{ color: p.secondary, fontSize: 13 }}>In Routine</Text>
              ) : null}
            </Row>
          )}
        />
      </View>
    </Modal>
  );
}

function Row({ children, onPress }: { children: React.ReactNode; onPress: () => void }) {
  const p = usePalette();
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
