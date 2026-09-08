import { eq } from 'drizzle-orm';

import { constants, schema, setsByIsland } from '@/db';

import { freshDb } from '../../test/helpers/db';
import { logSet, makeGym, makeMovement, startSession } from '../../test/helpers/fixtures';

/**
 * Truthfulness (issue #3, story 7): every stored proximity value carries the
 * Recording scale it was written in, and loads persist canonically in pounds
 * (ADR 0004) whatever unit the movement is logged in.
 */
describe('truthfulness — recording scale and canonical loads', () => {
	let db: Awaited<ReturnType<typeof freshDb>>;
	beforeEach(async () => {
		db = await freshDb();
	});

	async function oneSetSession(gymId: number, set: { loadLb: number; reps?: number; proximity?: { scale: string; value: number } }) {
		const bench = await makeMovement(db, { name: 'Bench Press' });
		const started = await startSession(db, { gymId, movement: bench });
		await logSet(db, started.entry, set);
		return setsByIsland(db, { gymId, movementId: bench.id, equipmentClass: 'barbell' });
	}

	test('proximity values carry the Recording scale they were written in', async () => {
		const gym = await makeGym(db, 'Gym A');
		const [set] = await oneSetSession(gym.id, { loadLb: 100, proximity: { scale: 'rpe', value: 1 } });

		expect(set.proximityScale).toBe('rpe');
		expect(set.proximityValue).toBe(1);
	});

	test('mixing Recording scales within one island keeps each value truthful', async () => {
		const gym = await makeGym(db, 'Gym A');
		const bench = await makeMovement(db, { name: 'Bench Press' });

		const first = await startSession(db, { gymId: gym.id, movement: bench });
		await logSet(db, first.entry, { loadLb: 100, proximity: { scale: 'rpe', value: 2 } });

		const second = await startSession(db, { gymId: gym.id, movement: bench });
		await logSet(db, second.entry, { loadLb: 100, proximity: { scale: 'rir', value: 3 } });

		const sets = await setsByIsland(db, { gymId: gym.id, movementId: bench.id, equipmentClass: 'barbell' });
		expect(sets.map((s) => ({ scale: s.proximityScale, value: s.proximityValue }))).toEqual(
			expect.arrayContaining([
				{ scale: 'rpe', value: 2 },
				{ scale: 'rir', value: 3 },
			]),
		);
	});

	test('every Recording scale is from the closed set, and per-set values are optional', async () => {
		const gym = await makeGym(db, 'Gym A');
		const [plain] = await oneSetSession(gym.id, { loadLb: 100 });

		expect(plain.proximityScale).toBeNull();
		expect(plain.proximityValue).toBeNull();
		expect(constants.RECORDING_SCALES).toEqual(['rir', 'rpe']);
	});

	test('loads persist canonically in pounds, whatever the movement unit', async () => {
		const gym = await makeGym(db, 'Gym A');
		const inKg = await makeMovement(db, { name: 'Bench Press (kg)', unit: 'kg' });
		const inLb = await makeMovement(db, { name: 'Bench Press (lb)', unit: 'lb' });

		const kgSession = await startSession(db, { gymId: gym.id, movement: inKg });
		const kgSet = await logSet(db, kgSession.entry, { loadLb: 100, reps: 5 });

		const lbSession = await startSession(db, { gymId: gym.id, movement: inLb });
		await logSet(db, lbSession.entry, { loadLb: 100, reps: 5 });

		// The stored row is canonical pounds — no as-entered unit rides along.
		for (const entryId of [kgSet.sessionEntryId, lbSession.entry.id]) {
			const row = (await db.select().from(schema.sets).where(eq(schema.sets.sessionEntryId, entryId)))[0];
			expect(row.loadLb).toBe(100);
			expect(Object.keys(row)).not.toContain('unit');
		}

		const kgIsland = await setsByIsland(db, { gymId: gym.id, movementId: inKg.id, equipmentClass: 'barbell' });
		const lbIsland = await setsByIsland(db, { gymId: gym.id, movementId: inLb.id, equipmentClass: 'barbell' });
		expect(kgIsland[0].loadLb).toBe(100);
		expect(lbIsland[0].loadLb).toBe(100);
	});
});