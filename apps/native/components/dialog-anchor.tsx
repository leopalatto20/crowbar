import { Spacer } from "@expo/ui/swift-ui";
import { frame } from "@expo/ui/swift-ui/modifiers";

// The trigger slot of a SwiftUI Alert or ConfirmationDialog. Without one, @expo/ui hangs the
// dialog off an EmptyView, which SwiftUI never presents from: the screen dims but nothing shows
// (#65). A zero-size view is a real anchor that takes no space next to the screen's content.
export function DialogAnchor() {
  return <Spacer modifiers={[frame({ width: 0, height: 0 })]} />;
}
