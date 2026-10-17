import { Button, Divider, Host, Menu } from "@expo/ui/swift-ui";
import {
  accessibilityLabel,
  disabled,
  font,
  foregroundStyle,
  frame,
  multilineTextAlignment,
} from "@expo/ui/swift-ui/modifiers";

import { useI18n } from "@/lib/i18n";
import { MenuLabelText } from "@/modules/menu-label-text";
import { type, useColors } from "@/lib/theme";

import type { ExerciseMenuProps } from "./exercise-menu.types";

export function ExerciseMenu({
  name,
  stations,
  currentStationId,
  hasNotes,
  canSwap,
  canMoveUp,
  canMoveDown,
  onHistory,
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
  return (
    <Host matchContents={{ vertical: true }} style={{ alignSelf: "stretch" }}>
      <Menu
        label={
          <MenuLabelText
            text={name}
            modifiers={[
              font({ size: type.headline.fontSize, weight: "semibold" }),
              foregroundStyle(p.label),
              multilineTextAlignment("leading"),
              frame({ maxWidth: Infinity, alignment: "leading" }),
            ]}
          />
        }
        modifiers={[accessibilityLabel(t.ledger.exerciseMenu(name))]}
      >
        <Button
          label={t.ledger.history}
          systemImage="chart.line.uptrend.xyaxis"
          onPress={onHistory}
        />
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
          label={t.ledger.swap}
          systemImage="arrow.triangle.2.circlepath"
          onPress={onSwap}
          modifiers={[disabled(!canSwap)]}
        />
        <Button
          label={hasNotes ? t.ledger.editNotes : t.ledger.addNotes}
          systemImage="pin"
          onPress={onEditNotes}
        />
        <Divider />
        <Button
          label={t.ledger.moveUp}
          systemImage="arrow.up"
          onPress={onMoveUp}
          modifiers={[disabled(!canMoveUp)]}
        />
        <Button
          label={t.ledger.moveDown}
          systemImage="arrow.down"
          onPress={onMoveDown}
          modifiers={[disabled(!canMoveDown)]}
        />
        <Divider />
        <Button label={t.ledger.remove} systemImage="trash" role="destructive" onPress={onRemove} />
      </Menu>
    </Host>
  );
}
