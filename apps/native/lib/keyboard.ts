import { Keyboard } from "react-native";

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
