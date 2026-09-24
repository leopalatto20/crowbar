import type { RefObject } from "react";
import { StyleSheet, type TextInput } from "react-native";
import { useTranslation } from "react-i18next";

import { Button, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { Input, InputField } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

import type { MuscleGroup } from "../model/catalog";
import { CustomExerciseForm, type CustomExerciseFormMode } from "./custom-exercise-form";
import type { ExerciseListActionRef } from "./exercise-list";
import { MuscleGroupFilter } from "./muscle-group-filter";

export type CatalogView = "available" | "unavailable";

type CatalogScreenHeaderProps = Readonly<{
  view: CatalogView;
  query: string;
  muscleGroup: MuscleGroup | null;
  formMode: CustomExerciseFormMode | null;
  busy: boolean;
  hasLoadError: boolean;
  hasActionError: boolean;
  searchRef: RefObject<TextInput | null>;
  createControlRef: RefObject<ExerciseListActionRef | null>;
  availableViewRef: RefObject<ExerciseListActionRef | null>;
  unavailableViewRef: RefObject<ExerciseListActionRef | null>;
  onCreate: () => void;
  onViewChange: (view: CatalogView) => void;
  onQueryChange: (query: string) => void;
  onMuscleGroupChange: (group: MuscleGroup | null) => void;
  onRetryLoad: () => void;
  onRetryAvailability: () => void;
  onCancelForm: () => void;
  onFormSuccess: () => void;
}>;

export function CatalogScreenHeader({
  view,
  query,
  muscleGroup,
  formMode,
  busy,
  hasLoadError,
  hasActionError,
  searchRef,
  createControlRef,
  availableViewRef,
  unavailableViewRef,
  onCreate,
  onViewChange,
  onQueryChange,
  onMuscleGroupChange,
  onRetryLoad,
  onRetryAvailability,
  onCancelForm,
  onFormSuccess,
}: CatalogScreenHeaderProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <VStack style={styles.header}>
      <HStack style={styles.titleRow}>
        <Heading accessibilityRole="header" size="2xl" style={styles.title}>
          {t(
            view === "available"
              ? "exerciseCatalog.controls.availableView"
              : "exerciseCatalog.controls.unavailableView",
          )}
        </Heading>
        <Button
          ref={createControlRef}
          accessibilityRole="button"
          isDisabled={busy}
          onPress={onCreate}
          style={styles.primaryControl}
          testID="catalog-create"
        >
          <ButtonText style={styles.primaryControlText}>
            {t("exerciseCatalog.controls.create")}
          </ButtonText>
        </Button>
      </HStack>

      <HStack accessibilityRole="tablist" style={styles.viewToggle}>
        <Button
          ref={availableViewRef}
          accessibilityRole="tab"
          accessibilityState={{ selected: view === "available" }}
          isDisabled={busy}
          onPress={() => onViewChange("available")}
          style={[styles.viewControl, view === "available" && styles.selectedControl]}
          testID="catalog-view-available"
          variant="outline"
        >
          <ButtonText>{t("exerciseCatalog.controls.availableView")}</ButtonText>
        </Button>
        <Button
          ref={unavailableViewRef}
          accessibilityRole="tab"
          accessibilityState={{ selected: view === "unavailable" }}
          isDisabled={busy}
          onPress={() => onViewChange("unavailable")}
          style={[styles.viewControl, view === "unavailable" && styles.selectedControl]}
          testID="catalog-view-unavailable"
          variant="outline"
        >
          <ButtonText>{t("exerciseCatalog.controls.unavailableView")}</ButtonText>
        </Button>
      </HStack>

      <Input className="min-h-11" isDisabled={busy}>
        <InputField
          ref={searchRef}
          accessibilityLabel={t("exerciseCatalog.controls.searchLabel")}
          allowFontScaling
          onChangeText={onQueryChange}
          placeholder={t("exerciseCatalog.controls.searchPlaceholder")}
          returnKeyType="search"
          testID="catalog-search"
          value={query}
        />
      </Input>

      <MuscleGroupFilter
        controlStyle={styles.filterControl}
        disabled={busy}
        onSelect={onMuscleGroupChange}
        selectedGroup={muscleGroup}
        selectedStyle={styles.selectedControl}
        testIDPrefix="catalog"
      />

      {query.length > 0 || muscleGroup !== null ? (
        <HStack style={styles.clearControls}>
          {query.length > 0 ? (
            <Button
              accessibilityRole="button"
              isDisabled={busy}
              onPress={() => {
                onQueryChange("");
                searchRef.current?.focus();
              }}
              style={styles.clearControl}
              testID="catalog-clear-search"
              variant="ghost"
            >
              <ButtonText>{t("exerciseCatalog.controls.clearSearch")}</ButtonText>
            </Button>
          ) : null}
          <Button
            accessibilityRole="button"
            isDisabled={busy}
            onPress={() => {
              onQueryChange("");
              onMuscleGroupChange(null);
            }}
            style={styles.clearControl}
            testID="catalog-clear-filters"
            variant="ghost"
          >
            <ButtonText>{t("exerciseCatalog.controls.clearFilters")}</ButtonText>
          </Button>
        </HStack>
      ) : null}

      {hasLoadError ? (
        <VStack accessibilityRole="alert" style={styles.errorBanner}>
          <Text style={styles.errorText}>{t("exerciseCatalog.errors.loadFailed")}</Text>
          <Button onPress={onRetryLoad} style={styles.retryControl} variant="outline">
            <ButtonText>{t("exerciseCatalog.controls.retry")}</ButtonText>
          </Button>
        </VStack>
      ) : null}

      {hasActionError ? (
        <VStack accessibilityRole="alert" style={styles.errorBanner} testID="catalog-action-error">
          <Text style={styles.errorText}>{t("exerciseCatalog.errors.persistenceFailed")}</Text>
          <Button
            isDisabled={busy}
            onPress={onRetryAvailability}
            style={styles.retryControl}
            testID="catalog-action-retry"
            variant="outline"
          >
            <ButtonText>{t("exerciseCatalog.controls.retry")}</ButtonText>
          </Button>
        </VStack>
      ) : null}

      {formMode ? (
        <CustomExerciseForm
          key={formMode.kind === "create" ? "create" : formMode.exercise.id}
          disabled={busy}
          mode={formMode}
          onCancel={onCancelForm}
          onSuccess={onFormSuccess}
        />
      ) : null}
    </VStack>
  );
}

const styles = StyleSheet.create({
  clearControl: { minHeight: 44, paddingHorizontal: 8 },
  clearControls: { flexWrap: "wrap", gap: 8 },
  errorBanner: {
    backgroundColor: "#FFF5F5",
    borderColor: "#F4B6B6",
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
    padding: 12,
  },
  errorText: { color: "#9B1C1C", fontSize: 15, lineHeight: 22 },
  filterControl: { minHeight: 44, paddingHorizontal: 14 },
  header: { backgroundColor: "#F5F7FA", gap: 12, paddingTop: 16 },
  primaryControl: { backgroundColor: "#1565C0", minHeight: 44, paddingHorizontal: 16 },
  primaryControlText: { color: "#FFFFFF", fontWeight: "700" },
  retryControl: { alignSelf: "flex-start", minHeight: 44, paddingHorizontal: 14 },
  selectedControl: { backgroundColor: "#E3F2FD", borderColor: "#1565C0" },
  title: { color: "#102A43", flex: 1, fontSize: 28, fontWeight: "800", lineHeight: 34 },
  titleRow: {
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
  },
  viewControl: { flex: 1, minHeight: 44, paddingHorizontal: 10 },
  viewToggle: { gap: 8 },
});
