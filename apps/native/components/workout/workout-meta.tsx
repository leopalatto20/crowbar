import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { usePalette } from "@/lib/palette";

export function WorkoutMeta({ gym, startedAt }: { gym: string; startedAt: string }) {
  const p = usePalette();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <Ionicons name="location" size={13} color={p.secondary} />
      <Text style={{ color: p.secondary, fontSize: 13, fontWeight: "500" }}>
        {gym} · started {startedAt}
      </Text>
    </View>
  );
}
