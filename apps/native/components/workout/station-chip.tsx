import { View } from "react-native";

import { radii, type, useColors } from "@/lib/theme";

import { LedgerText } from "./ledger-text";

export function StationChip({ label }: { label: string }) {
  const p = useColors();
  return (
    <View
      style={{
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: radii.chip,
        borderCurve: "continuous",
        backgroundColor: p.fill,
      }}
    >
      <LedgerText style={{ color: p.secondary, ...type.caption, fontWeight: "600" }}>
        {label}
      </LedgerText>
    </View>
  );
}
