import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { I18nextProvider } from "react-i18next";
import { AccessibilityInfo, StyleSheet } from "react-native";

import { createI18n } from "../../../i18n";
import { builtinExercises } from "../data/builtin-exercises";
import type {
  ExerciseCatalogRepository,
  ExerciseCatalogSnapshot,
  PersistedCustomExercise,
} from "../data/exercise-catalog-repository";
import { ExerciseCatalogProvider } from "../exercise-catalog-provider";
import type { ExerciseId } from "../model/catalog";
import { ExercisePicker } from "../ui/exercise-picker";

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

const firstBuiltin = builtinExercises[0];
if (!firstBuiltin) throw new Error("Missing starter exercise");
const customId = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as ExerciseId;
const createdId = "cccccccccccccccccccccccccccccccc" as ExerciseId;
const custom: PersistedCustomExercise = {
  id: customId,
  displayName: "Cable Press",
  nameKey: "cable press",
  muscleGroup: "chest",
  isAvailable: true,
};

function snapshot(
  customExercises: readonly PersistedCustomExercise[] = [],
  hiddenBuiltinIds: readonly ExerciseId[] = [],
): ExerciseCatalogSnapshot {
  return { customExercises, hiddenBuiltinIds };
}

function repository(overrides: Partial<ExerciseCatalogRepository> = {}): ExerciseCatalogRepository {
  return {
    read: jest.fn().mockResolvedValue(snapshot()),
    createCustom: jest.fn(),
    updateCustom: jest.fn(),
    setCustomAvailability: jest.fn(),
    setBuiltinAvailability: jest.fn(),
    ...overrides,
  };
}

async function renderPicker(
  source: ExerciseCatalogRepository,
  selectedId: ExerciseId | null = null,
  language: "en" | "es" = "en",
) {
  const i18n = await createI18n([{ languageCode: language }]);
  const onSelect = jest.fn();
  const view = await render(
    <I18nextProvider i18n={i18n}>
      <ExerciseCatalogProvider repository={source}>
        <ExercisePicker selectedId={selectedId} onSelect={onSelect} />
      </ExerciseCatalogProvider>
    </I18nextProvider>,
  );
  return { view, onSelect };
}

describe("ExercisePicker", () => {
  afterEach(() => jest.restoreAllMocks());

  it("returns one stable ID when selecting an available exercise", async () => {
    const { view, onSelect } = await renderPicker(repository());
    await waitFor(() => expect(view.getByTestId(`picker-select-${firstBuiltin.id}`)).toBeTruthy());
    await fireEvent.press(view.getByTestId(`picker-select-${firstBuiltin.id}`));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(firstBuiltin.id);
  });

  it("combines search and muscle filtering while excluding hidden and archived rows", async () => {
    const source = repository({
      read: jest.fn().mockResolvedValue(snapshot([
        custom,
        { ...custom, id: createdId, displayName: "Cable Archive", nameKey: "cable archive", isAvailable: false },
      ], [firstBuiltin.id])),
    });
    const { view } = await renderPicker(source, customId);
    await waitFor(() => expect(view.getByTestId(`picker-select-${customId}`)).toBeTruthy());
    expect(view.queryByTestId(`picker-select-${firstBuiltin.id}`)).toBeNull();
    expect(view.queryByTestId(`picker-select-${createdId}`)).toBeNull();
    expect(view.getByTestId(`picker-select-${customId}`).props.accessibilityState).toEqual(
      expect.objectContaining({ selected: true }),
    );

    await fireEvent.changeText(view.getByTestId("picker-search"), "cable");
    await fireEvent.press(view.getByTestId("picker-filter-chest"));
    expect(view.getByTestId(`picker-select-${customId}`)).toBeTruthy();
    expect(view.queryByText("Seated Cable Row")).toBeNull();
    await fireEvent.changeText(view.getByTestId("picker-search"), "no match");
    expect(view.getByTestId("picker-empty")).toBeTruthy();
    await fireEvent.press(view.getByTestId("picker-clear-filters"));
    expect(view.getByTestId(`picker-select-${customId}`)).toBeTruthy();
    expect(view.getByTestId("picker-search").props.value).toBe("");
  });

  it("creates inline, selecting only after the new exercise is durable", async () => {
    const announce = jest.spyOn(AccessibilityInfo, "announceForAccessibility").mockImplementation(() => undefined);
    const sendFocus = jest.spyOn(AccessibilityInfo, "sendAccessibilityEvent").mockImplementation(() => undefined);
    let completeCreate: (value: PersistedCustomExercise) => void = () => undefined;
    const pending = new Promise<PersistedCustomExercise>((resolve) => { completeCreate = resolve; });
    const source = repository({ createCustom: jest.fn().mockReturnValue(pending) });
    const { view, onSelect } = await renderPicker(source, firstBuiltin.id);
    await waitFor(() => expect(view.getByTestId("picker-create")).toBeTruthy());

    await fireEvent.press(view.getByTestId("picker-create"));
    await fireEvent.changeText(view.getByTestId("custom-exercise-form-name"), "  New Press  ");
    await fireEvent.press(view.getByTestId("muscle-group-chest"));
    await fireEvent.press(view.getByTestId("custom-exercise-form-save"));
    expect(onSelect).not.toHaveBeenCalled();

    await act(async () => {
      completeCreate({ ...custom, id: createdId, displayName: "New Press", nameKey: "new press" });
      await pending;
    });
    await waitFor(() => expect(onSelect).toHaveBeenCalledWith(createdId));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(view.queryByTestId("custom-exercise-form-name")).toBeNull();
    expect(view.getByTestId(`picker-select-${createdId}`)).toBeTruthy();
    expect(announce).toHaveBeenCalledWith("Exercise created");
    expect(sendFocus).toHaveBeenCalledWith(expect.anything(), "focus");
  });

  it("cancels inline creation without changing selection and restores invoking focus", async () => {
    const sendFocus = jest.spyOn(AccessibilityInfo, "sendAccessibilityEvent").mockImplementation(() => undefined);
    const { view, onSelect } = await renderPicker(repository(), firstBuiltin.id);
    await waitFor(() => expect(view.getByTestId("picker-create")).toBeTruthy());
    await fireEvent.press(view.getByTestId("picker-create"));
    await fireEvent.changeText(view.getByTestId("custom-exercise-form-name"), "Unfinished");
    await fireEvent.press(view.getByTestId("custom-exercise-form-cancel"));
    expect(view.queryByTestId("custom-exercise-form-name")).toBeNull();
    expect(view.getByTestId(`picker-select-${firstBuiltin.id}`).props.accessibilityState.selected).toBe(true);
    expect(onSelect).not.toHaveBeenCalled();
    expect(sendFocus).toHaveBeenCalledWith(expect.anything(), "focus");
    expect(StyleSheet.flatten(view.getByTestId("picker-create").props.style).minHeight).toBeGreaterThanOrEqual(44);
  });

  it("validates blank and duplicate names inline without selecting another exercise", async () => {
    const source = repository({ read: jest.fn().mockResolvedValue(snapshot([custom])) });
    const { view, onSelect } = await renderPicker(source, firstBuiltin.id);
    await waitFor(() => expect(view.getByTestId("picker-create")).toBeTruthy());
    await fireEvent.press(view.getByTestId("picker-create"));
    await fireEvent.press(view.getByTestId("custom-exercise-form-save"));
    expect(view.getByText("Enter an exercise name.")).toBeTruthy();
    await fireEvent.changeText(view.getByTestId("custom-exercise-form-name"), "cable press");
    await fireEvent.press(view.getByTestId("muscle-group-chest"));
    await fireEvent.press(view.getByTestId("custom-exercise-form-save"));
    await waitFor(() => expect(view.getByText("That custom exercise name is already in use.")).toBeTruthy());
    expect(source.createCustom).not.toHaveBeenCalled();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("keeps the prior selection, form values, and focus on persistence failure", async () => {
    const source = repository({ createCustom: jest.fn().mockRejectedValue(new Error("disk full")) });
    const { view, onSelect } = await renderPicker(source, firstBuiltin.id);
    await waitFor(() => expect(view.getByTestId("picker-create")).toBeTruthy());
    await fireEvent.press(view.getByTestId("picker-create"));
    await fireEvent.changeText(view.getByTestId("custom-exercise-form-name"), "Saved later");
    await fireEvent.press(view.getByTestId("muscle-group-chest"));
    await fireEvent.press(view.getByTestId("custom-exercise-form-save"));
    await waitFor(() => expect(view.getByText("The exercise catalog could not be saved.")).toBeTruthy());
    expect(view.getByTestId("custom-exercise-form-name").props.value).toBe("Saved later");
    expect(view.getByTestId(`picker-select-${firstBuiltin.id}`).props.accessibilityState.selected).toBe(true);
    expect(onSelect).not.toHaveBeenCalled();
    expect(view.getByTestId("custom-exercise-form-cancel")).toBeTruthy();
  });

  it("does not offer choices until loaded and retries a failed load", async () => {
    const read = jest.fn().mockRejectedValueOnce(new Error("read failed"))
      .mockResolvedValueOnce(snapshot());
    const { view, onSelect } = await renderPicker(repository({ read }));
    await waitFor(() => expect(view.getByTestId("picker-load-error")).toBeTruthy());
    expect(view.queryByTestId(`picker-select-${firstBuiltin.id}`)).toBeNull();
    await fireEvent.press(view.getByTestId("picker-retry"));
    await waitFor(() => expect(view.getByTestId(`picker-select-${firstBuiltin.id}`)).toBeTruthy());
    expect(read).toHaveBeenCalledTimes(2);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("uses localized names and accent-insensitive search in Spanish", async () => {
    const { view, onSelect } = await renderPicker(repository(), null, "es");
    await waitFor(() => expect(view.getByTestId("picker-search")).toBeTruthy());
    expect(view.getByTestId("picker-search").props.accessibilityLabel).toBe("Buscar ejercicios");
    await fireEvent.changeText(view.getByTestId("picker-search"), "flexion");
    expect(view.getByText("Flexión")).toBeTruthy();
    expect(view.queryByText("Press de banca con barra")).toBeNull();
    await fireEvent.press(view.getByTestId("picker-clear-search"));
    expect(view.getByText("Press de banca con barra")).toBeTruthy();
    await fireEvent.press(view.getByTestId(`picker-select-${firstBuiltin.id}`));
    expect(onSelect).toHaveBeenCalledWith(firstBuiltin.id);
  });
});
