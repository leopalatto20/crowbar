import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { I18nextProvider } from "react-i18next";
import { AccessibilityInfo, StyleSheet } from "react-native";

import { createI18n } from "../../../i18n";
import { ExerciseCatalogProvider } from "../exercise-catalog-provider";
import { builtinExercises } from "../data/builtin-exercises";
import type {
  ExerciseCatalogRepository,
  ExerciseCatalogSnapshot,
  PersistedCustomExercise,
} from "../data/exercise-catalog-repository";
import type { ExerciseId } from "../model/catalog";
import { ExerciseCatalogScreen } from "../ui/exercise-catalog-screen";

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
if (!firstBuiltin) {
  throw new Error("The starter manifest must contain an exercise.");
}

const customExerciseId = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as ExerciseId;
const createdExerciseId = "cccccccccccccccccccccccccccccccc" as ExerciseId;
const customExercise: PersistedCustomExercise = {
  id: customExerciseId,
  displayName: "Cable Row Plus",
  nameKey: "cable row plus",
  muscleGroup: "upper-back",
  isAvailable: true,
};

function snapshot(
  customExercises: readonly PersistedCustomExercise[] = [],
  hiddenBuiltinIds: readonly ExerciseId[] = [],
): ExerciseCatalogSnapshot {
  return { customExercises, hiddenBuiltinIds };
}

function createRepository(
  overrides: Partial<ExerciseCatalogRepository> = {},
): ExerciseCatalogRepository {
  return {
    read: jest.fn().mockResolvedValue(snapshot()),
    createCustom: jest.fn(),
    updateCustom: jest.fn(),
    setCustomAvailability: jest.fn(),
    setBuiltinAvailability: jest.fn().mockResolvedValue({
      id: firstBuiltin.id,
      isAvailable: false,
    }),
    ...overrides,
  };
}

async function renderScreen(
  repository: ExerciseCatalogRepository,
  language: "en" | "es" = "en",
) {
  const i18n = await createI18n([{ languageCode: language }]);
  const view = await render(
    <I18nextProvider i18n={i18n}>
      <ExerciseCatalogProvider repository={repository}>
        <ExerciseCatalogScreen />
      </ExerciseCatalogProvider>
    </I18nextProvider>,
  );

  return { i18n, view };
}

describe("ExerciseCatalogScreen", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("shows loading while the catalog read is pending", async () => {
    let resolveRead: (value: ExerciseCatalogSnapshot) => void = () => undefined;
    const pendingRead = new Promise<ExerciseCatalogSnapshot>((resolve) => {
      resolveRead = resolve;
    });
    const repository = createRepository({ read: jest.fn().mockReturnValue(pendingRead) });
    const { view } = await renderScreen(repository);

    expect(view.getByTestId("catalog-loading")).toBeTruthy();
    await act(async () => {
      resolveRead(snapshot());
      await pendingRead;
    });
  });

  it("retries a failed catalog load", async () => {
    const read = jest.fn().mockRejectedValue(new Error("offline"));
    const repository = createRepository({ read });
    const { view } = await renderScreen(repository);

    await waitFor(() => expect(view.getByTestId("catalog-load-error")).toBeTruthy());
    expect(view.getByText("The exercise catalog could not be loaded.")).toBeTruthy();

    read.mockResolvedValue(snapshot());
    await fireEvent.press(view.getByTestId("catalog-retry"));

    await waitFor(() => expect(view.getByTestId("catalog-search")).toBeTruthy());
    expect(read).toHaveBeenCalledTimes(2);
  });

  it("combines search and group filtering in both views and clears the criteria", async () => {
    const repository = createRepository({
      read: jest.fn().mockResolvedValue(snapshot([], [firstBuiltin.id])),
    });
    const { view } = await renderScreen(repository);
    await waitFor(() => expect(view.getByTestId("catalog-search")).toBeTruthy());

    await fireEvent.changeText(view.getByTestId("catalog-search"), "barbell");
    await fireEvent.press(view.getByTestId("catalog-filter-chest"));

    expect(view.queryByText("Barbell Bench Press")).toBeNull();
    expect(view.getByText("Incline Barbell Bench Press")).toBeTruthy();
    expect(view.queryByText("Barbell Row")).toBeNull();

    await fireEvent.press(view.getByTestId("catalog-view-unavailable"));

    expect(view.getByText("Barbell Bench Press")).toBeTruthy();
    expect(view.queryByText("Incline Barbell Bench Press")).toBeNull();

    await fireEvent.changeText(view.getByTestId("catalog-search"), "nothing matches");
    expect(view.getByTestId("catalog-empty")).toBeTruthy();

    await fireEvent.press(view.getByTestId("catalog-clear-search"));
    expect(view.getByText("Barbell Bench Press")).toBeTruthy();
    await fireEvent.press(view.getByTestId("catalog-clear-filters"));
    expect(view.getByTestId("catalog-filter-all").props.accessibilityState).toEqual(
      expect.objectContaining({ selected: true }),
    );
    expect(view.getByTestId("catalog-search").props.value).toBe("");
  });

  it("creates, edits, archives, hides, and restores only the actions allowed by origin", async () => {
    const announce = jest
      .spyOn(AccessibilityInfo, "announceForAccessibility")
      .mockImplementation(() => undefined);
    const createdExercise: PersistedCustomExercise = {
      id: createdExerciseId,
      displayName: "Tempo Press",
      nameKey: "tempo press",
      muscleGroup: "chest",
      isAvailable: true,
    };
    const editedExercise = {
      ...createdExercise,
      displayName: "Tempo Chest Press",
      nameKey: "tempo chest press",
    };
    const repository = createRepository({
      read: jest.fn().mockResolvedValue(snapshot([customExercise])),
      createCustom: jest.fn().mockResolvedValue(createdExercise),
      updateCustom: jest.fn().mockResolvedValue(editedExercise),
      setCustomAvailability: jest
        .fn()
        .mockResolvedValueOnce({ ...editedExercise, isAvailable: false })
        .mockResolvedValueOnce({ ...editedExercise, isAvailable: true }),
    });
    const { view } = await renderScreen(repository);
    await waitFor(() => expect(view.getByTestId("catalog-create")).toBeTruthy());

    expect(view.queryByTestId(`catalog-edit-${firstBuiltin.id}`)).toBeNull();
    expect(view.getByTestId(`catalog-availability-${firstBuiltin.id}`)).toBeTruthy();

    await fireEvent.press(view.getByTestId("catalog-create"));
    await fireEvent.changeText(view.getByTestId("custom-exercise-form-name"), "Tempo Press");
    await fireEvent.press(view.getByTestId("muscle-group-chest"));
    await fireEvent.press(view.getByTestId("custom-exercise-form-save"));
    await waitFor(() => expect(view.getByText("Tempo Press")).toBeTruthy());

    await fireEvent.press(view.getByTestId(`catalog-edit-${createdExerciseId}`));
    await fireEvent.changeText(
      view.getByTestId("custom-exercise-form-name"),
      "Tempo Chest Press",
    );
    await fireEvent.press(view.getByTestId("custom-exercise-form-save"));
    await waitFor(() => expect(view.getByText("Tempo Chest Press")).toBeTruthy());

    await fireEvent.press(view.getByTestId(`catalog-availability-${createdExerciseId}`));
    await waitFor(() => expect(view.queryByText("Tempo Chest Press")).toBeNull());
    await fireEvent.press(view.getByTestId(`catalog-availability-${firstBuiltin.id}`));
    await waitFor(() => expect(view.queryByText("Barbell Bench Press")).toBeNull());

    await fireEvent.press(view.getByTestId("catalog-view-unavailable"));
    expect(view.getByText("Tempo Chest Press")).toBeTruthy();
    expect(view.getByText("Barbell Bench Press")).toBeTruthy();

    await fireEvent.press(view.getByTestId(`catalog-availability-${createdExerciseId}`));
    await waitFor(() => expect(view.queryByText("Tempo Chest Press")).toBeNull());
    await fireEvent.press(view.getByTestId(`catalog-availability-${firstBuiltin.id}`));
    await waitFor(() => expect(view.queryByText("Barbell Bench Press")).toBeNull());

    expect(repository.createCustom).toHaveBeenCalledTimes(1);
    expect(repository.updateCustom).toHaveBeenCalledWith(
      createdExerciseId,
      expect.objectContaining({ displayName: "Tempo Chest Press" }),
    );
    expect(repository.setCustomAvailability).toHaveBeenNthCalledWith(
      1,
      createdExerciseId,
      false,
    );
    expect(repository.setCustomAvailability).toHaveBeenNthCalledWith(
      2,
      createdExerciseId,
      true,
    );
    expect(repository.setBuiltinAvailability).toHaveBeenNthCalledWith(
      1,
      firstBuiltin.id,
      false,
    );
    expect(repository.setBuiltinAvailability).toHaveBeenNthCalledWith(
      2,
      firstBuiltin.id,
      true,
    );
    expect(announce).toHaveBeenCalledWith("Exercise created");
    expect(announce).toHaveBeenCalledWith("Exercise updated");
    expect(announce).toHaveBeenCalledWith("Exercise archived");
    expect(announce).toHaveBeenCalledWith("Exercise restored");
    expect(announce).toHaveBeenCalledWith("Exercise hidden");
    expect(announce).toHaveBeenCalledWith("Exercise shown");
  });

  it("keeps durable rows visible and retries failed availability mutations", async () => {
    const repository = createRepository({
      setBuiltinAvailability: jest
        .fn()
        .mockRejectedValueOnce(new Error("disk full"))
        .mockResolvedValueOnce({ id: firstBuiltin.id, isAvailable: false }),
    });
    const { view } = await renderScreen(repository);
    await waitFor(() => expect(view.getByText("Barbell Bench Press")).toBeTruthy());

    await fireEvent.press(view.getByTestId(`catalog-availability-${firstBuiltin.id}`));

    await waitFor(() => expect(view.getByTestId("catalog-action-error")).toBeTruthy());
    expect(view.getByText("Barbell Bench Press")).toBeTruthy();
    expect(view.getByText("The exercise catalog could not be saved.")).toBeTruthy();

    await fireEvent.press(view.getByTestId("catalog-action-retry"));

    await waitFor(() => expect(view.queryByText("Barbell Bench Press")).toBeNull());
    expect(repository.setBuiltinAvailability).toHaveBeenCalledTimes(2);
  });

  it("restores logical focus and exposes 44-point accessible controls", async () => {
    const sendAccessibilityEvent = jest
      .spyOn(AccessibilityInfo, "sendAccessibilityEvent")
      .mockImplementation(() => undefined);
    const repository = createRepository({
      read: jest.fn().mockResolvedValue(snapshot([customExercise])),
    });
    const { view } = await renderScreen(repository);
    await waitFor(() => expect(view.getByTestId("catalog-create")).toBeTruthy());

    await fireEvent.press(view.getByTestId("catalog-create"));
    await fireEvent.press(view.getByTestId("custom-exercise-form-cancel"));

    expect(sendAccessibilityEvent).toHaveBeenCalledWith(expect.anything(), "focus");
    expect(StyleSheet.flatten(view.getByTestId("catalog-create").props.style).minHeight).toBe(44);
    expect(
      StyleSheet.flatten(
        view.getByTestId(`catalog-availability-${firstBuiltin.id}`).props.style,
      ).minHeight,
    ).toBe(44);
    expect(view.getByTestId("catalog-search").props.accessibilityLabel).toBe("Search exercises");
    expect(view.getByTestId("catalog-view-available").props.accessibilityState).toEqual(
      expect.objectContaining({ selected: true }),
    );
  });

  it("renders supported Spanish catalog copy without translating custom names", async () => {
    const repository = createRepository({
      read: jest.fn().mockResolvedValue(snapshot([customExercise])),
    });
    const { view } = await renderScreen(repository, "es");
    await waitFor(() => expect(view.getByTestId("catalog-search")).toBeTruthy());

    expect(view.getByTestId("catalog-search").props.accessibilityLabel).toBe("Buscar ejercicios");
    expect(view.getByText("Press de banca con barra")).toBeTruthy();
    await fireEvent.changeText(view.getByTestId("catalog-search"), "Cable Row Plus");
    await waitFor(() => expect(view.getByText("Cable Row Plus")).toBeTruthy());
    expect(view.getAllByText("Personalizado").length).toBeGreaterThan(0);
    expect(view.getByText("Ejercicios no disponibles")).toBeTruthy();
  });
});
