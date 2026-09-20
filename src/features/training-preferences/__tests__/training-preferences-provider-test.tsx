import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { useEffect } from "react";
import { Pressable, Text } from "react-native";

import type { TrainingPreferencesRepository } from "../data/training-preferences-repository";
import {
  TrainingPreferencesProvider,
  useTrainingPreferences,
} from "../training-preferences-provider";

jest.mock("expo-sqlite", () => ({
  useSQLiteContext: (() => {
    const database = { getFirstAsync: jest.fn(), runAsync: jest.fn() };
    return () => database;
  })(),
}));

function Consumer(): React.JSX.Element {
  const { metric, retry, save, state } = useTrainingPreferences();

  return (
    <>
      <Text>{`${state.status}:${metric ?? "none"}`}</Text>
      <Pressable accessibilityRole="button" onPress={() => void save("rpe")}>
        <Text>save-rpe</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={() => void save("rir")}>
        <Text>save-rir</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={retry}>
        <Text>retry</Text>
      </Pressable>
    </>
  );
}

function ConcurrentSaveConsumer({
  onSave,
}: {
  onSave: (save: (metric: "rpe" | "rir") => Promise<void>) => void;
}): React.JSX.Element {
  const { save, state } = useTrainingPreferences();

  useEffect(() => {
    onSave(save);
  }, [onSave, save]);

  return <Text>{`${state.status}:${state.metric ?? "none"}`}</Text>;
}

async function renderProvider(repository: TrainingPreferencesRepository) {
  return render(
    <TrainingPreferencesProvider repository={repository}>
      <Consumer />
    </TrainingPreferencesProvider>,
  );
}

describe("TrainingPreferencesProvider", () => {
  it("hydrates a preference and saves pessimistically", async () => {
    let resolveRead: (metric: "rpe" | "rir") => void = () => undefined;
    const readPromise = new Promise<"rpe" | "rir">((resolve) => {
      resolveRead = resolve;
    });
    let resolveSave: () => void = () => undefined;
    const savePromise = new Promise<void>((resolve) => {
      resolveSave = resolve;
    });
    const repository: TrainingPreferencesRepository = {
      read: jest.fn().mockReturnValue(readPromise),
      save: jest.fn().mockReturnValue(savePromise),
    };
    const view = await renderProvider(repository);

    expect(view.getByText("loading:none")).toBeTruthy();
    await act(async () => {
      resolveRead("rir");
      await readPromise;
    });
    await waitFor(() => expect(view.getByText("ready:rir")).toBeTruthy());

    await act(async () => {
      fireEvent.press(view.getByText("save-rpe"));
      await Promise.resolve();
    });
    await waitFor(() => expect(view.getByText("saving:rir")).toBeTruthy());
    await act(async () => {
      resolveSave();
      await savePromise;
    });
    await waitFor(() => expect(view.getByText("ready:rpe")).toBeTruthy());
    expect(repository.save).toHaveBeenCalledWith("rpe");
  });

  it("retains the prior metric after a failed save", async () => {
    let rejectSave: (error: Error) => void = () => undefined;
    const savePromise = new Promise<void>((_, reject) => {
      rejectSave = reject;
    });
    const repository: TrainingPreferencesRepository = {
      read: jest.fn().mockResolvedValue("rir"),
      save: jest.fn().mockReturnValue(savePromise),
    };
    const view = await renderProvider(repository);

    await waitFor(() => expect(view.getByText("ready:rir")).toBeTruthy());
    await act(async () => {
      fireEvent.press(view.getByText("save-rpe"));
      await Promise.resolve();
    });
    await waitFor(() => expect(view.getByText("saving:rir")).toBeTruthy());
    await act(async () => {
      rejectSave(new Error("offline"));
      await expect(savePromise).rejects.toThrow("offline");
    });
    await waitFor(() => expect(view.getByText("save-error:rir")).toBeTruthy());
  });

  it("allows a failed load to be retried", async () => {
    let rejectRead: (error: Error) => void = () => undefined;
    let resolveRead: (metric: "rpe" | "rir") => void = () => undefined;
    const failedRead = new Promise<"rpe" | "rir">((_, reject) => {
      rejectRead = reject;
    });
    const successfulRead = new Promise<"rpe" | "rir">((resolve) => {
      resolveRead = resolve;
    });
    const read = jest.fn().mockReturnValueOnce(failedRead).mockReturnValueOnce(successfulRead);
    const repository: TrainingPreferencesRepository = {
      read,
      save: jest.fn(),
    };
    const view = await renderProvider(repository);

    await act(async () => {
      rejectRead(new Error("offline"));
      await expect(failedRead).rejects.toThrow("offline");
    });
    await waitFor(() => expect(view.getByText("load-error:none")).toBeTruthy());
    fireEvent.press(view.getByText("retry"));
    await waitFor(() => expect(view.getByText("loading:none")).toBeTruthy());
    await act(async () => {
      resolveRead("rpe");
      await successfulRead;
    });
    await waitFor(() => expect(view.getByText("ready:rpe")).toBeTruthy());
    expect(read).toHaveBeenCalledTimes(2);
  });

  it("serializes concurrent saves in invocation order", async () => {
    let resolveRpe: () => void = () => undefined;
    let resolveRir: () => void = () => undefined;
    const rpeSave = new Promise<void>((resolve) => {
      resolveRpe = resolve;
    });
    const rirSave = new Promise<void>((resolve) => {
      resolveRir = resolve;
    });
    const save = jest.fn((metric: "rpe" | "rir") => (metric === "rpe" ? rpeSave : rirSave));
    const repository: TrainingPreferencesRepository = {
      read: jest.fn().mockResolvedValue("rir"),
      save,
    };
    let savePreference: ((metric: "rpe" | "rir") => Promise<void>) | undefined;
    const view = await render(
      <TrainingPreferencesProvider repository={repository}>
        <ConcurrentSaveConsumer onSave={(currentSave) => { savePreference = currentSave; }} />
      </TrainingPreferencesProvider>,
    );

    await waitFor(() => expect(view.getByText("ready:rir")).toBeTruthy());
    let firstSave: Promise<void> | undefined;
    let secondSave: Promise<void> | undefined;
    await act(async () => {
      firstSave = savePreference?.("rpe");
      secondSave = savePreference?.("rir");
      await Promise.resolve();
    });
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save).toHaveBeenLastCalledWith("rpe");

    await act(async () => {
      resolveRpe();
      await firstSave;
    });
    await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
    expect(save).toHaveBeenLastCalledWith("rir");

    await act(async () => {
      resolveRir();
      await secondSave;
    });
    await waitFor(() => expect(view.getByText("ready:rir")).toBeTruthy());
  });

});
