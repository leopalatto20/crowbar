import { render, waitFor } from "@testing-library/react-native";
import { Component } from "react";
import { Text } from "react-native";

import type { TrainingPreferencesRepository } from "../data/training-preferences-repository";
import {
  TrainingPreferencesProvider,
  useTrainingPreferences,
} from "../training-preferences-provider";

jest.mock("expo-sqlite", () => ({
  useSQLiteContext: (() => {
    const database = {
      getFirstAsync: jest.fn().mockResolvedValue(null),
      runAsync: jest.fn().mockResolvedValue(undefined),
    };
    return () => database;
  })(),
}));

function Consumer(): React.JSX.Element {
  const { state } = useTrainingPreferences();
  return <Text>{state.status}</Text>;
}

class ErrorBoundary extends Component<React.PropsWithChildren, { message: string | null }> {
  public state: { message: string | null } = { message: null };

  public static getDerivedStateFromError(error: Error): { message: string } {
    return { message: error.message };
  }

  public render(): React.ReactNode {
    return this.state.message ? <Text>{this.state.message}</Text> : this.props.children;
  }
}

describe("TrainingPreferencesProvider edge behavior", () => {
  it("creates its repository from SQLite when no repository is injected", async () => {
    const view = await render(
      <TrainingPreferencesProvider>
        <Consumer />
      </TrainingPreferencesProvider>,
    );

    await waitFor(() => expect(view.getByText("ready")).toBeTruthy());
  });

  it("ignores a load result after unmount", async () => {
    let resolveRead: (metric: "rpe" | "rir") => void = () => undefined;
    const readPromise = new Promise<"rpe" | "rir">((resolve) => {
      resolveRead = resolve;
    });
    const repository: TrainingPreferencesRepository = {
      read: jest.fn().mockReturnValue(readPromise),
      save: jest.fn(),
    };
    const view = await render(
      <TrainingPreferencesProvider repository={repository}>
        <Consumer />
      </TrainingPreferencesProvider>,
    );

    view.unmount();
    resolveRead("rpe");
    await readPromise;
    await new Promise<void>((resolve) => setImmediate(resolve));
  });

  it("ignores a load error after unmount", async () => {
    let rejectRead: (error: Error) => void = () => undefined;
    const readPromise = new Promise<"rpe" | "rir">((_, reject) => {
      rejectRead = reject;
    });
    const repository: TrainingPreferencesRepository = {
      read: jest.fn().mockReturnValue(readPromise),
      save: jest.fn(),
    };
    const view = await render(
      <TrainingPreferencesProvider repository={repository}>
        <Consumer />
      </TrainingPreferencesProvider>,
    );

    view.unmount();
    rejectRead(new Error("offline"));
    await expect(readPromise).rejects.toThrow("offline");
    await new Promise<void>((resolve) => setImmediate(resolve));
  });

  it("reports misuse of the hook outside its provider", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const view = await render(
      <ErrorBoundary>
        <Consumer />
      </ErrorBoundary>,
    );

    await waitFor(() =>
      expect(
        view.getByText("useTrainingPreferences must be used within TrainingPreferencesProvider"),
      ).toBeTruthy(),
    );
    consoleError.mockRestore();
  });
});
