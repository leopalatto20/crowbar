import { Button, HStack, Host, Image, Menu, Text } from "@expo/ui/swift-ui";
import { accessibilityLabel, font, foregroundStyle } from "@expo/ui/swift-ui/modifiers";

import { useI18n } from "@/lib/i18n";
import { type, useColors } from "@/lib/theme";

import { stationName } from "./station-name";
import type { StationSwitcherProps } from "./station-switcher.types";

export function StationSwitcher({ stations, current, onSwitch }: StationSwitcherProps) {
  const p = useColors();
  const i18n = useI18n();
  const name = stationName(current, i18n);
  return (
    <Host matchContents style={{ alignSelf: "flex-start" }}>
      <Menu
        label={
          <HStack spacing={4}>
            <Text
              modifiers={[
                font({ size: type.subheadline.fontSize, weight: "semibold" }),
                foregroundStyle(p.blue),
              ]}
            >
              {name}
            </Text>
            <Image systemName="chevron.up.chevron.down" size={12} color={p.blue} />
          </HStack>
        }
        modifiers={[accessibilityLabel(i18n.t.exerciseDetail.switchStation(name))]}
      >
        {stations.map((option) => (
          <Button
            key={option.id}
            label={stationName(option, i18n)}
            systemImage={option.id === current.id ? "checkmark" : undefined}
            onPress={() => onSwitch(option.id)}
          />
        ))}
      </Menu>
    </Host>
  );
}
