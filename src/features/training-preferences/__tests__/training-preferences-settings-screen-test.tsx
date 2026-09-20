import { I18nextProvider } from "react-i18next";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";

import { createI18n } from "../../../i18n";
import { en } from "../../../i18n/locales/en";
import { es } from "../../../i18n/locales/es";
import type { TrainingPreferencesRepository } from "../data/training-preferences-repository";
import { convertEffort } from "../model/effort";
import { TrainingPreferencesProvider, useTrainingPreferences } from "../training-preferences-provider";
import { TrainingPreferencesSettingsScreen } from "../ui/training-preferences-settings-screen";

jest.mock("expo-sqlite", () => ({
  useSQLiteContext: () => ({ getFirstAsync: jest.fn(), runAsync: jest.fn() }),
}));

function EffortConsumer(): React.JSX.Element {
  const { metric } = useTrainingPreferences();
  const currentMetric = metric ?? "rpe";

  return (
    <Text testID="effort-consumer">
      {`${currentMetric}:${convertEffort(8, "rpe", currentMetric)}`}
    </Text>
  );
}

async function renderSettings(
  repository: TrainingPreferencesRepository,
  languageCode = "en",
  onSaved = jest.fn(),
): Promise<Awaited<ReturnType<typeof render>>> {
  const instance = await createI18n([{ languageCode }], {
    en: { translation: en },
    es: { translation: es },
  });

  return render(
    <I18nextProvider i18n={instance}>
        <TrainingPreferencesProvider repository={repository}>
        <TrainingPreferencesSettingsScreen onSaved={onSaved} />
        <EffortConsumer />
      </TrainingPreferencesProvider>
    </I18nextProvider>,
  );
}

describe("TrainingPreferencesSettingsScreen", () => {
  it("updates mounted consumers only after a successful change", async () => {
    const onSaved = jest.fn();
    let resolveSave: () => void = () => undefined;
    const savePromise = new Promise<void>((resolve) => {
      resolveSave = resolve;
    });
    const repository: TrainingPreferencesRepository = {
      read: jest.fn().mockResolvedValue("rpe"),
      save: jest.fn().mockReturnValue(savePromise),
    };
    const view = await renderSettings(repository, "en", onSaved);

    await waitFor(() => expect(view.getByTestId("effort-consumer")).toHaveTextContent("rpe:8"));
    fireEvent.press(view.getByTestId("effort-metric-rir"));
    await waitFor(() =>
      expect(view.getByTestId("effort-metric-rir").props.accessibilityState.checked).toBe(true),
    );
    expect(view.getByTestId("effort-consumer")).toHaveTextContent("rpe:8");

    await act(async () => {
      fireEvent.press(view.getByTestId("settings-save"));
      await Promise.resolve();
    });
    await waitFor(() => expect(repository.save).toHaveBeenCalledWith("rir"));
    expect(view.getByTestId("effort-consumer")).toHaveTextContent("rpe:8");

    await act(async () => {
      resolveSave();
      await savePromise;
    });
    await waitFor(() => expect(view.getByTestId("effort-consumer")).toHaveTextContent("rir:2"));
    expect(view.getByTestId("current-metric")).toHaveTextContent("Current effort metric: RIR");
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it("persists an identity save without changing the current metric", async () => {
    let resolveSave: () => void = () => undefined;
    const savePromise = new Promise<void>((resolve) => {
      resolveSave = resolve;
    });
    const save = jest.fn().mockReturnValue(savePromise);
    const repository: TrainingPreferencesRepository = {
      read: jest.fn().mockResolvedValue("rir"),
      save,
    };
    const view = await renderSettings(repository);

    await waitFor(() =>
      expect(view.getByTestId("current-metric")).toHaveTextContent("Current effort metric: RIR"),
    );
    await act(async () => {
      fireEvent.press(view.getByTestId("settings-save"));
      await Promise.resolve();
    });
    await waitFor(() => expect(save).toHaveBeenCalledWith("rir"));
    await act(async () => {
      resolveSave();
      await savePromise;
    });
    expect(view.getByTestId("effort-consumer")).toHaveTextContent("rir:2");
  });

  it("retains the durable metric and exposes a retryable save error", async () => {
    let rejectSave: (error: Error) => void = () => undefined;
    const savePromise = new Promise<void>((_, reject) => {
      rejectSave = reject;
    });
    const repository: TrainingPreferencesRepository = {
      read: jest.fn().mockResolvedValue("rpe"),
      save: jest.fn().mockReturnValue(savePromise),
    };
    const view = await renderSettings(repository);

    await waitFor(() =>
      expect(view.getByTestId("current-metric")).toHaveTextContent("Current effort metric: RPE"),
    );
    fireEvent.press(view.getByTestId("effort-metric-rir"));
    await waitFor(() =>
      expect(view.getByTestId("effort-metric-rir").props.accessibilityState.checked).toBe(true),
    );
    await act(async () => {
      fireEvent.press(view.getByTestId("settings-save"));
      await Promise.resolve();
    });
    await waitFor(() => expect(view.getByTestId("settings-save").props.accessibilityState.busy).toBe(true));

    await act(async () => {
      rejectSave(new Error("offline"));
      await expect(savePromise).rejects.toThrow("offline");
    });
    await waitFor(() => expect(view.getByText("Your training preference could not be saved.")).toBeTruthy());
    expect(view.getByTestId("current-metric")).toHaveTextContent("Current effort metric: RPE");
    expect(view.getByTestId("effort-consumer")).toHaveTextContent("rpe:8");
    expect(view.getByTestId("settings-save").props.accessibilityState.disabled).toBe(false);
  });

  it("does not invent a current metric when the durable preference is absent", async () => {
    const repository: TrainingPreferencesRepository = {
      read: jest.fn().mockResolvedValue(null),
      save: jest.fn(),
    };
    const view = await renderSettings(repository);

    await waitFor(() =>
      expect(view.getByTestId("current-metric")).toHaveTextContent(
        "Loading training preference",
      ),
    );
    expect(view.getByTestId("current-metric")).not.toHaveTextContent("RPE");
    expect(view.getByTestId("settings-save").props.accessibilityState.disabled).toBe(true);
  });

  it.each([
    ["en", "Training preference", "Current effort metric: RPE"],
    ["es", "Preferencia de entrenamiento", "Métrica de esfuerzo actual: RPE"],
    ["fr", "Training preference", "Current effort metric: RPE"],
  ])("uses %s or English fallback settings copy", async (languageCode, title, currentMetric) => {
    const repository: TrainingPreferencesRepository = {
      read: jest.fn().mockResolvedValue("rpe"),
      save: jest.fn(),
    };
    const view = await renderSettings(repository, languageCode);

    await waitFor(() => expect(view.getByText(title)).toBeTruthy());
    expect(view.getByTestId("current-metric")).toHaveTextContent(currentMetric);
  });
});
