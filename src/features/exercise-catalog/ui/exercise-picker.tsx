import { useRef, useState, type ComponentRef } from "react";
import { AccessibilityInfo, ScrollView, SectionList, StyleSheet, type TextInput } from "react-native";
import { useTranslation } from "react-i18next";

import { Button, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { Input, InputField } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

import { useExerciseCatalog } from "../exercise-catalog-provider";
import { muscleGroupOrder, type ExerciseId, type MuscleGroup } from "../model/catalog";
import { groupCatalogExercises } from "../model/catalog-selectors";
import { CustomExerciseForm } from "./custom-exercise-form";

export type ExercisePickerProps = Readonly<{
  selectedId: ExerciseId | null;
  onSelect: (id: ExerciseId) => void;
}>;

export function ExercisePicker({ selectedId, onSelect }: ExercisePickerProps): React.JSX.Element {
  const { t } = useTranslation();
  const { state, listAvailable, retryLoad } = useExerciseCatalog();
  const [query, setQuery] = useState("");
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup | null>(null);
  const [creating, setCreating] = useState(false);
  const [hasDurableCatalog, setHasDurableCatalog] = useState(false);
  const [previousStatus, setPreviousStatus] = useState(state.status);
  const searchRef = useRef<TextInput>(null);
  const createRef = useRef<ComponentRef<typeof Button>>(null);
  const busy = state.status === "mutating";
  const sections = groupCatalogExercises(listAvailable(query, muscleGroup)).map((group) => ({
    ...group,
    data: group.exercises,
  }));

  const focusControl = (control: ComponentRef<typeof Button> | null | undefined): void => {
    if (control) {
      AccessibilityInfo.sendAccessibilityEvent(
        control as unknown as Parameters<typeof AccessibilityInfo.sendAccessibilityEvent>[0],
        "focus",
      );
    }
  };

  if (state.status !== previousStatus) {
    setPreviousStatus(state.status);
    if (state.status === "ready" && !hasDurableCatalog) {
      setHasDurableCatalog(true);
    }
  }

  if (state.status === "loading" && !hasDurableCatalog) {
    return (
      <VStack accessibilityLabel={t("exerciseCatalog.accessibility.loading")} testID="picker-loading">
        <Spinner />
        <Text>{t("exerciseCatalog.accessibility.loading")}</Text>
      </VStack>
    );
  }

  if (state.status === "load-error" && !hasDurableCatalog) {
    return (
      <VStack accessibilityRole="alert" testID="picker-load-error">
        <Text>{t("exerciseCatalog.errors.loadFailed")}</Text>
        <Button onPress={retryLoad} style={styles.control} testID="picker-retry">
          <ButtonText>{t("exerciseCatalog.controls.retry")}</ButtonText>
        </Button>
      </VStack>
    );
  }

  return (
    <SectionList
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      keyExtractor={(exercise) => exercise.id}
      ListHeaderComponent={
        <VStack style={styles.header}>
          <Input className="min-h-11" isDisabled={busy}>
            <InputField
              ref={searchRef}
              accessibilityLabel={t("exerciseCatalog.controls.searchLabel")}
              allowFontScaling
              onChangeText={setQuery}
              placeholder={t("exerciseCatalog.controls.searchPlaceholder")}
              returnKeyType="search"
              testID="picker-search"
              value={query}
            />
          </Input>
          <ScrollView
            accessibilityLabel={t("exerciseCatalog.controls.muscleGroupFilterLabel")}
            contentContainerStyle={styles.filters}
            horizontal
            keyboardShouldPersistTaps="handled"
            showsHorizontalScrollIndicator={false}
          >
            <Button
              accessibilityState={{ selected: muscleGroup === null }}
              isDisabled={busy}
              onPress={() => setMuscleGroup(null)}
              style={styles.control}
              testID="picker-filter-all"
              variant="outline"
            >
              <ButtonText>{t("exerciseCatalog.controls.allMuscleGroups")}</ButtonText>
            </Button>
            {muscleGroupOrder.map((group) => (
              <Button
                key={group}
                accessibilityState={{ selected: muscleGroup === group }}
                isDisabled={busy}
                onPress={() => setMuscleGroup(group)}
                style={styles.control}
                testID={`picker-filter-${group}`}
                variant="outline"
              >
                <ButtonText>{t(`exerciseCatalog.muscleGroups.${group}`)}</ButtonText>
              </Button>
            ))}
          </ScrollView>
          {query || muscleGroup ? (
            <HStack>
              {query ? (
                <Button
                  isDisabled={busy}
                  onPress={() => {
                    setQuery("");
                    searchRef.current?.focus();
                  }}
                  style={styles.control}
                  testID="picker-clear-search"
                  variant="ghost"
                >
                  <ButtonText>{t("exerciseCatalog.controls.clearSearch")}</ButtonText>
                </Button>
              ) : null}
              <Button
                isDisabled={busy}
                onPress={() => {
                  setQuery("");
                  setMuscleGroup(null);
                }}
                style={styles.control}
                testID="picker-clear-filters"
                variant="ghost"
              >
                <ButtonText>{t("exerciseCatalog.controls.clearFilters")}</ButtonText>
              </Button>
            </HStack>
          ) : null}
          <Button
            ref={createRef}
            accessibilityRole="button"
            isDisabled={busy}
            onPress={() => setCreating(true)}
            style={styles.control}
            testID="picker-create"
          >
            <ButtonText>{t("exerciseCatalog.controls.create")}</ButtonText>
          </Button>
          {creating ? (
            <CustomExerciseForm
              disabled={busy}
              mode={{ kind: "create" }}
              onCancel={() => {
                setCreating(false);
                focusControl(createRef.current);
              }}
              onSuccess={(id) => {
                setCreating(false);
                setQuery("");
                setMuscleGroup(null);
                AccessibilityInfo.announceForAccessibility(t("exerciseCatalog.accessibility.created"));
                focusControl(createRef.current);
                onSelect(id);
              }}
            />
          ) : null}
          {state.status === "load-error" ? (
            <VStack accessibilityRole="alert" testID="picker-load-error">
              <Text>{t("exerciseCatalog.errors.loadFailed")}</Text>
              <Button onPress={retryLoad} style={styles.control} testID="picker-retry">
                <ButtonText>{t("exerciseCatalog.controls.retry")}</ButtonText>
              </Button>
            </VStack>
          ) : null}
        </VStack>
      }
      ListEmptyComponent={
        <Text style={styles.empty} testID="picker-empty">
          {t("exerciseCatalog.empty.available")}
        </Text>
      }
      renderItem={({ item }) => (
        <Button
          accessibilityLabel={`${item.displayName}, ${t(`exerciseCatalog.muscleGroups.${item.muscleGroup}`)}, ${t(`exerciseCatalog.origin.${item.origin}`)}`}
          accessibilityRole="button"
          accessibilityState={{ selected: selectedId === item.id }}
          isDisabled={busy}
          onPress={() => onSelect(item.id)}
          style={[styles.row, selectedId === item.id && styles.selectedRow]}
          testID={`picker-select-${item.id}`}
          variant="outline"
        >
          <VStack>
            <ButtonText>{item.displayName}</ButtonText>
            <Text style={styles.metadata}>
              {t(`exerciseCatalog.muscleGroups.${item.muscleGroup}`)} · {t(`exerciseCatalog.origin.${item.origin}`)}
            </Text>
          </VStack>
        </Button>
      )}
      renderSectionHeader={({ section }) => (
        <Heading accessibilityRole="header" size="md" style={styles.section}>
          {t(`exerciseCatalog.muscleGroups.${section.muscleGroup}`)}
        </Heading>
      )}
      sections={sections}
      testID="exercise-picker"
    />
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 40, paddingHorizontal: 16 },
  control: { minHeight: 44, paddingHorizontal: 12 },
  empty: { color: "#52606D", fontSize: 17, paddingVertical: 24, textAlign: "center" },
  filters: { gap: 8, paddingRight: 16 },
  header: { gap: 12, paddingVertical: 12 },
  metadata: { color: "#52606D", fontSize: 14 },
  row: { justifyContent: "flex-start", minHeight: 56, marginVertical: 4 },
  section: { backgroundColor: "#F5F7FA", paddingVertical: 12 },
  selectedRow: { backgroundColor: "#E3F2FD", borderColor: "#1565C0" },
});
