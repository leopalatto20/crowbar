import { useEffect, useState } from "react";
import { Dimensions, Keyboard, type KeyboardEvent, LayoutAnimation, Platform } from "react-native";

// Leaving edit mode or closing a Ledger unmounts its fields, so a value typed but not yet committed
// is saved by blurring its field first, and acting once the keyboard is gone.
export function afterKeyboardHides(action: () => void) {
  if (!Keyboard.isVisible()) {
    action();
    return;
  }
  const hidden = Keyboard.addListener("keyboardDidHide", () => {
    hidden.remove();
    action();
  });
  Keyboard.dismiss();
}

// For layout that has to make room for the keyboard while staying the screen's own ScrollView:
// wrapping that ScrollView in a KeyboardAvoidingView stops the large title collapsing with it.
// iOS also reports frame changes while the keyboard stays up, such as the predictions bar
// toggling; Android only reports the keyboard once it's up, so there the change isn't animated.
export function useKeyboardHeight() {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const follow = (event: KeyboardEvent, next: number) => {
      if (event.duration > 0) {
        LayoutAnimation.configureNext({
          duration: event.duration,
          update: { type: LayoutAnimation.Types.keyboard, duration: event.duration },
        });
      }
      setHeight(next);
    };
    const subscriptions =
      Platform.OS === "ios"
        ? [
            Keyboard.addListener("keyboardWillChangeFrame", (event) =>
              follow(
                event,
                Math.max(0, Dimensions.get("window").height - event.endCoordinates.screenY),
              ),
            ),
          ]
        : [
            Keyboard.addListener("keyboardDidShow", (event) =>
              follow(event, event.endCoordinates.height),
            ),
            Keyboard.addListener("keyboardDidHide", (event) => follow(event, 0)),
          ];
    return () => subscriptions.forEach((subscription) => subscription.remove());
  }, []);
  return height;
}
