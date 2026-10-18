import { SymbolView } from "expo-symbols";
import { Suspense, useState } from "react";
import { FlatList, Modal, Platform, Pressable, Text, TextInput, View } from "react-native";

import { CustomExerciseSheet } from "@/components/custom-exercise-sheet";
import { EmptyMessage } from "@/components/empty-state";
import { ExerciseFilterMenu } from "@/components/exercise-filter-menu";
import { useDb } from "@/db/context";
import {
  type ExerciseListing,
  exerciseNamed,
  filterExercises,
  searchExercises,
  unhideExercise,
} from "@/db/exercises";
import { NO_FILTERS, anyFilterOn } from "@/lib/exercise/model";
import { type DoneAt, useDoneFilter, useExerciseLibrary } from "@/lib/exercise/use-exercises";
import { haptics } from "@/lib/haptics";
import { useI18n } from "@/lib/i18n";
import { useKeyboardHeight } from "@/lib/keyboard";
import { radii, spacing, type, useColors } from "@/lib/theme";

// The one Exercise picker, shared by the Ledger, the Routine editor and the library. When no
// Exercise has exactly the typed name, its first row creates one; when a Hidden Exercise does, it
// offers to unhide it instead. Either way the Exercise goes straight to whoever opened the picker.
// `marked` flags the Exercises the opener already holds, such as "In Routine". `doneAt` is where
// the Done filter reads history: the Workout's Gym in the Ledger, any Gym in the Routine editor.
type Marked = { ids: string[]; label: string };

export function ExercisePickerSheet({
  visible,
  title,
  marked,
  doneAt,
  onClose,
  onPick,
}: {
  visible: boolean;
  title: string;
  marked: Marked;
  doneAt: DoneAt;
  onClose: () => void;
  onPick: (exercise: ExerciseListing) => void;
}) {
  const p = useColors();
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: p.background }}>
        <Suspense fallback={null}>
          {/* Modal renders nothing while closed, so every opening starts with an empty search and
              no filters. */}
          <ExercisePicker
            title={title}
            marked={marked}
            doneAt={doneAt}
            onClose={onClose}
            onPick={onPick}
          />
        </Suspense>
      </View>
    </Modal>
  );
}

function ExercisePicker({
  title,
  marked,
  doneAt,
  onClose,
  onPick,
}: {
  title: string;
  marked: Marked;
  doneAt: DoneAt;
  onClose: () => void;
  onPick: (exercise: ExerciseListing) => void;
}) {
  const db = useDb();
  const p = useColors();
  const { t } = useI18n();
  const library = useExerciseLibrary();
  const done = useDoneFilter(doneAt);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState(NO_FILTERS);
  const [creating, setCreating] = useState<string | null>(null);
  const keyboardHeight = useKeyboardHeight();
  const name = query.trim();
  const exactMatch = exerciseNamed(library, query);
  const found = searchExercises(library, query);
  // Search reads only the displayed name, so an exact match on another language's name leads.
  const searched =
    exactMatch && !exactMatch.hidden && !found.includes(exactMatch)
      ? [exactMatch, ...found]
      : found;
  const matches = filterExercises(searched, filters, done?.exerciseIds ?? new Set());

  function pick(exercise: ExerciseListing) {
    haptics.light();
    onPick(exercise);
    onClose();
  }

  function unhide(exercise: ExerciseListing) {
    unhideExercise(db, exercise.id);
    pick({ ...exercise, hidden: false });
  }

  return (
    <>
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
        <Text style={{ color: p.label, ...type.headline }}>{title}</Text>
        <View style={{ width: 52 }} />
      </View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.sm,
          marginHorizontal: spacing.xl,
          marginBottom: spacing.md,
        }}
      >
        <View
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.sm,
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
        <ExerciseFilterMenu
          filters={filters}
          doneLabel={done?.label ?? null}
          onChange={setFilters}
        />
      </View>
      <FlatList
        data={matches}
        keyExtractor={(listing) => listing.id}
        // The search field autofocuses, so the keyboard is up from the start: a drag puts it down,
        // keeping the typed search. iOS insets the list by how far the keyboard overlaps the sheet,
        // which on iPad is less than its height; Android has no such inset, so it pads instead.
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={{
          paddingBottom: 40 + (Platform.OS === "android" ? keyboardHeight : 0),
        }}
        ListHeaderComponent={
          name && !exactMatch ? (
            <Row onPress={() => setCreating(name)}>
              <SymbolView
                name={{ ios: "plus.circle.fill", android: "add_circle" }}
                size={22}
                tintColor={p.blue}
              />
              <Text style={{ flex: 1, color: p.blue, ...type.body }}>
                {t.exercisePicker.create(name)}
              </Text>
            </Row>
          ) : exactMatch?.hidden ? (
            <Row onPress={() => unhide(exactMatch)}>
              <SymbolView
                name={{ ios: "eye.circle.fill", android: "visibility" }}
                size={22}
                tintColor={p.blue}
              />
              <Text style={{ flex: 1, color: p.blue, ...type.body }}>
                {t.exercisePicker.unhide(exactMatch.name)}
              </Text>
            </Row>
          ) : null
        }
        // The Create / Unhide row above ignores filters: it's about whether the typed name is taken.
        ListEmptyComponent={
          anyFilterOn(filters) ? (
            <View style={{ padding: spacing.xxl }}>
              <EmptyMessage
                message={t.exerciseFilters.noMatches}
                action={{ label: t.exerciseFilters.clear, onPress: () => setFilters(NO_FILTERS) }}
              />
            </View>
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
            {marked.ids.includes(item.id) ? (
              <Text style={{ color: p.secondary, ...type.footnote }}>{marked.label}</Text>
            ) : null}
          </Row>
        )}
      />
      <CustomExerciseSheet name={creating} onClose={() => setCreating(null)} onSave={pick} />
    </>
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
