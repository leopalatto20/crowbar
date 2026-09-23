import { useRef, useState } from "react";
import {
  AccessibilityInfo,
  ScrollView,
  StyleSheet,
  type TextInput,
} from "react-native";
import { useTranslation } from "react-i18next";

import { Button, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { Input, InputField } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

import { useExerciseCatalog } from "../exercise-catalog-provider";
import {
  muscleGroupOrder,
  type CatalogExercise,
  type ExerciseId,
  type MuscleGroup,
} from "../model/catalog";
import {
  CustomExerciseForm,
  type CustomCatalogExercise,
  type CustomExerciseFormMode,
} from "./custom-exercise-form";
import {
  ExerciseList,
  type ExerciseListActionRef,
} from "./exercise-list";

type CatalogView = "available" | "unavailable";

export function ExerciseCatalogScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const { state, listAvailable, listUnavailable, retryLoad, setAvailability } =
    useExerciseCatalog();
  const [catalogView, setCatalogView] = useState<CatalogView>("available");
  const [query, setQuery] = useState("");
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup | null>(null);
  const [formMode, setFormMode] = useState<CustomExerciseFormMode | null>(null);
  const [failedExercise, setFailedExercise] = useState<CatalogExercise | null>(null);
  const [hasDurableCatalog, setHasDurableCatalog] = useState(false);
  const [previousStatus, setPreviousStatus] = useState(state.status);
  const searchRef = useRef<TextInput>(null);
  const createControlRef = useRef<ExerciseListActionRef>(null);
  const availableViewRef = useRef<ExerciseListActionRef>(null);
  const unavailableViewRef = useRef<ExerciseListActionRef>(null);
  const editControlRefs = useRef(new Map<ExerciseId, ExerciseListActionRef>());
  const busy = state.status === "mutating";
  const exercises =
    catalogView === "available"
      ? listAvailable(query, muscleGroup)
      : listUnavailable(query, muscleGroup);

  if (state.status !== previousStatus) {
    setPreviousStatus(state.status);
    if (state.status === "ready" && !hasDurableCatalog) {
      setHasDurableCatalog(true);
    }
  }

  const focusControl = (control: ExerciseListActionRef | null | undefined): void => {
    if (control) {
      // Gluestack's generated ref type does not expose its React Native Pressable host.
      const host = control as unknown as Parameters<
        typeof AccessibilityInfo.sendAccessibilityEvent
      >[0];
      AccessibilityInfo.sendAccessibilityEvent(host, "focus");
    }
  };

  const focusFormInvoker = (mode: CustomExerciseFormMode): void => {
    if (mode.kind === "create") {
      focusControl(createControlRef.current);
      return;
    }
    focusControl(editControlRefs.current.get(mode.exercise.id));
  };

  const closeForm = (): void => {
    if (!formMode) {
      return;
    }
    const closingMode = formMode;
    setFormMode(null);
    focusFormInvoker(closingMode);
  };

  const handleFormSuccess = (): void => {
    if (!formMode) {
      return;
    }
    const completedMode = formMode;
    setFormMode(null);
    AccessibilityInfo.announceForAccessibility(
      t(
        completedMode.kind === "create"
          ? "exerciseCatalog.accessibility.created"
          : "exerciseCatalog.accessibility.updated",
      ),
    );
    focusFormInvoker(completedMode);
  };

  const runAvailabilityChange = async (exercise: CatalogExercise): Promise<void> => {
    setFailedExercise(null);
    const restoring = !exercise.isAvailable;
    const result = await setAvailability(exercise.id, restoring);

    if (!result.ok) {
      setFailedExercise(exercise);
      return;
    }

    const announcement = restoring
      ? exercise.origin === "custom"
        ? "exerciseCatalog.accessibility.restored"
        : "exerciseCatalog.accessibility.shown"
      : exercise.origin === "custom"
        ? "exerciseCatalog.accessibility.archived"
        : "exerciseCatalog.accessibility.hidden";
    AccessibilityInfo.announceForAccessibility(t(announcement));
    focusControl(
      catalogView === "available" ? availableViewRef.current : unavailableViewRef.current,
    );
  };

  const selectView = (nextView: CatalogView): void => {
    setCatalogView(nextView);
    setFailedExercise(null);
  };

  if (state.status === "loading" && !hasDurableCatalog) {
    return (
      <VStack accessibilityLabel={t("exerciseCatalog.accessibility.loading")} style={styles.state} testID="catalog-loading">
        <Spinner />
        <Heading accessibilityRole="header" size="lg">
          {t("exerciseCatalog.accessibility.loading")}
        </Heading>
      </VStack>
    );
  }

  if (state.status === "load-error" && !hasDurableCatalog) {
    return (
      <VStack accessibilityRole="alert" style={styles.state} testID="catalog-load-error">
        <Heading accessibilityRole="header" size="lg" style={styles.stateHeading}>
          {t("exerciseCatalog.errors.loadFailed")}
        </Heading>
        <Button
          accessibilityRole="button"
          onPress={retryLoad}
          style={styles.primaryControl}
          testID="catalog-retry"
        >
          <ButtonText style={styles.primaryControlText}>
            {t("exerciseCatalog.controls.retry")}
          </ButtonText>
        </Button>
      </VStack>
    );
  }

  return (
    <VStack style={styles.screen}>
      <ExerciseList
        header={<VStack style={styles.header}>
        <HStack style={styles.titleRow}>
          <Heading accessibilityRole="header" size="2xl" style={styles.title}>
            {t(
              catalogView === "available"
                ? "exerciseCatalog.controls.availableView"
                : "exerciseCatalog.controls.unavailableView",
            )}
          </Heading>
          <Button
            ref={createControlRef}
            accessibilityRole="button"
            isDisabled={busy}
            onPress={() => setFormMode({ kind: "create" })}
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
            accessibilityState={{ selected: catalogView === "available" }}
            isDisabled={busy}
            onPress={() => selectView("available")}
            style={[
              styles.viewControl,
              catalogView === "available" && styles.selectedControl,
            ]}
            testID="catalog-view-available"
            variant="outline"
          >
            <ButtonText>{t("exerciseCatalog.controls.availableView")}</ButtonText>
          </Button>
          <Button
            ref={unavailableViewRef}
            accessibilityRole="tab"
            accessibilityState={{ selected: catalogView === "unavailable" }}
            isDisabled={busy}
            onPress={() => selectView("unavailable")}
            style={[
              styles.viewControl,
              catalogView === "unavailable" && styles.selectedControl,
            ]}
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
            onChangeText={setQuery}
            placeholder={t("exerciseCatalog.controls.searchPlaceholder")}
            returnKeyType="search"
            testID="catalog-search"
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
            style={[styles.filterControl, muscleGroup === null && styles.selectedControl]}
            testID="catalog-filter-all"
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
              style={[styles.filterControl, muscleGroup === group && styles.selectedControl]}
              testID={`catalog-filter-${group}`}
              variant="outline"
            >
              <ButtonText>{t(`exerciseCatalog.muscleGroups.${group}`)}</ButtonText>
            </Button>
          ))}
        </ScrollView>

        {query.length > 0 || muscleGroup !== null ? (
          <HStack style={styles.clearControls}>
            {query.length > 0 ? (
              <Button
                accessibilityRole="button"
                isDisabled={busy}
                onPress={() => {
                  setQuery("");
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
                setQuery("");
                setMuscleGroup(null);
              }}
              style={styles.clearControl}
              testID="catalog-clear-filters"
              variant="ghost"
            >
              <ButtonText>{t("exerciseCatalog.controls.clearFilters")}</ButtonText>
            </Button>
          </HStack>
        ) : null}

        {state.status === "load-error" ? (
          <VStack accessibilityRole="alert" style={styles.errorBanner}>
            <Text style={styles.errorText}>{t("exerciseCatalog.errors.loadFailed")}</Text>
            <Button onPress={retryLoad} style={styles.retryControl} variant="outline">
              <ButtonText>{t("exerciseCatalog.controls.retry")}</ButtonText>
            </Button>
          </VStack>
        ) : null}

        {failedExercise ? (
          <VStack accessibilityRole="alert" style={styles.errorBanner} testID="catalog-action-error">
            <Text style={styles.errorText}>{t("exerciseCatalog.errors.persistenceFailed")}</Text>
            <Button
              isDisabled={busy}
              onPress={() => void runAvailabilityChange(failedExercise)}
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
            onCancel={closeForm}
            onSuccess={handleFormSuccess}
          />
        ) : null}
        </VStack>}
        disabled={busy}
        emptyMessage={t(
          catalogView === "available"
            ? "exerciseCatalog.empty.available"
            : "exerciseCatalog.empty.unavailable",
        )}
        exercises={exercises}
        onEdit={(exercise) => {
          if (exercise.origin === "custom") {
            setFormMode({ kind: "edit", exercise: exercise as CustomCatalogExercise });
          }
        }}
        onEditControlRef={(id, control) => {
          if (control) {
            editControlRefs.current.set(id, control);
          } else {
            editControlRefs.current.delete(id);
          }
        }}
        onSetAvailability={(exercise) => void runAvailabilityChange(exercise)}
      />
    </VStack>
  );
}

const styles = StyleSheet.create({
  clearControl: {
    minHeight: 44,
    paddingHorizontal: 8,
  },
  clearControls: {
    flexWrap: "wrap",
    gap: 8,
  },
  errorBanner: {
    backgroundColor: "#FFF5F5",
    borderColor: "#F4B6B6",
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
    padding: 12,
  },
  errorText: {
    color: "#9B1C1C",
    fontSize: 15,
    lineHeight: 22,
  },
  filterControl: {
    minHeight: 44,
    paddingHorizontal: 14,
  },
  filters: {
    gap: 8,
    paddingRight: 16,
  },
  header: {
    backgroundColor: "#F5F7FA",
    gap: 12,
    paddingTop: 16,
  },
  primaryControl: {
    backgroundColor: "#1565C0",
    minHeight: 44,
    paddingHorizontal: 16,
  },
  primaryControlText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  retryControl: {
    alignSelf: "flex-start",
    minHeight: 44,
    paddingHorizontal: 14,
  },
  screen: {
    backgroundColor: "#F5F7FA",
    flex: 1,
  },
  selectedControl: {
    backgroundColor: "#E3F2FD",
    borderColor: "#1565C0",
  },
  state: {
    alignItems: "center",
    flex: 1,
    gap: 16,
    justifyContent: "center",
    padding: 24,
  },
  stateHeading: {
    color: "#102A43",
    textAlign: "center",
  },
  title: {
    color: "#102A43",
    flex: 1,
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 34,
  },
  titleRow: {
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
  },
  viewControl: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: 10,
  },
  viewToggle: {
    gap: 8,
  },
});
