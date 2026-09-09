import { and, eq } from 'drizzle-orm';

import { getSubRoutine, schema, setSubRoutineClass } from '@/db';

import { freshDb } from '@/test/helpers/db';
import { makeGym, makeMovement, makeRoutine } from '@/test/helpers/fixtures';

/**
 * Sub-routine binding persistence (issue #3, story 6): a Routine is adapted per
 * Gym — the recorded binding of each Movement to the Equipment class the lifter
 * actually used there. One sub-routine per Routine × Gym; updates are explicit.
 */
describe('sub-routine binding — Routine × Gym maps Movement → Equipment class', () => {
	let db: Awaited<ReturnType<typeof freshDb>>;
	beforeEach(async () => {
		db = await freshDb();
	});

	test('no binding exists before the first one is recorded', async () => {
		const gym = await makeGym(db, 'Gym A');
		const routine = await makeRoutine(db, 'Push');

		expect(await getSubRoutine(db, { routineId: routine.id, gymId: gym.id })).toBeNull();
	});

	test('first binding creates the sub-routine; re-binding updates it explicitly', async () => {
		const gym = await makeGym(db, 'Gym A');
		const routine = await makeRoutine(db, 'Push');
		const movement = await makeMovement(db, { name: 'Chest Press' });

		await setSubRoutineClass(db, {
			routineId: routine.id,
			gymId: gym.id,
			movementId: movement.id,
			equipmentClass: 'barbell',
			position: 0,
		});

		const bound = await getSubRoutine(db, { routineId: routine.id, gymId: gym.id });
		expect(bound?.entries).toHaveLength(1);
		expect(bound?.entries[0].equipmentClass).toBe('barbell');

		// The lifter switched to the machine at this gym: the binding changes
		// explicitly — still one entry, new class.
		await setSubRoutineClass(db, {
			routineId: routine.id,
			gymId: gym.id,
			movementId: movement.id,
			equipmentClass: 'machine',
			position: 0,
		});

		const rebound = await getSubRoutine(db, { routineId: routine.id, gymId: gym.id });
		expect(rebound?.entries).toHaveLength(1);
		expect(rebound?.entries[0].equipmentClass).toBe('machine');
	});

	test('bindings are independent per Gym — the differentiator holds', async () => {
		const gymA = await makeGym(db, 'Gym A');
		const gymB = await makeGym(db, 'Gym B');
		const routine = await makeRoutine(db, 'Push');
		const movement = await makeMovement(db, { name: 'Chest Press' });

		await setSubRoutineClass(db, {
			routineId: routine.id,
			gymId: gymA.id,
			movementId: movement.id,
			equipmentClass: 'barbell',
			position: 0,
		});
		await setSubRoutineClass(db, {
			routineId: routine.id,
			gymId: gymB.id,
			movementId: movement.id,
			equipmentClass: 'dumbbell',
			position: 0,
		});

		expect((await getSubRoutine(db, { routineId: routine.id, gymId: gymA.id }))?.entries[0].equipmentClass).toBe('barbell');
		expect((await getSubRoutine(db, { routineId: routine.id, gymId: gymB.id }))?.entries[0].equipmentClass).toBe('dumbbell');
	});

	test('each Routine × Gym has exactly one sub-routine', async () => {
		const gym = await makeGym(db, 'Gym A');
		const routine = await makeRoutine(db, 'Push');
		const movement = await makeMovement(db, { name: 'Chest Press' });

		await setSubRoutineClass(db, {
			routineId: routine.id,
			gymId: gym.id,
			movementId: movement.id,
			equipmentClass: 'barbell',
			position: 0,
		});
		await setSubRoutineClass(db, {
			routineId: routine.id,
			gymId: gym.id,
			movementId: movement.id,
			equipmentClass: 'machine',
			position: 0,
		});

		const rows = await db
			.select()
			.from(schema.subRoutines)
			.where(and(eq(schema.subRoutines.routineId, routine.id), eq(schema.subRoutines.gymId, gym.id)));
		expect(rows).toHaveLength(1);
	});
});