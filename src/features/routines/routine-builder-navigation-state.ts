import type { Unit } from '@/db/constants';
import type { QuickCreateState } from '@/features/catalog/quick-create-state';
import type { RoutineDraft, RoutineEntryDraft } from './routine-builder-state';

export type RoutineBuilderRoute = { mode: 'create' } | { mode: 'edit'; routineId: number };

type RouteParam = string | string[] | undefined;

/** Converts URL search parameters into the only two supported builder modes. */
export function parseRoutineBuilderRoute(params: {
  builder?: RouteParam;
  routineId?: RouteParam;
}): RoutineBuilderRoute | null {
  const builder = firstParam(params.builder);
  if (builder === 'create') return { mode: 'create' };
  if (builder !== 'edit') return null;

  const routineId = Number(firstParam(params.routineId));
  return Number.isSafeInteger(routineId) && routineId > 0 ? { mode: 'edit', routineId } : null;
}

/**
 * Compares only persisted Routine fields. Undo bookkeeping and a late-loaded
 * app Recording scale are not user edits and must not trigger a discard prompt.
 */
export function isRoutineDraftDirty(draft: RoutineDraft, initial: RoutineDraft): boolean {
  if (draft.name !== initial.name || draft.entries.length !== initial.entries.length) return true;
  return draft.entries.some((entry, index) => !sameEntry(entry, initial.entries[index]));
}

export function isQuickCreateDraftDirty(state: QuickCreateState, defaultUnit: Unit): boolean {
  if (state.currentMovementId !== null && !state.draft) return false;
  if (state.workingName.trim()) return true;
  const draft = state.draft;
  if (!draft) return false;
  return Boolean(
    draft.name.trim() ||
    draft.primaryMuscleGroupId !== undefined ||
    draft.unit !== defaultUnit ||
    draft.instructions.trim(),
  );
}

function sameEntry(left: RoutineEntryDraft, right: RoutineEntryDraft | undefined): boolean {
  if (!right) return false;
  return (
    left.movementId === right.movementId &&
    left.workingSetCount === right.workingSetCount &&
    left.repMin === right.repMin &&
    left.repMax === right.repMax &&
    left.proximityValue === right.proximityValue &&
    left.tempo === right.tempo
  );
}

function firstParam(value: RouteParam): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
