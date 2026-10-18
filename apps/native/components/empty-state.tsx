import { Button, Host } from "@expo/ui";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";

import { useKeyboardHeight } from "@/lib/keyboard";
import { spacing, type, useColors } from "@/lib/theme";

type EmptyAction = { label: string; onPress: () => void };

// A ScrollView even with nothing to scroll, so the large title collapses like any native list.
// It makes room for the keyboard, so a search with no matches stays centred in view.
// It only scrolls when the message overflows the ScrollView, or while the keyboard is up so a drag
// dismisses it: otherwise the screen bounces with nothing in it, as the system insets alone make it
// scrollable. The insets aren't known here, so overflow is measured against the full frame.
export function EmptyState({ message, action }: { message: string; action?: EmptyAction }) {
  const p = useColors();
  const keyboardHeight = useKeyboardHeight();
  const [viewportHeight, setViewportHeight] = useState(0);
  const [messageHeight, setMessageHeight] = useState(0);
  const padding = spacing.xxl;
  const overflows = viewportHeight > 0 && messageHeight + padding * 2 > viewportHeight;
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      scrollEnabled={overflows || keyboardHeight > 0}
      onLayout={(event) => setViewportHeight(event.nativeEvent.layout.height)}
      style={{ backgroundColor: p.background }}
      contentContainerStyle={{
        flexGrow: 1,
        alignItems: "center",
        justifyContent: "center",
        padding,
        paddingBottom: padding + keyboardHeight,
      }}
    >
      <View onLayout={(event) => setMessageHeight(event.nativeEvent.layout.height)}>
        <EmptyMessage message={message} action={action} />
      </View>
    </ScrollView>
  );
}

// For a list that already scrolls, as its empty component.
export function EmptyMessage({ message, action }: { message: string; action?: EmptyAction }) {
  const p = useColors();
  return (
    <View style={{ alignItems: "center", gap: spacing.md }}>
      <Text style={{ color: p.secondary, ...type.body, textAlign: "center" }}>{message}</Text>
      {action && (
        <Host matchContents>
          <Button variant="text" label={action.label} onPress={action.onPress} />
        </Host>
      )}
    </View>
  );
}
