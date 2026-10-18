import { DropdownMenu, DropdownMenuItem, Host, Text } from "@expo/ui/jetpack-compose";
import { clickable } from "@expo/ui/jetpack-compose/modifiers";
import { useState } from "react";

import { useI18n } from "@/lib/i18n";
import { type, useColors } from "@/lib/theme";

import type { RoutineExerciseMenuProps } from "./routine-exercise-menu.types";

export function RoutineExerciseMenu({ name, onSwap, onRemove }: RoutineExerciseMenuProps) {
  const p = useColors();
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const item = (label: string, action: () => void) => (
    <DropdownMenuItem
      key={label}
      onClick={() => {
        setExpanded(false);
        action();
      }}
    >
      <DropdownMenuItem.Text>
        <Text>{label}</Text>
      </DropdownMenuItem.Text>
    </DropdownMenuItem>
  );
  return (
    <Host matchContents={{ vertical: true }} style={{ alignSelf: "stretch" }}>
      <DropdownMenu expanded={expanded} onDismissRequest={() => setExpanded(false)}>
        <DropdownMenu.Trigger>
          <Text
            color={p.label}
            maxLines={1}
            style={{ fontSize: type.callout.fontSize, fontWeight: "600" }}
            modifiers={[clickable(() => setExpanded(true))]}
          >
            {name}
          </Text>
        </DropdownMenu.Trigger>
        <DropdownMenu.Items>
          {item(t.routine.swap, onSwap)}
          {item(t.routine.remove, onRemove)}
        </DropdownMenu.Items>
      </DropdownMenu>
    </Host>
  );
}
