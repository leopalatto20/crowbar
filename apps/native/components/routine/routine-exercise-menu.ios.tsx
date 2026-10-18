import { Button, Divider, Host, Menu } from "@expo/ui/swift-ui";
import {
  accessibilityLabel,
  font,
  foregroundStyle,
  frame,
  lineLimit,
} from "@expo/ui/swift-ui/modifiers";

import { useI18n } from "@/lib/i18n";
import { MenuLabelText } from "@/modules/menu-label-text";
import { type, useColors } from "@/lib/theme";

import type { RoutineExerciseMenuProps } from "./routine-exercise-menu.types";

export function RoutineExerciseMenu({ name, onSwap, onRemove }: RoutineExerciseMenuProps) {
  const p = useColors();
  const { t } = useI18n();
  return (
    <Host matchContents={{ vertical: true }} style={{ alignSelf: "stretch" }}>
      <Menu
        label={
          <MenuLabelText
            text={name}
            modifiers={[
              font({ size: type.callout.fontSize, weight: "semibold" }),
              foregroundStyle(p.label),
              lineLimit(1),
              frame({ maxWidth: Infinity, alignment: "leading" }),
            ]}
          />
        }
        modifiers={[accessibilityLabel(t.routine.exerciseMenu(name))]}
      >
        <Button label={t.routine.swap} systemImage="arrow.triangle.2.circlepath" onPress={onSwap} />
        <Divider />
        <Button
          label={t.routine.remove}
          systemImage="trash"
          role="destructive"
          onPress={onRemove}
        />
      </Menu>
    </Host>
  );
}
