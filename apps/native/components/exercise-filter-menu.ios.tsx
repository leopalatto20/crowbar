import { Button, Divider, Host, Image, Menu, Toggle } from "@expo/ui/swift-ui";
import { accessibilityLabel } from "@expo/ui/swift-ui/modifiers";

import { FILTER_ICON, FILTER_ON_ICON } from "@/components/filter-icons";
import {
  EQUIPMENT_TYPES,
  type ExerciseFilters,
  MUSCLE_GROUPS,
  anyFilterOn,
} from "@/lib/exercise/model";
import { useI18n } from "@/lib/i18n";
import { useColors } from "@/lib/theme";

import type { ExerciseFilterMenuProps } from "./exercise-filter-menu.types";

export function ExerciseFilterMenu({ filters, doneLabel, onChange }: ExerciseFilterMenuProps) {
  const p = useColors();
  const { t } = useI18n();
  const choice = (
    key: string,
    label: string,
    selected: boolean,
    change: Partial<ExerciseFilters>,
  ) => (
    <Button
      key={key}
      label={label}
      systemImage={selected ? "checkmark" : undefined}
      onPress={() => onChange({ ...filters, ...change })}
    />
  );
  return (
    <Host matchContents>
      <Menu
        label={
          <Image
            systemName={anyFilterOn(filters) ? FILTER_ON_ICON : FILTER_ICON}
            size={22}
            color={p.blue}
          />
        }
        modifiers={[accessibilityLabel(t.exerciseFilters.filter)]}
      >
        <Menu label={t.exerciseFilters.equipmentType}>
          {choice("any", t.exerciseFilters.any, filters.equipmentType === null, {
            equipmentType: null,
          })}
          <Divider />
          {EQUIPMENT_TYPES.map((equipmentType) =>
            choice(
              equipmentType,
              t.equipmentType[equipmentType],
              filters.equipmentType === equipmentType,
              { equipmentType },
            ),
          )}
        </Menu>
        <Menu label={t.exerciseFilters.muscleGroup}>
          {choice("any", t.exerciseFilters.any, filters.muscleGroup === null, {
            muscleGroup: null,
          })}
          <Divider />
          {MUSCLE_GROUPS.map((muscleGroup) =>
            choice(muscleGroup, t.muscleGroup[muscleGroup], filters.muscleGroup === muscleGroup, {
              muscleGroup,
            }),
          )}
        </Menu>
        <Divider />
        {doneLabel !== null && (
          <Toggle
            label={doneLabel}
            isOn={filters.done}
            onIsOnChange={(done) => onChange({ ...filters, done })}
          />
        )}
        <Toggle
          label={t.exerciseFilters.custom}
          isOn={filters.custom}
          onIsOnChange={(custom) => onChange({ ...filters, custom })}
        />
      </Menu>
    </Host>
  );
}
