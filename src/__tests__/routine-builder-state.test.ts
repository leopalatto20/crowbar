import {
	addRoutineEntry,
	createRoutineDraft,
	moveRoutineEntry,
	removeRoutineEntry,
	routineDraftToInput,
	undoRoutineEntryRemoval,
	updateRoutineEntryTarget,
	validateRoutineDraft,
} from '@/features/routines/routine-builder-state';

describe('routine builder state seam', () => {
	test('configures targets before insertion and keeps them editable after insertion', () => {
		let draft = createRoutineDraft('Push', 'rpe');
		draft = addRoutineEntry(draft, 1);
		draft = updateRoutineEntryTarget(draft, 1, 'workingSetCount', '4');
		draft = updateRoutineEntryTarget(draft, 1, 'repMin', '6');
		draft = updateRoutineEntryTarget(draft, 1, 'repMax', '8');
		draft = updateRoutineEntryTarget(draft, 1, 'proximityValue', '2');
		draft = updateRoutineEntryTarget(draft, 1, 'tempo', '3-1-1-0');

		expect(validateRoutineDraft(draft)).toMatchObject({ valid: true });
		expect(routineDraftToInput(draft).entries[0]).toMatchObject({
			movementId: 1,
			workingSetCount: 4,
			repMin: 6,
			repMax: 8,
			proximityValue: 2,
			proximityScale: 'rpe',
			tempo: '3-1-1-0',
		});
	});

	test('reorders, removes, and undoes entries without allowing duplicates', () => {
		let draft = createRoutineDraft('', 'rir');
		draft = addRoutineEntry(addRoutineEntry(draft, 1), 2);
		draft = addRoutineEntry(draft, 1);
		expect(draft.entries.map((entry) => entry.movementId)).toEqual([1, 2]);

		draft = moveRoutineEntry(draft, 1, 'down');
		expect(draft.entries.map((entry) => entry.movementId)).toEqual([2, 1]);
		draft = removeRoutineEntry(draft, 2);
		expect(draft.entries.map((entry) => entry.movementId)).toEqual([1]);
		draft = undoRoutineEntryRemoval(draft);
		expect(draft.entries.map((entry) => entry.movementId)).toEqual([2, 1]);
	});

	test('reports invalid target values and independently clears fields', () => {
	let draft = addRoutineEntry(createRoutineDraft('Push', 'rir'), 1);
	draft = updateRoutineEntryTarget(draft, 1, 'workingSetCount', '0');
	draft = updateRoutineEntryTarget(draft, 1, 'repMin', '10');
	draft = updateRoutineEntryTarget(draft, 1, 'repMax', '8');
	draft = updateRoutineEntryTarget(draft, 1, 'proximityValue', '11');
	draft = updateRoutineEntryTarget(draft, 1, 'tempo', 'fast');
	const invalid = validateRoutineDraft(draft);

	expect(invalid.valid).toBe(false);
	expect(invalid.entryErrors[1]).toEqual(expect.arrayContaining([
		'Working-set count must be a positive whole number.',
		'Rep minimum cannot exceed rep maximum.',
		'RIR target must be between 0 and 10.',
		'Tempo must use four-part notation, for example 3-1-1-0.',
	]));

	draft = updateRoutineEntryTarget(draft, 1, 'proximityValue', '');
		expect(validateRoutineDraft(draft).entryErrors[1]).not.toContain('RIR target must be between 0 and 10.');
	});
});
