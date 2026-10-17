import {
  DropdownMenu,
  DropdownMenuItem,
  Host,
  Icon,
  IconButton,
  Text,
} from "@expo/ui/jetpack-compose";
import { useState } from "react";

// The platform file itself: the entry types the icons as the iOS symbol names.
import { FILTER_ICON, FILTER_ON_ICON } from "@/components/filter-icons.android";
import {
  EQUIPMENT_TYPES,
  type ExerciseFilters,
  MUSCLE_GROUPS,
  anyFilterOn,
} from "@/lib/exercise/model";
import { useI18n } from "@/lib/i18n";
import { useColors } from "@/lib/theme";

import type { ExerciseFilterMenuProps } from "./exercise-filter-menu.types";

const CHECK_ICON = require("@/assets/icons/check.xml");

// Material menus don't nest, so a facet replaces the menu's items with its values.
export function ExerciseFilterMenu({ filters, doneLabel, onChange }: ExerciseFilterMenuProps) {
  const p = useColors();
  const { t } = useI18n();
  const [shown, setShown] = useState<"closed" | "facets" | "equipmentType" | "muscleGroup">(
    "closed",
  );
  const item = (key: string, label: string, selected: boolean, onClick: () => void) => (
    <DropdownMenuItem key={key} onClick={onClick}>
      <DropdownMenuItem.Text>
        <Text>{label}</Text>
      </DropdownMenuItem.Text>
      {selected && (
        <DropdownMenuItem.TrailingIcon>
          <Icon source={CHECK_ICON} size={24} />
        </DropdownMenuItem.TrailingIcon>
      )}
    </DropdownMenuItem>
  );
  const choice = (
    key: string,
    label: string,
    selected: boolean,
    change: Partial<ExerciseFilters>,
  ) =>
    item(key, label, selected, () => {
      setShown("closed");
      onChange({ ...filters, ...change });
    });
  return (
    <Host matchContents>
      <DropdownMenu expanded={shown !== "closed"} onDismissRequest={() => setShown("closed")}>
        <DropdownMenu.Trigger>
          <IconButton onClick={() => setShown("facets")}>
            <Icon
              source={anyFilterOn(filters) ? FILTER_ON_ICON : FILTER_ICON}
              tint={p.blue}
              size={24}
              contentDescription={t.exerciseFilters.filter}
            />
          </IconButton>
        </DropdownMenu.Trigger>
        <DropdownMenu.Items>
          {shown === "equipmentType"
            ? [
                choice("any", t.exerciseFilters.any, filters.equipmentType === null, {
                  equipmentType: null,
                }),
                ...EQUIPMENT_TYPES.map((equipmentType) =>
                  choice(
                    equipmentType,
                    t.equipmentType[equipmentType],
                    filters.equipmentType === equipmentType,
                    { equipmentType },
                  ),
                ),
              ]
            : shown === "muscleGroup"
              ? [
                  choice("any", t.exerciseFilters.any, filters.muscleGroup === null, {
                    muscleGroup: null,
                  }),
                  ...MUSCLE_GROUPS.map((muscleGroup) =>
                    choice(
                      muscleGroup,
                      t.muscleGroup[muscleGroup],
                      filters.muscleGroup === muscleGroup,
                      { muscleGroup },
                    ),
                  ),
                ]
              : [
                  item("equipmentType", t.exerciseFilters.equipmentType, false, () =>
                    setShown("equipmentType"),
                  ),
                  item("muscleGroup", t.exerciseFilters.muscleGroup, false, () =>
                    setShown("muscleGroup"),
                  ),
                  ...(doneLabel === null
                    ? []
                    : [choice("done", doneLabel, filters.done, { done: !filters.done })]),
                  choice("custom", t.exerciseFilters.custom, filters.custom, {
                    custom: !filters.custom,
                  }),
                ]}
        </DropdownMenu.Items>
      </DropdownMenu>
    </Host>
  );
}
