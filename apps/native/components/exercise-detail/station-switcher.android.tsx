import { DropdownMenu, DropdownMenuItem, Host, Text } from "@expo/ui/jetpack-compose";
import { clickable } from "@expo/ui/jetpack-compose/modifiers";
import { useState } from "react";

import { useI18n } from "@/lib/i18n";
import { type, useColors } from "@/lib/theme";

import { stationName } from "./station-name";
import type { StationSwitcherProps } from "./station-switcher.types";

export function StationSwitcher({ stations, current, onSwitch }: StationSwitcherProps) {
  const p = useColors();
  const i18n = useI18n();
  const [expanded, setExpanded] = useState(false);
  return (
    <Host matchContents style={{ alignSelf: "flex-start" }}>
      <DropdownMenu expanded={expanded} onDismissRequest={() => setExpanded(false)}>
        <DropdownMenu.Trigger>
          <Text
            color={p.blue}
            style={{ fontSize: type.subheadline.fontSize, fontWeight: "600" }}
            modifiers={[clickable(() => setExpanded(true))]}
          >
            {`${stationName(current, i18n)} ▾`}
          </Text>
        </DropdownMenu.Trigger>
        <DropdownMenu.Items>
          {stations.map((option) => (
            <DropdownMenuItem
              key={option.id}
              onClick={() => {
                setExpanded(false);
                onSwitch(option.id);
              }}
            >
              <DropdownMenuItem.Text>
                <Text style={{ fontWeight: option.id === current.id ? "700" : "400" }}>
                  {stationName(option, i18n)}
                </Text>
              </DropdownMenuItem.Text>
            </DropdownMenuItem>
          ))}
        </DropdownMenu.Items>
      </DropdownMenu>
    </Host>
  );
}
