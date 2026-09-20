import { fireEvent, render } from "@testing-library/react-native";

import { PreferenceLoadStateScreen } from "../ui/preference-load-state-screen";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe("PreferenceLoadStateScreen", () => {
  it("shows a loading indicator while hydration is pending", async () => {
    const view = await render(<PreferenceLoadStateScreen />);

    expect(view.getByText("trainingPreferences.loading.label")).toBeTruthy();
    expect(view.getByLabelText("trainingPreferences.loading.label")).toBeTruthy();
    expect(view.queryByText("trainingPreferences.errors.retry")).toBeNull();
  });

  it("shows a retry action after hydration fails", async () => {
    const onRetry = jest.fn();
    const view = await render(<PreferenceLoadStateScreen error onRetry={onRetry} />);

    expect(view.getByText("trainingPreferences.errors.loadFailed")).toBeTruthy();
    expect(view.getByText("trainingPreferences.errors.retry")).toBeTruthy();
    expect(view.queryByLabelText("trainingPreferences.loading.label")).toBeNull();
    fireEvent.press(view.getByText("trainingPreferences.errors.retry"));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("does not render a retry action when no retry callback exists", async () => {
    const view = await render(<PreferenceLoadStateScreen error />);

    expect(view.queryByText("trainingPreferences.errors.retry")).toBeNull();
  });
});
