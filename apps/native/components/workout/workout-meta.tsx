import { SymbolView } from "expo-symbols";
import { View } from "react-native";

import { PressableScale } from "@/components/pressable-scale";
import { useI18n } from "@/lib/i18n";
import { radii, spacing, type, useColors } from "@/lib/theme";

import { LedgerText } from "./ledger-text";

export function WorkoutMeta({
  gym,
  started,
  onChangeGym,
}: {
  gym: string;
  // Left out where the start is edited instead.
  started?: string;
  onChangeGym?: () => void;
}) {
  const p = useColors();
  const { t } = useI18n();
  const chipStyle = {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: p.fill,
  } as const;
  const gymLabel = (
    <>
      <SymbolView
        name={{ ios: "mappin.and.ellipse", android: "location_on" }}
        size={13}
        tintColor={p.label}
      />
      <LedgerText numberOfLines={1} style={{ color: p.label, ...type.footnote, fontWeight: "600" }}>
        {gym}
      </LedgerText>
    </>
  );
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
      {onChangeGym ? (
        <PressableScale
          onPress={onChangeGym}
          accessibilityLabel={t.ledger.changeGym(gym)}
          style={chipStyle}
        >
          {gymLabel}
          <SymbolView
            name={{ ios: "chevron.down", android: "keyboard_arrow_down" }}
            size={10}
            weight="semibold"
            tintColor={p.secondary}
          />
        </PressableScale>
      ) : (
        <View style={chipStyle}>{gymLabel}</View>
      )}
      {started && (
        <LedgerText style={{ color: p.secondary, ...type.footnote, fontWeight: "500" }}>
          {started}
        </LedgerText>
      )}
    </View>
  );
}
