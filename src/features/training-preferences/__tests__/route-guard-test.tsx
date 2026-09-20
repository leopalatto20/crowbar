import { render, waitFor } from "@testing-library/react-native";

import type { TrainingPreferencesRepository } from "../data/training-preferences-repository";
import { TrainingPreferencesProvider } from "../training-preferences-provider";
import { RootNavigator } from "../../../app/_layout";

jest.mock("expo-sqlite", () => ({
  useSQLiteContext: () => ({ getFirstAsync: jest.fn(), runAsync: jest.fn() }),
}));

jest.mock("react-i18next", () => ({
  I18nextProvider: ({ children }: { children: React.ReactNode }) => children,
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock("expo-router", () => {
  const { Text: MockText, View: MockView } = jest.requireActual(
    "react-native",
  ) as typeof import("react-native");
  const Protected = ({
    children,
    guard,
  }: {
    children: React.ReactNode;
    guard: boolean;
  }) => (guard ? children : null);
  const Screen = ({ name }: { name: string }) => <MockText>{name}</MockText>;
  const Stack = ({ children }: { children: React.ReactNode }) => <MockView>{children}</MockView>;

  Stack.Protected = Protected;
  Stack.Screen = Screen;
  return { Stack };
});

describe("RootNavigator route guard", () => {
  it("makes the first-run route available without a preference", async () => {
    const repository: TrainingPreferencesRepository = {
      read: jest.fn().mockResolvedValue(null),
      save: jest.fn(),
    };
    const view = await render(
      <TrainingPreferencesProvider repository={repository}>
        <RootNavigator />
      </TrainingPreferencesProvider>,
    );

    await waitFor(() => expect(view.getByText("index")).toBeTruthy());
    expect(view.queryByText("(app)")).toBeNull();
  });

  it("makes the app route available after hydration", async () => {
    const repository: TrainingPreferencesRepository = {
      read: jest.fn().mockResolvedValue("rpe"),
      save: jest.fn(),
    };
    const view = await render(
      <TrainingPreferencesProvider repository={repository}>
        <RootNavigator />
      </TrainingPreferencesProvider>,
    );

    await waitFor(() => expect(view.getByText("(app)")).toBeTruthy());
    expect(view.queryByText("index")).toBeNull();
  });
});
