import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { I18nextProvider } from "react-i18next";
import { Text } from "react-native";

import { createI18n } from "../../../i18n";
import {
  ExerciseCatalogProvider,
  useExerciseCatalog,
} from "../exercise-catalog-provider";
import type {
  ExerciseCatalogRepository,
  ExerciseCatalogSnapshot,
  PersistedCustomExercise,
} from "../data/exercise-catalog-repository";
import type { ExerciseId } from "../model/catalog";
import {
  CustomExerciseForm,
  type CustomCatalogExercise,
  type CustomExerciseFormMode,
} from "../ui/custom-exercise-form";

jest.mock("expo-sqlite", () => ({
  useSQLiteContext: (() => {
    const database = {
      getAllAsync: jest.fn(),
      getFirstAsync: jest.fn(),
      runAsync: jest.fn(),
      withExclusiveTransactionAsync: jest.fn(),
    };
    return () => database;
  })(),
}));

const customExerciseId = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as ExerciseId;
const createdExerciseId = "cccccccccccccccccccccccccccccccc" as ExerciseId;
const customExerciseRow: PersistedCustomExercise = {
  id: customExerciseId,
  displayName: "Cable Row",
  nameKey: "cable row",
  muscleGroup: "upper-back",
  isAvailable: true,
};
const customExercise: CustomCatalogExercise = {
  id: customExerciseId,
  displayName: "Cable Row",
  muscleGroup: "upper-back",
  origin: "custom",
  isAvailable: true,
};

function snapshot(
  customExercises: readonly PersistedCustomExercise[] = [],
): ExerciseCatalogSnapshot {
  return { customExercises, hiddenBuiltinIds: [] };
}

function createRepository(
  overrides: Partial<ExerciseCatalogRepository> = {},
): ExerciseCatalogRepository {
  return {
    read: jest.fn().mockResolvedValue(snapshot()),
    createCustom: jest.fn(),
    updateCustom: jest.fn(),
    setCustomAvailability: jest.fn(),
    setBuiltinAvailability: jest.fn(),
    ...overrides,
  };
}

function CatalogProbe(): React.JSX.Element {
  const catalog = useExerciseCatalog();

  return (
    <Text testID="catalog-probe">
      {`${catalog.state.status}:${catalog.listAvailable().length}`}
    </Text>
  );
}

type RenderFormOptions = Readonly<{
  repository: ExerciseCatalogRepository;
  mode?: CustomExerciseFormMode;
  language?: "en" | "es";
  disabled?: boolean;
  onSuccess?: (exerciseId: ExerciseId) => void;
  onCancel?: () => void;
}>;

async function renderForm({
  repository,
  mode = { kind: "create" },
  language = "en",
  disabled = false,
  onSuccess,
  onCancel,
}: RenderFormOptions) {
  const i18n = await createI18n([{ languageCode: language }]);
  const view = await render(
    <I18nextProvider i18n={i18n}>
      <ExerciseCatalogProvider repository={repository}>
        <CatalogProbe />
        <CustomExerciseForm
          mode={mode}
          disabled={disabled}
          onCancel={onCancel}
          onSuccess={onSuccess}
        />
      </ExerciseCatalogProvider>
    </I18nextProvider>,
  );

  return { i18n, view };
}

describe("CustomExerciseForm", () => {
  it("creates a custom exercise from a trimmed name and a selected muscle group", async () => {
    const onSuccess = jest.fn();
    const repository = createRepository({
      createCustom: jest.fn().mockResolvedValue({
        id: createdExerciseId,
        displayName: "Cable Fly",
        nameKey: "cable fly",
        muscleGroup: "chest",
        isAvailable: true,
      }),
    });
    const { view } = await renderForm({ repository, onSuccess });

    await fireEvent.changeText(view.getByTestId("custom-exercise-form-name"), "  Cable Fly  ");
    await fireEvent.press(view.getByTestId("muscle-group-chest"));
    await fireEvent.press(view.getByTestId("custom-exercise-form-save"));

    await waitFor(() =>
      expect(repository.createCustom).toHaveBeenCalledWith({
        displayName: "Cable Fly",
        nameKey: "cable fly",
        muscleGroup: "chest",
      }),
    );
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(createdExerciseId));
    await waitFor(() =>
      expect(view.getByTestId("catalog-probe").props.children).toBe("ready:75"),
    );
  });

  it("prefills an existing custom exercise and updates it in place", async () => {
    const onSuccess = jest.fn();
    const repository = createRepository({
      read: jest.fn().mockResolvedValue(snapshot([customExerciseRow])),
      updateCustom: jest.fn().mockResolvedValue({
        ...customExerciseRow,
        displayName: "Seated Cable Row",
        nameKey: "seated cable row",
      }),
    });
    const { view } = await renderForm({
      repository,
      mode: { kind: "edit", exercise: customExercise },
      onSuccess,
    });

    expect(view.getByTestId("custom-exercise-form-name").props.value).toBe("Cable Row");
    expect(view.getByTestId("muscle-group-upper-back").props.accessibilityState).toEqual(
      expect.objectContaining({ checked: true }),
    );
    expect(view.getByText("Edit exercise")).toBeTruthy();

    await fireEvent.changeText(view.getByTestId("custom-exercise-form-name"), "Seated Cable Row");
    await fireEvent.press(view.getByTestId("custom-exercise-form-save"));

    await waitFor(() =>
      expect(repository.updateCustom).toHaveBeenCalledWith(customExerciseId, {
        displayName: "Seated Cable Row",
        nameKey: "seated cable row",
        muscleGroup: "upper-back",
      }),
    );
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(customExerciseId));
  });

  it("rejects a blank name with a localized field error", async () => {
    const repository = createRepository();
    const onSuccess = jest.fn();
    const { view } = await renderForm({ repository, onSuccess });

    await fireEvent.changeText(view.getByTestId("custom-exercise-form-name"), "   ");
    await fireEvent.press(view.getByTestId("custom-exercise-form-save"));

    expect(view.getByText("Enter an exercise name.")).toBeTruthy();
    expect(view.getByTestId("custom-exercise-form-name").props["aria-invalid"]).toBe(true);
    expect(repository.createCustom).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("rejects names longer than 80 code points", async () => {
    const repository = createRepository();
    const { view } = await renderForm({ repository });

    await fireEvent.changeText(view.getByTestId("custom-exercise-form-name"), "a".repeat(81));
    await fireEvent.press(view.getByTestId("custom-exercise-form-save"));

    expect(view.getByText("Exercise names must be 80 characters or fewer.")).toBeTruthy();
    expect(repository.createCustom).not.toHaveBeenCalled();
  });

  it("rejects names with invisible control characters", async () => {
    const repository = createRepository();
    const { view } = await renderForm({ repository });

    await fireEvent.changeText(view.getByTestId("custom-exercise-form-name"), "Bench\u0007Press");
    await fireEvent.press(view.getByTestId("custom-exercise-form-save"));

    expect(view.getByText("Use visible characters only.")).toBeTruthy();
    expect(repository.createCustom).not.toHaveBeenCalled();
  });

  it("requires exactly one muscle group before saving", async () => {
    const repository = createRepository();
    const { view } = await renderForm({ repository });

    await fireEvent.changeText(view.getByTestId("custom-exercise-form-name"), "Bulgarian Split Squat");
    await fireEvent.press(view.getByTestId("custom-exercise-form-save"));

    expect(view.getByText("Choose a valid muscle group.")).toBeTruthy();
    expect(repository.createCustom).not.toHaveBeenCalled();
  });

  it("reports duplicate names on the name field and keeps entered values", async () => {
    const onSuccess = jest.fn();
    const repository = createRepository({
      read: jest.fn().mockResolvedValue(snapshot([customExerciseRow])),
    });
    const { view } = await renderForm({ repository, onSuccess });

    await fireEvent.changeText(view.getByTestId("custom-exercise-form-name"), "Cable Row");
    await fireEvent.press(view.getByTestId("muscle-group-upper-back"));
    await fireEvent.press(view.getByTestId("custom-exercise-form-save"));

    await waitFor(() =>
      expect(view.getByText("That custom exercise name is already in use.")).toBeTruthy(),
    );
    expect(view.getByTestId("custom-exercise-form-name").props.value).toBe("Cable Row");
    expect(view.getByTestId("muscle-group-upper-back").props.accessibilityState).toEqual(
      expect.objectContaining({ checked: true }),
    );
    expect(repository.createCustom).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("keeps entered values and the prior catalog after a failed save", async () => {
    const onSuccess = jest.fn();
    const repository = createRepository({
      createCustom: jest.fn().mockRejectedValue(new Error("offline")),
    });
    const { view } = await renderForm({ repository, onSuccess });

    await fireEvent.changeText(view.getByTestId("custom-exercise-form-name"), "Nordic Hamstring Curl");
    await fireEvent.press(view.getByTestId("muscle-group-hamstrings"));
    await fireEvent.press(view.getByTestId("custom-exercise-form-save"));

    await waitFor(() =>
      expect(view.getByText("The exercise catalog could not be saved.")).toBeTruthy(),
    );
    expect(view.getByTestId("custom-exercise-form-name").props.value).toBe("Nordic Hamstring Curl");
    expect(view.getByTestId("muscle-group-hamstrings").props.accessibilityState).toEqual(
      expect.objectContaining({ checked: true }),
    );
    await waitFor(() =>
      expect(view.getByTestId("catalog-probe").props.children).toBe("mutation-error:74"),
    );
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("replaces a stale persistence error when the next submission fails validation", async () => {
    const repository = createRepository({
      createCustom: jest.fn().mockRejectedValue(new Error("offline")),
    });
    const { view } = await renderForm({ repository });

    await fireEvent.changeText(
      view.getByTestId("custom-exercise-form-name"),
      "Nordic Hamstring Curl",
    );
    await fireEvent.press(view.getByTestId("muscle-group-hamstrings"));
    await fireEvent.press(view.getByTestId("custom-exercise-form-save"));

    await waitFor(() =>
      expect(view.getByText("The exercise catalog could not be saved.")).toBeTruthy(),
    );

    await fireEvent.changeText(view.getByTestId("custom-exercise-form-name"), "   ");
    await fireEvent.press(view.getByTestId("custom-exercise-form-save"));

    expect(view.getByText("Enter an exercise name.")).toBeTruthy();
    expect(view.queryByText("The exercise catalog could not be saved.")).toBeNull();
  });

  it("disables every control while disabled and blocks submissions", async () => {
    const repository = createRepository();
    const { view } = await renderForm({ repository, disabled: true });

    expect(view.getByTestId("custom-exercise-form-name").props["aria-disabled"]).toBe(true);
    expect(view.getByTestId("muscle-group-chest").props.accessibilityState).toEqual(
      expect.objectContaining({ checked: false, disabled: true }),
    );
    expect(view.getByTestId("custom-exercise-form-save").props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: true }),
    );

    await fireEvent.changeText(view.getByTestId("custom-exercise-form-name"), "Cable Fly");
    await fireEvent.press(view.getByTestId("muscle-group-chest"));
    await fireEvent.press(view.getByTestId("custom-exercise-form-save"));

    expect(repository.createCustom).not.toHaveBeenCalled();
  });

  it("disables controls while a save is pending and restores them afterwards", async () => {
    let resolveWrite: (exercise: PersistedCustomExercise) => void = () => undefined;
    const pendingWrite = new Promise<PersistedCustomExercise>((resolve) => {
      resolveWrite = resolve;
    });
    const onSuccess = jest.fn();
    const repository = createRepository({ createCustom: jest.fn().mockReturnValue(pendingWrite) });
    const { view } = await renderForm({ repository, onSuccess });

    await fireEvent.changeText(view.getByTestId("custom-exercise-form-name"), "Cable Fly");
    await fireEvent.press(view.getByTestId("muscle-group-chest"));
    await fireEvent.press(view.getByTestId("custom-exercise-form-save"));

    await waitFor(() =>
      expect(view.getByTestId("custom-exercise-form-save").props.accessibilityState).toEqual(
        expect.objectContaining({ busy: true, disabled: true }),
      ),
    );

    await act(async () => {
      resolveWrite({
        id: createdExerciseId,
        displayName: "Cable Fly",
        nameKey: "cable fly",
        muscleGroup: "chest",
        isAvailable: true,
      });
      await pendingWrite;
    });

    await waitFor(() =>
      expect(view.getByTestId("custom-exercise-form-save").props.accessibilityState).toEqual(
        expect.objectContaining({ busy: false, disabled: false }),
      ),
    );
    expect(onSuccess).toHaveBeenCalledWith(createdExerciseId);
  });

  it("cancels without saving", async () => {
    const repository = createRepository();
    const onSuccess = jest.fn();
    const onCancel = jest.fn();
    const { view } = await renderForm({ repository, onSuccess, onCancel });

    await fireEvent.changeText(view.getByTestId("custom-exercise-form-name"), "Cable Fly");
    await fireEvent.press(view.getByTestId("custom-exercise-form-cancel"));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSuccess).not.toHaveBeenCalled();
    expect(repository.createCustom).not.toHaveBeenCalled();
  });

  it("associates accessible names, states, and errors with each control", async () => {
    const repository = createRepository();
    const { view } = await renderForm({ repository });

    const nameInput = view.getByTestId("custom-exercise-form-name");
    expect(nameInput.props.accessibilityLabel).toBe("Exercise name");
    expect(nameInput.props["aria-invalid"]).not.toBe(true);
    expect(view.getByTestId("custom-exercise-form-group-picker").props.accessibilityLabel).toBe(
      "Muscle group",
    );
    expect(view.getByTestId("custom-exercise-form-group-picker").props.accessibilityRole).toBe(
      "radiogroup",
    );

    const chestRadio = view.getByTestId("muscle-group-chest");
    expect(chestRadio.props.accessibilityRole).toBe("radio");
    expect(chestRadio.props.accessibilityLabel).toBe("Chest");
    expect(chestRadio.props.accessibilityState).toEqual(
      expect.objectContaining({ checked: false, disabled: false }),
    );

    expect(view.getByText("Create exercise")).toBeTruthy();
    expect(view.getByTestId("custom-exercise-form-save").props.accessibilityRole).toBe("button");
    expect(view.getByTestId("custom-exercise-form-cancel").props.accessibilityRole).toBe("button");

    await fireEvent.changeText(nameInput, "   ");
    await fireEvent.press(view.getByTestId("custom-exercise-form-save"));

    expect(nameInput.props["aria-invalid"]).toBe(true);
  });

  it("renders Spanish labels and validation errors", async () => {
    const repository = createRepository();
    const { view } = await renderForm({ repository, language: "es" });

    expect(view.getByTestId("custom-exercise-form-name").props.accessibilityLabel).toBe(
      "Nombre del ejercicio",
    );
    expect(view.getByTestId("muscle-group-chest").props.accessibilityLabel).toBe("Pecho");

    await fireEvent.changeText(view.getByTestId("custom-exercise-form-name"), "   ");
    await fireEvent.press(view.getByTestId("custom-exercise-form-save"));

    expect(view.getByText("Escribe un nombre para el ejercicio.")).toBeTruthy();
  });
});
