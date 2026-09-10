import type { CatalogMovement } from '@/db';
import {
	MOVEMENT_PICKER_FILTERS,
	canSelectMovement,
	getMovementPickerRows,
} from '@/features/routines/movement-picker-state';

function movement(
	id: number,
	name: string,
	muscleGroup: string,
	overrides: Partial<CatalogMovement> = {},
): CatalogMovement {
	return {
		id,
		name,
		muscleGroup,
		unit: 'kg',
		instructions: null,
		archived: false,
		...overrides,
	};
}

describe('movement picker state seam', () => {
	test('offers All plus the canonical fourteen muscle-group filters', () => {
		expect(MOVEMENT_PICKER_FILTERS).toEqual([
			'All',
			'Chest',
			'Back',
			'Shoulders',
			'Biceps',
			'Triceps',
			'Forearms',
			'Core',
			'Obliques',
			'Traps',
			'Quads',
			'Adductors',
			'Hamstrings',
			'Glutes',
			'Calves',
		]);
	});

	test('combines name and muscle-group filters while preserving A–Z order and instructions', () => {
		const options = [
			movement(1, 'Wrist Curl', 'Forearms', { instructions: 'Keep the wrist neutral.' }),
			movement(2, 'Reverse Curl', 'Forearms'),
			movement(3, 'Cable Curl', 'Biceps'),
		];

		const rows = getMovementPickerRows(options, {
			query: 'curl',
			muscleGroup: 'Forearms',
			selectedIds: [],
		});

		expect(rows.map((row) => row.movement.name)).toEqual(['Reverse Curl', 'Wrist Curl']);
		expect(rows[1].movement.instructions).toBe('Keep the wrist neutral.');
	});

	test('gates archived movements but retains an archived movement already in the draft', () => {
		const archived = movement(1, 'Old Press', 'Chest', { archived: true });
		const active = movement(2, 'Bench Press', 'Chest');

		expect(getMovementPickerRows([archived, active], { selectedIds: [] }).map((row) => row.movement.id)).toEqual([2]);
		expect(getMovementPickerRows([archived, active], { selectedIds: [1] })).toEqual([
			expect.objectContaining({ alreadyAdded: false, selectable: true, movement: active }),
			expect.objectContaining({ alreadyAdded: true, selectable: false, movement: archived }),
		]);
	});

	test('marks duplicate draft movements unavailable without excluding them from results', () => {
		const selected = movement(1, 'Bench Press', 'Chest');
		const fresh = movement(2, 'Cable Fly', 'Chest');
		const rows = getMovementPickerRows([fresh, selected], { selectedIds: [1] });

		expect(rows.map((row) => row.movement.id)).toEqual([1, 2]);
		expect(rows[0]).toMatchObject({ alreadyAdded: true, selectable: false });
		expect(rows[1]).toMatchObject({ alreadyAdded: false, selectable: true });
		expect(canSelectMovement(selected, [1])).toBe(false);
		expect(canSelectMovement(fresh, [1])).toBe(true);
	});
});
