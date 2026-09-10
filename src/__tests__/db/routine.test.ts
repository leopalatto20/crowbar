import { eq } from 'drizzle-orm';

import {
	createRoutine,
	getRoutine,
	listMovements,
	listRoutines,
	schema,
	updateRoutine,
} from '@/db';

import { freshDb } from '@/test/helpers/db';
import { makeGym, makeMovement } from '@/test/helpers/fixtures';

describe('Routine create and list read path', () => {
	let db: Awaited<ReturnType<typeof freshDb>>;

	beforeEach(async () => {
		db = await freshDb();
	});

	test('saves an ordered Routine with active Movements and lists its count', async () => {
		const press = await makeMovement(db, { name: 'Routine Press' });
		const saved = await createRoutine(db, {
			name: '  Push day  ',
			movementIds: [press.id],
		});

		expect(saved.routine.name).toBe('Push day');
		const persistedEntries = await db
			.select()
			.from(schema.routineEntries)
			.where(eq(schema.routineEntries.routineId, saved.routine.id))
			.orderBy(schema.routineEntries.position);
		expect(persistedEntries).toHaveLength(1);
		expect(persistedEntries[0]).toMatchObject({
			routineId: saved.routine.id,
			position: 0,
			movementId: press.id,
		});
		expect(await listRoutines(db)).toEqual([
			{ id: saved.routine.id, name: 'Push day', movementCount: 1 },
		]);
	});

	test('preserves the draft order and keeps active Routines A–Z', async () => {
		const zed = await makeMovement(db, { name: 'Routine Zed' });
		const alpha = await makeMovement(db, { name: 'Routine Alpha' });
		const middle = await makeMovement(db, { name: 'Routine Middle' });

		const saved = await createRoutine(db, {
			name: 'Zed routine',
			movementIds: [zed.id, alpha.id, middle.id],
		});
		await createRoutine(db, { name: 'Alpha routine', movementIds: [alpha.id] });

		const persistedEntries = await db
			.select()
			.from(schema.routineEntries)
			.where(eq(schema.routineEntries.routineId, saved.routine.id))
			.orderBy(schema.routineEntries.position);
		expect(persistedEntries.map((entry) => entry.movementId)).toEqual([
			zed.id,
			alpha.id,
			middle.id,
		]);
		expect((await listRoutines(db)).map((routine) => routine.name)).toEqual([
			'Alpha routine',
			'Zed routine',
		]);
	});

	test('does not list archived Routines or archived Movements in the picker', async () => {
		const movement = await makeMovement(db, { name: 'Archived routine movement' });
		const saved = await createRoutine(db, { name: 'Archived routine', movementIds: [movement.id] });
		await db.update(schema.routines).set({ archived: 1 }).where(eq(schema.routines.id, saved.routine.id));
		await db.update(schema.movements).set({ archived: 1 }).where(eq(schema.movements.id, movement.id));

		expect(await listRoutines(db)).toEqual([]);
		expect((await listMovements(db)).map((row) => row.id)).not.toContain(movement.id);
	});

	test('persists optional targets and rejects invalid targets atomically', async () => {
		const movement = await makeMovement(db, { name: 'Targeted press' });
		const saved = await createRoutine(db, {
			name: 'Targeted routine',
			entries: [{
				movementId: movement.id,
				workingSetCount: 4,
				repMin: 6,
				repMax: 8,
				proximityValue: 2,
				proximityScale: 'rpe',
				tempo: '3-1-1-0',
			}],
		});
		expect(saved.entries[0]).toMatchObject({
			workingSetCount: 4,
			repMin: 6,
			repMax: 8,
			proximityValue: 2,
			proximityScale: 'rpe',
			tempo: '3-1-1-0',
		});

		await expect(createRoutine(db, {
			name: 'Invalid targets',
			entries: [{ movementId: movement.id, workingSetCount: 0 }],
		})).rejects.toThrow('Working-set count');
		expect(await listRoutines(db)).toHaveLength(1);
	});

	test('updates a Routine and its entries atomically without touching Sub-routines', async () => {
		const first = await makeMovement(db, { name: 'First movement' });
		const second = await makeMovement(db, { name: 'Second movement' });
		const gym = await makeGym(db, 'Routine gym');
		const saved = await createRoutine(db, {
			name: 'Editable routine',
			movementIds: [first.id, second.id],
		});
		await db.insert(schema.subRoutines).values({ routineId: saved.routine.id, gymId: gym.id });
		const updated = await updateRoutine(db, saved.routine.id, {
			name: 'Edited routine',
			entries: [{ movementId: second.id, workingSetCount: 3 }],
		});

		expect(updated.routine.name).toBe('Edited routine');
		expect(await db.select().from(schema.subRoutines)).toHaveLength(1);
		expect(updated.entries.map((entry) => entry.movementId)).toEqual([second.id]);
		expect((await getRoutine(db, saved.routine.id))?.entries[0]).toMatchObject({
		movementId: second.id,
		workingSetCount: 3,
		position: 0,
	});
	});

	test('rejects duplicate entries and duplicate Routine names', async () => {
		const movement = await makeMovement(db, { name: 'Unique movement' });
		await createRoutine(db, { name: 'Morning Push', movementIds: [movement.id] });
		await expect(createRoutine(db, {
			name: 'morning push',
			movementIds: [movement.id],
		})).rejects.toThrow('already exists');
		await expect(createRoutine(db, {
			name: 'Another routine',
			movementIds: [movement.id, movement.id],
		})).rejects.toThrow('same Movement twice');
	});

	test('rejects invalid drafts atomically', async () => {
		const movement = await makeMovement(db, { name: 'Archived draft movement' });
		await db.update(schema.movements).set({ archived: 1 }).where(eq(schema.movements.id, movement.id));

		await expect(createRoutine(db, { name: ' ', movementIds: [movement.id] })).rejects.toThrow(
			'Routine name cannot be blank',
		);
		await expect(createRoutine(db, { name: 'Should not save', movementIds: [movement.id] })).rejects.toThrow(
			'Every Routine Movement must be active',
		);
		expect(await db.select().from(schema.routines)).toEqual([]);
		expect(await db.select().from(schema.routineEntries)).toEqual([]);
	});
});
