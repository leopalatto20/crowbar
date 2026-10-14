import { SymbolView } from "expo-symbols";
import { View } from "react-native";

import { PressableScale } from "@/components/pressable-scale";
import { useI18n } from "@/lib/i18n";
import { radii, spacing, type, useColors } from "@/lib/theme";

import { LedgerText } from "./ledger-text";

export function WorkoutMeta({
  gym,
  startedAt,
  onChangeGym,
}: {
  gym: string;
  startedAt: number;
  onChangeGym: () => void;
}) {
  const p = useColors();
  const { t, formatTime } = useI18n();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
      <PressableScale
        onPress={onChangeGym}
        accessibilityLabel={t.ledger.changeGym(gym)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.xs,
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xs,
          borderRadius: radii.pill,
          backgroundColor: p.fill,
        }}
      >
        <SymbolView
          name={{ ios: "mappin.and.ellipse", android: "location_on" }}
          size={13}
          tintColor={p.label}
        />
        <LedgerText
          numberOfLines={1}
          style={{ color: p.label, ...type.footnote, fontWeight: "600" }}
        >
          {gym}
        </LedgerText>
        <SymbolView
          name={{ ios: "chevron.down", android: "keyboard_arrow_down" }}
          size={10}
          weight="semibold"
          tintColor={p.secondary}
        />
      </PressableScale>
      <LedgerText style={{ color: p.secondary, ...type.footnote, fontWeight: "500" }}>
        {t.ledger.started(formatTime(startedAt))}
      </LedgerText>
    </View>
  );
}
