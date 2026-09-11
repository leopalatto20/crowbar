import type { CatalogMovement } from '@/db';
import { MUSCLE_GROUPS } from '@/db/constants';

export const ALL_MUSCLE_GROUPS = 'All' as const;
export const MOVEMENT_PICKER_FILTERS = [ALL_MUSCLE_GROUPS, ...MUSCLE_GROUPS] as const;

export type MovementPickerRow = {
  movement: CatalogMovement;
  alreadyAdded: boolean;
  selectable: boolean;
};

type MovementPickerOptions = {
  query?: string;
  muscleGroup?: string;
  selectedIds?: readonly number[];
};

export function getMovementPickerRows(
  options: readonly CatalogMovement[],
  { query, muscleGroup, selectedIds = [] }: MovementPickerOptions = {},
): MovementPickerRow[] {
  const normalizedQuery = query?.trim().toLowerCase() ?? '';
  const selected = new Set(selectedIds);
  const normalizedMuscleGroup = muscleGroup?.trim() ?? ALL_MUSCLE_GROUPS;

  return options
    .filter((movement) => {
      const matchesName =
        normalizedQuery === '' || movement.name.toLowerCase().includes(normalizedQuery);
      const matchesGroup =
        normalizedMuscleGroup === ALL_MUSCLE_GROUPS ||
        movement.muscleGroup === normalizedMuscleGroup;
      const alreadyAdded = selected.has(movement.id);
      return matchesName && matchesGroup && (!movement.archived || alreadyAdded);
    })
    .map((movement) => {
      const alreadyAdded = selected.has(movement.id);
      return {
        movement,
        alreadyAdded,
        selectable: canSelectMovement(movement, selectedIds),
      };
    })
    .sort((left, right) => {
      const nameOrder = left.movement.name
        .toLowerCase()
        .localeCompare(right.movement.name.toLowerCase());
      return nameOrder || left.movement.id - right.movement.id;
    });
}

export function canSelectMovement(
  movement: CatalogMovement,
  selectedIds: readonly number[],
): boolean {
  return !movement.archived && !selectedIds.includes(movement.id);
}
