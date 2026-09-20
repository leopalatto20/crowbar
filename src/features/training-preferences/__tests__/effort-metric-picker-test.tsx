import { render } from "@testing-library/react-native";

import { EffortMetricPicker } from "../ui/effort-metric-picker";

describe("EffortMetricPicker", () => {
  it("supports default enabled state and pressed-style branches", async () => {
    const view = await render(
      <EffortMetricPicker
        selectedMetric="rpe"
        onSelect={jest.fn()}
        labels={{ rpe: "RPE", rir: "RIR" }}
        descriptions={{ rpe: "RPE description", rir: "RIR description" }}
        selectedAnnouncement={(metric) => `${metric} selected`}
        notSelectedAnnouncement={(metric) => `${metric} not selected`}
      />,
    );
    expect(view.getByTestId("effort-metric-rpe").props.style).toBeTruthy();
    expect(view.getByTestId("effort-metric-rpe").props.accessibilityState).toEqual({
      disabled: false,
      selected: true,
    });
  });
});
