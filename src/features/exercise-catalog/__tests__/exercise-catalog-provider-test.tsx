import { act, render, waitFor } from "@testing-library/react-native";
import { useEffect } from "react";
import { I18nextProvider } from "react-i18next";
import { Text } from "react-native";

import { builtinExercises } from "../data/builtin-exercises";
import type {
  ExerciseCatalogRepository,
  ExerciseCatalogSnapshot,
  PersistedCustomExercise,
} from "../data/exercise-catalog-repository";
import type { ExerciseId } from "../model/catalog";
import { createI18n } from "../../../i18n";
import {
  ExerciseCatalogProvider,
  useExerciseCatalog,
  type ExerciseCatalogContextValue,
} from "../exercise-catalog-provider";

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
const customExercise: PersistedCustomExercise = {
  id: customExerciseId,
  displayName: "Cable Row",
  nameKey: "cable row",
  muscleGroup: "upper-back",
  isAvailable: true,
};

let currentCatalog: ExerciseCatalogContextValue | null = null;

function Consumer({
  onCatalog,
}: {
  onCatalog: (catalog: ExerciseCatalogContextValue) => void;
}): React.JSX.Element {
  const catalog = useExerciseCatalog();

  useEffect(() => {
    onCatalog(catalog);
  }, [catalog, onCatalog]);

  return (
    <>
      <Text testID="status">{catalog.state.status}</Text>
      <Text testID="builtin-name">{catalog.resolve(builtinExercises[0].id)?.displayName}</Text>
      <Text testID="custom-name">{catalog.resolve(customExerciseId)?.displayName ?? "missing"}</Text>
    </>
  );
}

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
    setBuiltinAvailability: jest.fn(),
    ...overrides,
  };
}

async function renderProvider(repository: ExerciseCatalogRepository) {
  const i18n = await createI18n([{ languageCode: "en" }]);
  const view = await render(
    <I18nextProvider i18n={i18n}>
      <ExerciseCatalogProvider repository={repository}>
        <Consumer onCatalog={(catalog) => { currentCatalog = catalog; }} />
      </ExerciseCatalogProvider>
    </I18nextProvider>,
  );

  await waitFor(() => expect(view.getByTestId("status").props.children).toBe("ready"));

  return { i18n, view };
}

describe("ExerciseCatalogProvider", () => {
  afterEach(() => {
    currentCatalog = null;
  });

  it("retries a failed load while retaining the last durable catalog", async () => {
    const read = jest
      .fn()
      .mockResolvedValueOnce(snapshot([customExercise]))
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(snapshot());
    const { view } = await renderProvider(createRepository({ read }));

    expect(view.getByTestId("custom-name").props.children).toBe("Cable Row");
    await act(async () => {
      currentCatalog?.retryLoad();
    });

    await waitFor(() => expect(view.getByTestId("status").props.children).toBe("load-error"));
    expect(view.getByTestId("custom-name").props.children).toBe("Cable Row");

    await act(async () => {
      currentCatalog?.retryLoad();
    });

    await waitFor(() => expect(view.getByTestId("status").props.children).toBe("ready"));
    expect(view.getByTestId("custom-name").props.children).toBe("missing");
  });

  it("re-resolves built-in names when the active locale changes", async () => {
    const { i18n, view } = await renderProvider(createRepository());
    const englishName = view.getByTestId("builtin-name").props.children;

    await act(async () => {
      await i18n.changeLanguage("es");
    });

    await waitFor(() => expect(view.getByTestId("builtin-name").props.children).not.toBe(englishName));
  });

  it("creates and updates custom exercises in place for every mounted consumer", async () => {
    const createdExercise: PersistedCustomExercise = {
      ...customExercise,
      displayName: "Cable Pulldown",
      nameKey: "cable pulldown",
      muscleGroup: "lats",
    };
    const updatedExercise: PersistedCustomExercise = {
      ...createdExercise,
      displayName: "Straight-Arm Cable Pulldown",
      nameKey: "straight-arm cable pulldown",
    };
    const repository = createRepository({
      createCustom: jest.fn().mockResolvedValue(createdExercise),
      updateCustom: jest.fn().mockResolvedValue(updatedExercise),
    });
    const { view } = await renderProvider(repository);

    let createResult: Awaited<ReturnType<ExerciseCatalogContextValue["createCustom"]>> | undefined;
    await act(async () => {
      createResult = await currentCatalog?.createCustom({
        displayName: "Cable Pulldown",
        muscleGroup: "lats",
      });
    });
    expect(createResult).toEqual({ ok: true, value: customExerciseId });

    let updateResult: Awaited<ReturnType<ExerciseCatalogContextValue["updateCustom"]>> | undefined;
    await act(async () => {
      updateResult = await currentCatalog?.updateCustom(customExerciseId, {
        displayName: "Straight-Arm Cable Pulldown",
        muscleGroup: "lats",
      });
    });

    expect(updateResult).toEqual({
      ok: true,
      value: {
        id: customExerciseId,
        displayName: "Straight-Arm Cable Pulldown",
        muscleGroup: "lats",
        origin: "custom",
        isAvailable: true,
      },
    });
    expect(view.getByTestId("custom-name").props.children).toBe("Straight-Arm Cable Pulldown");
  });

  it("resolves unavailable entries and retains the durable catalog after a failed write", async () => {
    let rejectWrite: (error: Error) => void = () => undefined;
    const failedWrite = new Promise<PersistedCustomExercise>((_, reject) => {
      rejectWrite = reject;
    });
    const repository = createRepository({
      read: jest.fn().mockResolvedValue(snapshot([customExercise])),
      setCustomAvailability: jest.fn().mockReturnValue(failedWrite),
    });
    const { view } = await renderProvider(repository);

    let failedResult: Awaited<ReturnType<ExerciseCatalogContextValue["setAvailability"]>> | undefined;
    let mutation: Promise<
      Awaited<ReturnType<ExerciseCatalogContextValue["setAvailability"]>>
    > | undefined;
    await act(async () => {
      mutation = currentCatalog?.setAvailability(customExerciseId, false);
      await Promise.resolve();
    });
    await waitFor(() => expect(view.getByTestId("status").props.children).toBe("mutating"));
    await act(async () => {
      rejectWrite(new Error("offline"));
      failedResult = await mutation;
    });

    expect(failedResult).toEqual({ ok: false, reason: "persistence-error" });
    expect(view.getByTestId("status").props.children).toBe("mutation-error");
    expect(currentCatalog?.resolve(customExerciseId)?.isAvailable).toBe(true);

    (repository.setCustomAvailability as jest.Mock).mockResolvedValue({
      ...customExercise,
      isAvailable: false,
    });
    await act(async () => {
      await currentCatalog?.setAvailability(customExerciseId, false);
    });

    expect(currentCatalog?.listAvailable()).not.toContainEqual(
      expect.objectContaining({ id: customExerciseId }),
    );
    expect(currentCatalog?.resolve(customExerciseId)).toEqual(
      expect.objectContaining({ id: customExerciseId, isAvailable: false }),
    );

    (repository.setBuiltinAvailability as jest.Mock).mockResolvedValue({
      id: builtinExercises[0].id,
      isAvailable: false,
    });
    await act(async () => {
      await currentCatalog?.setAvailability(builtinExercises[0].id, false);
    });

    expect(currentCatalog?.resolve(builtinExercises[0].id)).toEqual(
      expect.objectContaining({ id: builtinExercises[0].id, isAvailable: false }),
    );
  });

  it("returns explicit validation, duplicate, not-found, and immutable results", async () => {
    const { view } = await renderProvider(
      createRepository({ read: jest.fn().mockResolvedValue(snapshot([customExercise])) }),
    );

    await act(async () => {
      await expect(
        currentCatalog?.createCustom({ displayName: "  ", muscleGroup: "chest" }),
      ).resolves.toEqual({ ok: false, reason: "invalid-input" });
      await expect(
        currentCatalog?.createCustom({ displayName: "CABLE ROW", muscleGroup: "upper-back" }),
      ).resolves.toEqual({ ok: false, reason: "duplicate-name" });
      await expect(
        currentCatalog?.updateCustom("bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as ExerciseId, {
          displayName: "New Row",
          muscleGroup: "upper-back",
        }),
      ).resolves.toEqual({ ok: false, reason: "not-found" });
      await expect(
        currentCatalog?.updateCustom(builtinExercises[0].id, {
          displayName: "Renamed",
          muscleGroup: "chest",
        }),
      ).resolves.toEqual({ ok: false, reason: "immutable-builtin" });
    });

    expect(view.getByTestId("custom-name").props.children).toBe("Cable Row");
  });

  it("serializes concurrent mutations in invocation order", async () => {
    let resolveFirst: (exercise: PersistedCustomExercise) => void = () => undefined;
    let resolveSecond: (exercise: PersistedCustomExercise) => void = () => undefined;
    const firstWrite = new Promise<PersistedCustomExercise>((resolve) => {
      resolveFirst = resolve;
    });
    const secondWrite = new Promise<PersistedCustomExercise>((resolve) => {
      resolveSecond = resolve;
    });
    const createCustom = jest
      .fn()
      .mockReturnValueOnce(firstWrite)
      .mockReturnValueOnce(secondWrite);
    await renderProvider(createRepository({ createCustom }));

    let firstMutation: Promise<unknown> | undefined;
    let secondMutation: Promise<unknown> | undefined;
    await act(async () => {
      firstMutation = currentCatalog?.createCustom({ displayName: "First", muscleGroup: "chest" });
      secondMutation = currentCatalog?.createCustom({ displayName: "Second", muscleGroup: "chest" });
      await Promise.resolve();
    });
    await waitFor(() => expect(createCustom).toHaveBeenCalledTimes(1));
    expect(createCustom).toHaveBeenLastCalledWith({
      displayName: "First",
      nameKey: "first",
      muscleGroup: "chest",
    });

    await act(async () => {
      resolveFirst({ ...customExercise, displayName: "First", nameKey: "first" });
      await firstMutation;
    });
    await waitFor(() => expect(createCustom).toHaveBeenCalledTimes(2));
    expect(createCustom).toHaveBeenLastCalledWith({
      displayName: "Second",
      nameKey: "second",
      muscleGroup: "chest",
    });

    await act(async () => {
      resolveSecond({ ...customExercise, displayName: "Second", nameKey: "second" });
      await secondMutation;
    });
    await waitFor(() => expect(currentCatalog?.listAvailable()).toHaveLength(76));
  });
});
