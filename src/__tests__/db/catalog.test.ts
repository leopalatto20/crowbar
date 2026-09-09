import { eq } from 'drizzle-orm';

import {
	archiveMovement,
	deleteMovement,
	getMovementDeleteReferences,
	listMovements,
	schema,
	setSubRoutineClass,
	setsByIsland,
	unarchiveMovement,
} from '@/db';

import { freshDb } from '@/test/helpers/db';
import { makeGym, makeMovement, makeRoutine, startSession, logSet } from '@/test/helpers/fixtures';

/**
 * Catalog browse read path (issue #7): flat A–Z listing, muscle-group filter,
 * name search, archived gating. Proven at the DB seam against the seeded
 * catalog — the identity list, never the measurement one.
 */
describe('catalog browse read path', () => {
	let db: Awaited<ReturnType<typeof freshDb>>;
	beforeEach(async () => {
		db = await freshDb(); // migrations bundle seeds the 14 muscle groups + canonical movements
	});

	async function archive(movementId: number) {
		await db.update(schema.movements).set({ archived: 1 }).where(eq(schema.movements.id, movementId));
	}

	test('lists non-archived movements flat A–Z, each row carrying its muscle group, no volume numbers', async () => {
		const rows = await listMovements(db);

		// Every seeded movement is present, ordered case-insensitively A–Z.
		const names = rows.map((r) => r.name);
		expect(names).toEqual([...names].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())));
		expect(names.length).toBeGreaterThan(40);

		// Each row names its primary muscle group and exposes no volume numbers.
		for (const row of rows) {
			expect(row.muscleGroup).toBeTruthy();
			expect(row).not.toHaveProperty('volumeMin');
			expect(row).not.toHaveProperty('volumeMax');
			expect(row).not.toHaveProperty('countedSets');
		}

		// A-Z ordering is literal across the list (e.g. "Bench Press" before "Bulgarian Split Squat").
		expect(names.indexOf('Bench Press')).toBeLessThan(names.indexOf('Bulgarian Split Squat'));
	});

	test('muscle-group filter narrows to one group, still A–Z', async () => {
		const chest = await listMovements(db, { muscleGroup: 'Chest' });
		expect(chest.length).toBeGreaterThan(1);
		for (const row of chest) {
			expect(row.muscleGroup).toBe('Chest');
		}
		const names = chest.map((r) => r.name);
		expect(names).toEqual([...names].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())));
	});

	test('name search matches case-insensitively', async () => {
		const curls = await listMovements(db, { query: 'curl' });
		const names = curls.map((r) => r.name).sort();
		expect(names).toEqual(['Curl', 'Hammer Curl', 'Leg Curl', 'Reverse Curl', 'Wrist Curl']);

		// Case-insensitive substring: 'pUsh' still finds 'Push-Up'.
		const pushups = await listMovements(db, { query: 'pUsh' });
		expect(pushups.map((r) => r.name)).toContain('Push-Up');
	});

	test('search combines with the active filter', async () => {
		const forearmCurls = await listMovements(db, { muscleGroup: 'Forearms', query: 'curl' });
		expect(forearmCurls.map((r) => r.name).sort()).toEqual(['Reverse Curl', 'Wrist Curl']);
	});

	test('name search treats LIKE wildcards in the input literally', async () => {
		// A lone '%' must not match everything — user input is a literal name match.
		expect(await listMovements(db, { query: '%' })).toEqual([]);
		expect(await listMovements(db, { query: '_' })).toEqual([]);
	});

	test('archived movements are gated out entirely by default', async () => {
		const bench = (await listMovements(db, { query: 'bench' }))[0];
		await archive(bench.id);

		const rows = await listMovements(db);
		expect(rows.map((r) => r.name)).not.toContain('Bench Press');

		// An archived movement does not surface through search or filter either.
		const searched = await listMovements(db, { query: 'bench' });
		expect(searched).toEqual([]);
		const chest = await listMovements(db, { muscleGroup: 'Chest' });
		expect(chest.map((r) => r.name)).not.toContain('Bench Press');
	});

	test('includeArchived reveals archived rows, which then participate in search and filter', async () => {
		const bench = (await listMovements(db, { query: 'bench' }))[0];
		await archive(bench.id);

		const all = await listMovements(db, { includeArchived: true });
		expect(all.map((r) => r.name)).toContain('Bench Press');
		const archivedRow = all.find((r) => r.name === 'Bench Press');
		expect(archivedRow?.archived).toBe(true);

		// Revealed archived rows join the same A–Z list and honor search/filter.
		const searched = await listMovements(db, { includeArchived: true, query: 'bench' });
		expect(searched.map((r) => r.name)).toEqual(['Bench Press']);
		const chest = await listMovements(db, { includeArchived: true, muscleGroup: 'Chest' });
		expect(chest.map((r) => r.name)).toContain('Bench Press');
	});

	test('user-created movements join the same A–Z list', async () => {
		await makeMovement(db, { name: 'Cable Fly', muscleGroup: 'Chest' });
		const rows = await listMovements(db, { muscleGroup: 'Chest' });
		expect(rows.map((r) => r.name)).toContain('Cable Fly');
	});

	test('archive and unarchive preserve history while changing picker visibility', async () => {
		const movement = await makeMovement(db, { name: 'Catalog-only Fly' });
		const gym = await makeGym(db, 'Downtown');
		const routine = await makeRoutine(db, 'Upper A');
		await db.insert(schema.routineEntries).values({ routineId: routine.id, position: 0, movementId: movement.id });
		await setSubRoutineClass(db, {
			routineId: routine.id,
			gymId: gym.id,
			movementId: movement.id,
			equipmentClass: 'barbell',
			position: 0,
		});
		const { entry } = await startSession(db, { gymId: gym.id, movement });
		await logSet(db, entry, { loadLb: 100 });

		const archived = await archiveMovement(db, movement.id);
		expect(archived.archived).toBe(1);
		expect(await listMovements(db, { query: movement.name })).toEqual([]);
		expect((await listMovements(db, { includeArchived: true, query: movement.name }))[0].archived).toBe(true);
		expect(await setsByIsland(db, { gymId: gym.id, movementId: movement.id })).toHaveLength(1);
		const references = await getMovementDeleteReferences(db, movement.id);
		expect(references.routines).toEqual([{ id: routine.id, name: 'Upper A' }]);
		expect(references.subRoutines).toHaveLength(1);

		const restored = await unarchiveMovement(db, movement.id);
		expect(restored.archived).toBe(0);
		expect((await listMovements(db, { query: movement.name }))[0].name).toBe(movement.name);
	});

	test('deletes a movement with no history or references', async () => {
		const movement = await makeMovement(db, { name: 'Disposable Fly' });

		expect(await getMovementDeleteReferences(db, movement.id)).toEqual({
			sets: 0,
			routines: [],
			subRoutines: [],
			sessions: [],
		});
		expect(await deleteMovement(db, movement.id)).toEqual({ deleted: true });
		expect(await db.select().from(schema.movements).where(eq(schema.movements.id, movement.id))).toEqual([]);
	});

	test('blocks deletion for history and groups its session reference', async () => {
		const movement = await makeMovement(db, { name: 'Recorded Fly' });
		const gym = await makeGym(db, 'Downtown');
		const { session, entry } = await startSession(db, { gymId: gym.id, movement, startedAt: 1_700_000_000_000 });
		await logSet(db, entry, { loadLb: 100 });

		const references = await getMovementDeleteReferences(db, movement.id);
		expect(references.sets).toBe(1);
		expect(references.sessions).toEqual([{ id: session.id, name: 'Downtown', date: session.startedAt }]);
		expect((await deleteMovement(db, movement.id)).deleted).toBe(false);
		expect(await db.select().from(schema.movements).where(eq(schema.movements.id, movement.id))).toHaveLength(1);
	});

	test('blocks deletion for a session entry even when it has no sets', async () => {
		const movement = await makeMovement(db, { name: 'Skipped Fly' });
		const gym = await makeGym(db, 'Home');
		await startSession(db, { gymId: gym.id, movement });

		const references = await getMovementDeleteReferences(db, movement.id);
		expect(references.sets).toBe(0);
		expect(references.sessions).toHaveLength(1);
		expect((await deleteMovement(db, movement.id)).deleted).toBe(false);
	});

	test('blocks deletion for routine and sub-routine references even without history', async () => {
		const movement = await makeMovement(db, { name: 'Planned Fly' });
		const gym = await makeGym(db, 'Home');
		const routine = await makeRoutine(db, 'Upper A');
		await db.insert(schema.routineEntries).values({ routineId: routine.id, position: 0, movementId: movement.id });
		await setSubRoutineClass(db, {
			routineId: routine.id,
			gymId: gym.id,
			movementId: movement.id,
			equipmentClass: 'barbell',
			position: 0,
		});

		const references = await getMovementDeleteReferences(db, movement.id);
		expect(references).toMatchObject({
			sets: 0,
			routines: [{ id: routine.id, name: 'Upper A' }],
			subRoutines: [{ name: 'Upper A × Home', routineId: routine.id, gymId: gym.id }],
			sessions: [],
		});
		const result = await deleteMovement(db, movement.id);
		expect(result.deleted).toBe(false);
	});
});
