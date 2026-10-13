import { ScrollView, Text } from "react-native";

import { spacing, type, useColors } from "@/lib/theme";

// A ScrollView even with nothing to scroll, so the large title collapses like any native list.
export function EmptyState({ message }: { message: string }) {
  const p = useColors();
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: p.background }}
      contentContainerStyle={{
        flexGrow: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: spacing.xxl,
      }}
    >
      <Text style={{ color: p.secondary, ...type.body, textAlign: "center" }}>{message}</Text>
    </ScrollView>
  );
}
