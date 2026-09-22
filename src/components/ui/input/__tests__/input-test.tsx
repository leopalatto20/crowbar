import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { createRef, useState } from "react";
import { TextInput } from "react-native";

import { Input, InputField } from "../index";

function ControlledInput(): React.JSX.Element {
  const [value, setValue] = useState("");

  return (
    <Input isInvalid>
      <InputField
        accessibilityHint="Name is required."
        aria-label="Exercise name"
        allowFontScaling
        onChangeText={setValue}
        testID="exercise-name"
        value={value}
      />
    </Input>
  );
}

describe("Input", () => {
  it("supports controlled text entry with an accessible name, error hint, and text scaling", async () => {
    const view = await render(<ControlledInput />);
    const input = view.getByLabelText("Exercise name");

    fireEvent.changeText(input, "  Cable Fly  ");

    await waitFor(() =>
      expect(view.getByTestId("exercise-name").props.value).toBe("  Cable Fly  "),
    );
    expect(input.props.accessibilityHint).toBe("Name is required.");
    expect(input.props.allowFontScaling).toBe(true);
  });

  it("prevents editing when disabled", async () => {
    const view = await render(
      <Input isDisabled>
        <InputField aria-label="Exercise name" testID="disabled-exercise-name" />
      </Input>,
    );

    expect(
      view.getByTestId("disabled-exercise-name", { includeHiddenElements: true }).props[
        "aria-disabled"
      ],
    ).toBe(true);
  });

  it("forwards a ref that can focus the native text field", async () => {
    const ref = createRef<TextInput>();

    await render(
      <Input>
        <InputField aria-label="Exercise name" ref={ref} />
      </Input>,
    );

    const focus = jest.spyOn(ref.current!, "focus");
    ref.current?.focus();

    expect(focus).toHaveBeenCalledTimes(1);
  });
});
