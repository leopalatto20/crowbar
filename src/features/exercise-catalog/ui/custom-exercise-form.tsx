import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, TextInput } from "react-native";

import { Button, ButtonSpinner, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { Input, InputField } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

import { useExerciseCatalog } from "../exercise-catalog-provider";
import type {
  CatalogExercise,
  CatalogMutationResult,
  ExerciseId,
  MuscleGroup,
} from "../model/catalog";
import {
  parseCustomExerciseName,
  type CustomExerciseNameFailure,
  type CustomExerciseInput,
  type ParsedCustomExerciseName,
} from "../model/custom-exercise";
import { MuscleGroupPicker } from "./muscle-group-picker";

export type CustomExerciseFormMode =
  | Readonly<{ kind: "create" }>
  | Readonly<{ kind: "edit"; exercise: CatalogExercise }>;

type CustomExerciseFormProps = Readonly<{
  mode: CustomExerciseFormMode;
  disabled?: boolean;
  onSuccess?: (exerciseId: ExerciseId) => void;
  onCancel?: () => void;
}>;

function toSavedExerciseId(
  result: CatalogMutationResult<CatalogExercise>,
): CatalogMutationResult<ExerciseId> {
  return result.ok ? { ok: true, value: result.value.id } : result;
}

export function CustomExerciseForm({
  mode,
  disabled = false,
  onSuccess,
  onCancel,
}: CustomExerciseFormProps): React.JSX.Element {
  const { t } = useTranslation();
  const { createCustom, updateCustom, state } = useExerciseCatalog();
  const isEditing = mode.kind === "edit";
  const [name, setName] = useState(isEditing ? mode.exercise.displayName : "");
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup | null>(
    isEditing ? mode.exercise.muscleGroup : null,
  );
  const [nameError, setNameError] = useState<string | null>(null);
  const [groupError, setGroupError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const nameInputRef = useRef<TextInput>(null);

  const busy = disabled || saving || state.status === "mutating";

  const nameValidationMessage = (reason: CustomExerciseNameFailure): string => {
    if (reason === "blank") {
      return t("exerciseCatalog.validation.blankName");
    }
    if (reason === "too-long") {
      return t("exerciseCatalog.validation.tooLongName");
    }
    return t("exerciseCatalog.validation.invalidCharacters");
  };

  const clearErrors = (): void => {
    setNameError(null);
    setGroupError(null);
    setFormError(null);
  };

  const save = async (
    parsedName: ParsedCustomExerciseName,
    selectedMuscleGroup: MuscleGroup,
  ): Promise<void> => {
    const input: CustomExerciseInput = {
      displayName: parsedName.displayName,
      muscleGroup: selectedMuscleGroup,
    };
    const result =
      mode.kind === "create"
        ? await createCustom(input)
        : toSavedExerciseId(await updateCustom(mode.exercise.id, input));

    setSaving(false);

    if (result.ok) {
      onSuccess?.(result.value);
      return;
    }
    if (result.reason === "duplicate-name") {
      setNameError(t("exerciseCatalog.validation.duplicateName"));
      nameInputRef.current?.focus();
      return;
    }
    setFormError(t("exerciseCatalog.errors.persistenceFailed"));
  };

  const handleSubmit = (): void => {
    if (busy) {
      return;
    }

    const parsedName = parseCustomExerciseName(name);
    if (!parsedName.ok) {
      setNameError(nameValidationMessage(parsedName.reason));
      nameInputRef.current?.focus();
      return;
    }
    if (!muscleGroup) {
      setGroupError(t("exerciseCatalog.validation.invalidMuscleGroup"));
      return;
    }

    clearErrors();
    setSaving(true);
    void save(parsedName.value, muscleGroup);
  };

  const handleNameChange = (nextName: string): void => {
    if (busy) {
      return;
    }
    setNameError(null);
    setName(nextName);
  };

  const handleSelect = (selectedMuscleGroup: MuscleGroup): void => {
    if (busy) {
      return;
    }
    setGroupError(null);
    setMuscleGroup(selectedMuscleGroup);
  };

  return (
    <VStack style={styles.container}>
      <Heading size="lg" accessibilityRole="header" style={styles.heading}>
        {isEditing ? t("exerciseCatalog.controls.edit") : t("exerciseCatalog.controls.create")}
      </Heading>

      <Text style={styles.label}>{t("exerciseCatalog.controls.nameLabel")}</Text>
      <Input className="min-h-11" isDisabled={busy} isInvalid={nameError !== null}>
        <InputField
          ref={nameInputRef}
          accessibilityLabel={t("exerciseCatalog.controls.nameLabel")}
          allowFontScaling
          autoCapitalize="sentences"
          onChangeText={handleNameChange}
          testID="custom-exercise-form-name"
          value={name}
        />
      </Input>
      {nameError ? (
        <Text accessibilityRole="alert" style={styles.error} testID="custom-exercise-form-name-error">
          {nameError}
        </Text>
      ) : null}

      <Text style={styles.label}>{t("exerciseCatalog.controls.muscleGroupLabel")}</Text>
      <MuscleGroupPicker
        disabled={busy}
        label={t("exerciseCatalog.controls.muscleGroupLabel")}
        labelFor={(group) => t(`exerciseCatalog.muscleGroups.${group}`)}
        onSelect={handleSelect}
        selectedMuscleGroup={muscleGroup}
      />
      {groupError ? (
        <Text
          accessibilityRole="alert"
          style={styles.error}
          testID="custom-exercise-form-group-error"
        >
          {groupError}
        </Text>
      ) : null}

      {formError ? (
        <Text
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          style={styles.error}
          testID="custom-exercise-form-form-error"
        >
          {formError}
        </Text>
      ) : null}

      <HStack style={styles.actions}>
        <Button
          accessibilityRole="button"
          isDisabled={busy}
          onPress={onCancel}
          style={styles.cancelButton}
          testID="custom-exercise-form-cancel"
          variant="outline"
        >
          <ButtonText>{t("exerciseCatalog.controls.cancel")}</ButtonText>
        </Button>
        <Button
          accessibilityRole="button"
          accessibilityState={{ busy: saving, disabled: busy }}
          isDisabled={busy}
          onPress={handleSubmit}
          style={styles.saveButton}
          testID="custom-exercise-form-save"
        >
          {saving ? (
            <ButtonSpinner color="#FFFFFF" />
          ) : (
            <ButtonText style={styles.saveButtonText}>
              {t("exerciseCatalog.controls.save")}
            </ButtonText>
          )}
        </Button>
      </HStack>
    </VStack>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    alignItems: "center",
    borderColor: "#BCCCDC",
    borderRadius: 10,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
  },
  container: {
    gap: 8,
    width: "100%",
  },
  error: {
    color: "#BA1A1A",
    fontSize: 15,
    lineHeight: 22,
  },
  heading: {
    color: "#102A43",
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 30,
    marginBottom: 8,
  },
  label: {
    color: "#102A43",
    fontSize: 15,
    fontWeight: "600",
  },
  saveButton: {
    alignItems: "center",
    backgroundColor: "#1565C0",
    borderRadius: 10,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
});
