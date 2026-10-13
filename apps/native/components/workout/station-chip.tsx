import { Text, View } from "react-native";

import { usePalette } from "@/lib/palette";

export function StationChip({ label }: { label: string }) {
  const p = usePalette();
  return (
    <View
      style={{
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 6,
        borderCurve: "continuous",
        backgroundColor: p.fill,
      }}
    >
      <Text style={{ color: p.secondary, fontSize: 12, fontWeight: "600" }}>{label}</Text>
    </View>
  );
}
