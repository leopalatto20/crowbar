import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import type { TrainingPreferencesRepository } from "../data/training-preferences-repository";
import { FirstRunPreferenceScreen } from "../ui/first-run-preference-screen";
import { TrainingPreferencesProvider } from "../training-preferences-provider";

jest.mock("expo-sqlite", () => ({
  useSQLiteContext: () => ({ getFirstAsync: jest.fn(), runAsync: jest.fn() }),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { metric?: string }) =>
      options?.metric ? `${key}:${options.metric}` : key,
  }),
}));

async function renderScreen(repository: TrainingPreferencesRepository) {
  return render(
    <TrainingPreferencesProvider repository={repository}>
      <FirstRunPreferenceScreen />
    </TrainingPreferencesProvider>,
  );
}

describe("FirstRunPreferenceScreen", () => {
  it("starts with neither metric selected and requires a choice", async () => {
    const repository: TrainingPreferencesRepository = {
      read: jest.fn().mockResolvedValue(null),
      save: jest.fn(),
    };
    const view = await renderScreen(repository);

    await waitFor(() => expect(view.getByTestId("first-run-save")).toBeTruthy());
    expect(view.getByTestId("effort-metric-rpe").props.accessibilityState).toEqual({
      disabled: false,
      selected: false,
    });
    expect(view.getByTestId("effort-metric-rir").props.accessibilityState).toEqual({
      disabled: false,
      selected: false,
    });
    expect(view.getByTestId("first-run-save").props.accessibilityState).toEqual({
      busy: false,
      disabled: true,
    });
    expect(repository.save).not.toHaveBeenCalled();
  });

  it("selects and durably saves the chosen metric", async () => {
    let resolveSave: () => void = () => undefined;
    const savePromise = new Promise<void>((resolve) => {
      resolveSave = resolve;
    });
    const save = jest.fn().mockReturnValue(savePromise);
    const repository: TrainingPreferencesRepository = {
      read: jest.fn().mockResolvedValue(null),
      save,
    };
    const view = await renderScreen(repository);

    fireEvent.press(view.getByTestId("effort-metric-rpe"));
    await waitFor(() =>
      expect(view.getByTestId("effort-metric-rpe").props.accessibilityState.selected).toBe(true),
    );
    expect(view.getByTestId("effort-metric-rpe").props.accessibilityRole).toBe("radio");
    fireEvent.press(view.getByTestId("first-run-save"));

    await waitFor(() => expect(save).toHaveBeenCalledWith("rpe"));
    await act(async () => {
      resolveSave();
      await savePromise;
    });
    await waitFor(() =>
      expect(view.getByTestId("first-run-save").props.accessibilityState.disabled).toBe(false),
    );
  });

  it("disables controls while saving and shows a recoverable localized error", async () => {
    let rejectSave: (error: Error) => void = () => undefined;
    const savePromise = new Promise<void>((_, reject) => {
      rejectSave = reject;
    });
    const repository: TrainingPreferencesRepository = {
      read: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockReturnValue(savePromise),
    };
    const view = await renderScreen(repository);

    fireEvent.press(view.getByTestId("effort-metric-rir"));
    await waitFor(() =>
      expect(view.getByTestId("effort-metric-rir").props.accessibilityState.selected).toBe(true),
    );
    fireEvent.press(view.getByTestId("first-run-save"));
    await waitFor(() =>
      expect(view.getByTestId("effort-metric-rir").props.accessibilityState.disabled).toBe(true),
    );
    expect(view.getByTestId("first-run-save").props.accessibilityState.busy).toBe(true);

    await act(async () => {
      rejectSave(new Error("offline"));
      await expect(savePromise).rejects.toThrow("offline");
    });

    await waitFor(() => expect(view.getByText("trainingPreferences.errors.saveFailed")).toBeTruthy());
    expect(view.getByTestId("effort-metric-rir").props.accessibilityState.selected).toBe(true);
    expect(view.getByTestId("first-run-save").props.accessibilityState.disabled).toBe(false);
  });
});
