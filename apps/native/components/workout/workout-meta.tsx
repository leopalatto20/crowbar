import { SymbolView } from "expo-symbols";
import { View } from "react-native";

import { useI18n } from "@/lib/i18n";
import { spacing, type, useColors } from "@/lib/theme";

import { LedgerText } from "./ledger-text";

export function WorkoutMeta({ gym, startedAt }: { gym: string; startedAt: number }) {
  const p = useColors();
  const { t, formatTime } = useI18n();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
      <SymbolView
        name={{ ios: "mappin.and.ellipse", android: "location_on" }}
        size={13}
        tintColor={p.secondary}
      />
      <LedgerText style={{ color: p.secondary, ...type.footnote, fontWeight: "500" }}>
        {t.ledger.meta(gym, formatTime(startedAt))}
      </LedgerText>
    </View>
  );
}
