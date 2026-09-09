import {
	createQuickCreateState,
	quickCreateReducer,
} from '@/features/catalog/quick-create-state';

const unfinishedDraft = {
	name: 'Bench Press - ',
	primaryMuscleGroupId: undefined,
	unit: 'lb' as const,
	instructions: 'Pause at the chest',
};

describe('quick-create state seam', () => {
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
	});

	test('selects the created movement and resets the next draft', () => {
		const state = quickCreateReducer(
			quickCreateReducer(createQuickCreateState('Bench'), { type: 'draftChanged', draft: unfinishedDraft }),
			{ type: 'movementSaved', movement: { id: 99, name: 'Paused Bench Press' } },
		);

		expect(state).toEqual({
			workingName: 'Paused Bench Press',
			draft: undefined,
			currentMovementId: 99,
		});
	});
});
