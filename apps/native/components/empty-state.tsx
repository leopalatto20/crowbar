import { Button, Host } from "@expo/ui";
import { ScrollView, Text, View } from "react-native";

import { useKeyboardHeight } from "@/lib/keyboard";
import { spacing, type, useColors } from "@/lib/theme";

type EmptyAction = { label: string; onPress: () => void };

// A ScrollView even with nothing to scroll, so the large title collapses like any native list.
// It makes room for the keyboard, so a search with no matches stays centred in view.
export function EmptyState({ message, action }: { message: string; action?: EmptyAction }) {
  const p = useColors();
  const keyboardHeight = useKeyboardHeight();
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      style={{ backgroundColor: p.background }}
      contentContainerStyle={{
        flexGrow: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: spacing.xxl,
        paddingBottom: spacing.xxl + keyboardHeight,
      }}
    >
      <EmptyMessage message={message} action={action} />
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
