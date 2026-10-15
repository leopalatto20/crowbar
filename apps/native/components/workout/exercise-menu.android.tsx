import { DropdownMenu, DropdownMenuItem, Host, Text } from "@expo/ui/jetpack-compose";
import { clickable } from "@expo/ui/jetpack-compose/modifiers";
import { useState } from "react";

import { useI18n } from "@/lib/i18n";
import { type, useColors } from "@/lib/theme";

import type { ExerciseMenuProps } from "./exercise-menu.types";

// Material menus don't nest, so Switch Station replaces the menu's items with the Stations.
export function ExerciseMenu({
  name,
  stations,
  currentStationId,
  hasNotes,
  canSwap,
  canMoveUp,
  canMoveDown,
  onSwitchStation,
  onNewStation,
  onEditNotes,
  onSwap,
  onMoveUp,
  onMoveDown,
  onRemove,
}: ExerciseMenuProps) {
  const p = useColors();
  const { t } = useI18n();
  const [shown, setShown] = useState<"closed" | "exercise" | "stations">("closed");
  const item = (label: string, action: () => void, selected = false, enabled = true) => (
    <DropdownMenuItem
      key={label}
      enabled={enabled}
      onClick={() => {
        setShown("closed");
        action();
      }}
    >
      <DropdownMenuItem.Text>
        <Text style={{ fontWeight: selected ? "700" : "400" }}>{label}</Text>
      </DropdownMenuItem.Text>
    </DropdownMenuItem>
  );
  return (
    <Host matchContents={{ vertical: true }} style={{ alignSelf: "stretch" }}>
      <DropdownMenu expanded={shown !== "closed"} onDismissRequest={() => setShown("closed")}>
        <DropdownMenu.Trigger>
          <Text
            color={p.label}
            style={{ fontSize: type.headline.fontSize, fontWeight: "600" }}
            modifiers={[clickable(() => setShown("exercise"))]}
          >
            {name}
          </Text>
        </DropdownMenu.Trigger>
        <DropdownMenu.Items>
          {shown === "stations"
            ? [
                // A lone Station is unnamed, and is the one in use: only the new one is offered.
                ...stations.flatMap(({ id, label }) =>
                  label === null
                    ? []
                    : [
                        item(
                          label,
                          () => {
                            if (id !== currentStationId) onSwitchStation(id);
                          },
                          id === currentStationId,
                        ),
                      ],
                ),
                item(t.ledger.newStation, onNewStation),
              ]
            : [
                ...(currentStationId
                  ? [
                      <DropdownMenuItem key="switch" onClick={() => setShown("stations")}>
                        <DropdownMenuItem.Text>
                          <Text>{t.ledger.switchStation}</Text>
                        </DropdownMenuItem.Text>
                      </DropdownMenuItem>,
                    ]
                  : []),
                item(t.ledger.swap, onSwap, false, canSwap),
                item(hasNotes ? t.ledger.editNotes : t.ledger.addNotes, onEditNotes),
                item(t.ledger.moveUp, onMoveUp, false, canMoveUp),
                item(t.ledger.moveDown, onMoveDown, false, canMoveDown),
                item(t.ledger.remove, onRemove),
              ]}
        </DropdownMenu.Items>
      </DropdownMenu>
    </Host>
  );
}
