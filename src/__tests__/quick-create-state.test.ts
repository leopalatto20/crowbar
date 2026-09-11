import { createQuickCreateState, quickCreateReducer } from '@/features/catalog/quick-create-state';

const unfinishedDraft = {
  name: 'Bench Press - ',
  primaryMuscleGroupId: undefined,
  unit: 'lb' as const,
  instructions: 'Pause at the chest',
};

describe('quick-create state seam', () => {
  test('starts a new create with the picker name and leaves a blank search blank', () => {
    expect(
      quickCreateReducer(createQuickCreateState('stale'), {
        type: 'quickCreateStarted',
        name: 'Bench Press',
      }),
    ).toEqual({
      workingName: 'Bench Press',
      currentMovementId: null,
    });
    expect(
      quickCreateReducer(createQuickCreateState('stale'), { type: 'quickCreateStarted', name: '' }),
    ).toEqual({
      workingName: '',
      currentMovementId: null,
    });
  });

  test('keeps every unfinished field when the modal is cancelled or blocked by a duplicate', () => {
    let state = quickCreateReducer(createQuickCreateState('Bench'), {
      type: 'workingNameChanged',
      name: 'Bench Press',
    });
    state = quickCreateReducer(state, { type: 'draftChanged', draft: unfinishedDraft });

    state = quickCreateReducer(state, { type: 'modalCancelled' });
    expect(state).toMatchObject({ workingName: unfinishedDraft.name, draft: unfinishedDraft });
    state = quickCreateReducer(state, { type: 'duplicateNavigated' });
    expect(state.draft).toEqual(unfinishedDraft);
    expect(state.currentMovementId).toBeNull();

    const selected = quickCreateReducer(state, {
      type: 'movementSelected',
      movement: { id: 7, name: 'Bench Press' },
    });
    expect(selected).toMatchObject({ workingName: 'Bench Press', currentMovementId: 7 });
    expect(selected.draft).toBeUndefined();
  });

  test('selects the created movement and resets the next draft', () => {
    const state = quickCreateReducer(
      quickCreateReducer(createQuickCreateState('Bench'), {
        type: 'draftChanged',
        draft: unfinishedDraft,
      }),
      { type: 'movementSaved', movement: { id: 99, name: 'Paused Bench Press' } },
    );

    expect(state).toEqual({
      workingName: 'Paused Bench Press',
      draft: undefined,
      currentMovementId: 99,
    });
  });
});
