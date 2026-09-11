import type { Unit } from '@/db/constants';

export type MovementEditorDraft = {
  name: string;
  primaryMuscleGroupId?: number;
  unit: Unit;
  instructions: string;
};

export type QuickCreateState = {
  workingName: string;
  draft?: MovementEditorDraft;
  currentMovementId: number | null;
};

export type QuickCreateAction =
  | { type: 'quickCreateStarted'; name: string }
  | { type: 'workingNameChanged'; name: string }
  | { type: 'draftChanged'; draft: MovementEditorDraft }
  | { type: 'modalCancelled' }
  | { type: 'duplicateNavigated' }
  | { type: 'movementSelected'; movement: { id: number; name: string } }
  | { type: 'movementSaved'; movement: { id: number; name: string } };

export function createQuickCreateState(workingName = ''): QuickCreateState {
  return { workingName, currentMovementId: null };
}

/**
 * The state seam for quick-create entry points. Cancel and duplicate navigation
 * deliberately leave the draft intact so recording and routine-building flows
 * can resume without losing unfinished input.
 */
export function quickCreateReducer(
  state: QuickCreateState,
  action: QuickCreateAction,
): QuickCreateState {
  switch (action.type) {
    case 'quickCreateStarted':
      return createQuickCreateState(action.name);
    case 'workingNameChanged':
      return {
        ...state,
        workingName: action.name,
        draft: state.draft ? { ...state.draft, name: action.name } : undefined,
      };
    case 'draftChanged':
      return { ...state, workingName: action.draft.name, draft: action.draft };
    case 'modalCancelled':
    case 'duplicateNavigated':
      return state;
    case 'movementSelected':
    case 'movementSaved':
      return {
        ...state,
        workingName: action.movement.name,
        draft: undefined,
        currentMovementId: action.movement.id,
      };
  }
}
