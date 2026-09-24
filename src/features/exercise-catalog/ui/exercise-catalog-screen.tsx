import { useRef, useState } from "react";
import { AccessibilityInfo, StyleSheet, type TextInput } from "react-native";
import { useTranslation } from "react-i18next";

import { Button, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Spinner } from "@/components/ui/spinner";
import { VStack } from "@/components/ui/vstack";

import { useExerciseCatalog } from "../exercise-catalog-provider";
import { type CatalogExercise, type ExerciseId, type MuscleGroup } from "../model/catalog";
import { CatalogScreenHeader, type CatalogView } from "./catalog-screen-header";
import { type CustomCatalogExercise, type CustomExerciseFormMode } from "./custom-exercise-form";
import { ExerciseList, type ExerciseListActionRef } from "./exercise-list";

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
        header={
          <CatalogScreenHeader
            availableViewRef={availableViewRef}
            busy={busy}
            createControlRef={createControlRef}
            formMode={formMode}
            hasActionError={failedExercise !== null}
            hasLoadError={state.status === "load-error"}
            muscleGroup={muscleGroup}
            onCancelForm={closeForm}
            onCreate={() => setFormMode({ kind: "create" })}
            onFormSuccess={handleFormSuccess}
            onMuscleGroupChange={setMuscleGroup}
            onQueryChange={setQuery}
            onRetryAvailability={() => {
              if (failedExercise) void runAvailabilityChange(failedExercise);
            }}
            onRetryLoad={retryLoad}
            onViewChange={selectView}
            query={query}
            searchRef={searchRef}
            unavailableViewRef={unavailableViewRef}
            view={catalogView}
          />
        }
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
  primaryControl: {
    backgroundColor: "#1565C0",
    minHeight: 44,
    paddingHorizontal: 16,
  },
  primaryControlText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  screen: {
    backgroundColor: "#F5F7FA",
    flex: 1,
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
});
