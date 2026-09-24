import { fireEvent, render } from "@testing-library/react-native";
import type { ReactElement } from "react";


import AppIndex from "../../../app/(app)/index";
import ExercisesRoute from "../../../app/(app)/exercises";

const mockNavigate = jest.fn();

jest.mock("expo-router", () => {
  const { cloneElement } = jest.requireActual("react") as typeof import("react");
  return {
    Link: ({ children, href }: { children: ReactElement<{ onPress?: () => void }>; href: string }) =>
      cloneElement(children, { onPress: () => mockNavigate(href) }),
  };
});

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) =>
      ({ "app.exercisesLink": "Exercise catalog" })[key] ?? key,
  }),
}));

jest.mock("../../training-preferences/training-preferences-provider", () => ({
  useTrainingPreferences: () => ({ metric: "rpe" }),
}));

jest.mock("../ui/exercise-catalog-screen", () => {
  const { Text } = jest.requireActual("react-native") as typeof import("react-native");
  return { ExerciseCatalogScreen: () => <Text>Catalog screen content</Text> };
});

describe("exercise catalog route", () => {
  beforeEach(() => mockNavigate.mockClear());

  it("opens the protected catalog from the landing screen", async () => {
    const view = await render(<AppIndex />);

    fireEvent.press(view.getByText("Exercise catalog"));

    expect(mockNavigate).toHaveBeenCalledWith("/(app)/exercises");
  });

  it("renders the feature screen through a thin route", async () => {
    const view = await render(<ExercisesRoute />);

    expect(view.getByText("Catalog screen content")).toBeTruthy();
  });
});
