import { Button, Divider, Host, Menu, Text } from "@expo/ui/swift-ui";
import {
  accessibilityLabel,
  font,
  foregroundStyle,
  frame,
  multilineTextAlignment,
} from "@expo/ui/swift-ui/modifiers";

import { useI18n } from "@/lib/i18n";
import { type, useColors } from "@/lib/theme";

import type { ExerciseMenuProps } from "./exercise-menu.types";

export function ExerciseMenu({
  name,
  stations,
  currentStationId,
  hasNotes,
  onSwitchStation,
  onNewStation,
  onEditNotes,
}: ExerciseMenuProps) {
  const p = useColors();
  const { t } = useI18n();
  return (
    <Host matchContents={{ vertical: true }} style={{ alignSelf: "stretch" }}>
      <Menu
        label={
          <Text
            modifiers={[
              font({ size: type.headline.fontSize, weight: "semibold" }),
              foregroundStyle(p.label),
              multilineTextAlignment("leading"),
              frame({ maxWidth: Infinity, alignment: "leading" }),
            ]}
          >
            {name}
          </Text>
        }
        modifiers={[accessibilityLabel(t.ledger.exerciseMenu(name))]}
      >
        {currentStationId && (
          <Menu label={t.ledger.switchStation} systemImage="arrow.left.arrow.right">
            {/* A lone Station is unnamed, and is the one in use: only the new one is offered. */}
            {stations.flatMap(({ id, label }) =>
              label === null
                ? []
                : [
                    <Button
                      key={id}
                      label={label}
                      systemImage={id === currentStationId ? "checkmark" : undefined}
                      onPress={() => {
                        if (id !== currentStationId) onSwitchStation(id);
                      }}
                    />,
                  ],
            )}
            <Divider />
            <Button label={t.ledger.newStation} systemImage="plus" onPress={onNewStation} />
          </Menu>
        )}
        <Button
          label={hasNotes ? t.ledger.editNotes : t.ledger.addNotes}
          systemImage="pin"
          onPress={onEditNotes}
        />
      </Menu>
    </Host>
  );
}
