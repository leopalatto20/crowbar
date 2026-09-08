import { mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';

import { constants, getHomeGym, listGyms, listMuscleGroups, migrateDb, schema, setsByIsland } from '@/db';
import { movements, muscleGroups } from '@/db/schema';

import { closeDb, freshDb, freshFileDb } from '../../test/helpers/db';
import { logSet, makeGym, makeMovement, startSession } from '../../test/helpers/fixtures';

describe('migration bootstrap', () => {
	test('an empty database migrates to the current schema with identity seeds', async () => {
		const db = await freshDb();

		// Canonical muscle-group catalog…
		const groups = await listMuscleGroups(db);
		expect(groups.map((g) => g.name).sort()).toEqual([...constants.MUSCLE_GROUPS].sort());
		// …with the uniform default landmark on each.
		for (const group of groups) {
			expect(group.volumeMin).toBe(constants.DEFAULT_VOLUME_MIN);
			expect(group.volumeMax).toBe(constants.DEFAULT_VOLUME_MAX);
		}

		const seededMovements = await db
			.select({
				name: movements.name,
				muscleGroup: muscleGroups.name,
				unit: movements.unit,
				instructions: movements.instructions,
				archived: movements.archived,
			})
			.from(movements)
			.innerJoin(muscleGroups, eq(muscleGroups.id, movements.primaryMuscleGroupId));
		const expectedMovements = {
			Chest: ['Bench Press', 'Dips', 'Fly', 'Push-Up'],
			Back: ['Bent-Over Row', 'Chin-Up', 'Lat Pulldown', 'One-Arm Row', 'Pull-Up', 'Seated Row'],
			Shoulders: ['Front Raise', 'Lateral Raise', 'Overhead Press', 'Rear Delt Fly'],
			Biceps: ['Curl', 'Hammer Curl'],
			Triceps: ['Overhead Triceps Extension', 'Triceps Pushdown'],
			Forearms: ['Reverse Curl', 'Wrist Curl', 'Wrist Extension'],
			Core: ['Crunch', 'Leg Raise', 'Plank', 'Russian Twist'],
			Obliques: ['Side Plank', 'Wood Chop'],
			Traps: ['Shrug', 'Upright Row'],
			Quads: ['Bulgarian Split Squat', 'Leg Extension', 'Leg Press', 'Squat', 'Walking Lunge'],
			Adductors: ['Copenhagen Plank', 'Hip Adduction'],
			Hamstrings: ['Deadlift', 'Good Morning', 'Leg Curl', 'Romanian Deadlift'],
			Glutes: ['Glute Bridge', 'Glute Kickback', 'Hip Thrust'],
			Calves: ['Seated Calf Raise', 'Single-Leg Calf Raise', 'Standing Calf Raise'],
		} as const;
		expect(seededMovements).toHaveLength(46);
		expect(
			Object.entries(expectedMovements)
				.flatMap(([muscleGroup, names]) => names.map((name) => ({ name, muscleGroup })))
				.sort((a, b) => a.name.localeCompare(b.name)),
		).toEqual(
			seededMovements
				.map(({ name, muscleGroup }) => ({ name, muscleGroup }))
				.sort((a, b) => a.name.localeCompare(b.name)),
		);
		for (const movement of seededMovements) {
			expect(movement.unit).toBe('kg');
			expect(movement.instructions).toBeNull();
			expect(movement.archived).toBe(0);
		}
		expect(constants.MUSCLE_GROUPS).toEqual([
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

		// Home gym exists by default, flagged.
		const home = await getHomeGym(db);
		expect(home?.name).toBe('Home');
		expect(home?.isHome).toBe(1);

		// App-wide defaults recorded.
		const settingRows = await db.select().from(schema.settings);
		const settings = Object.fromEntries(settingRows.map((r) => [r.key, r.value]));
		expect(settings).toEqual({ recording_scale: 'rpe', default_unit: 'kg' });

		// The migrated schema actually serves the domain end-to-end.
		const gym = await makeGym(db, 'Iron Hall');
		const movement = await makeMovement(db, { name: 'Chest Press' });
		const { entry } = await startSession(db, { gymId: gym.id, movement });
		await logSet(db, entry, { loadLb: 100, reps: 5 });
		const island = await setsByIsland(db, { gymId: gym.id, movementId: movement.id, equipmentClass: 'barbell' });
		expect(island).toHaveLength(1);
		expect(island[0].loadLb).toBe(100);
	});

	test('movement names are unique regardless of case or spacing', async () => {
		const db = await freshDb();

		await expect(
			db.insert(movements).values({
				name: 'bench  press',
				primaryMuscleGroupId: 1,
				unit: 'kg',
			}),
		).rejects.toThrow();
	});

	test('re-applying migrations is a no-op that preserves data', async () => {
		const db = await freshDb();
		const movement = await makeMovement(db, { name: 'Chest Press' });

		await migrateDb(db);

		const still = (await db.select().from(movements).where(eq(movements.id, movement.id)))[0];
		expect(still?.name).toBe('Chest Press');
		const groups = await listMuscleGroups(db);
		expect(groups).toHaveLength(constants.MUSCLE_GROUPS.length); // seeds not duplicated
	});

	test('a migrated file is stable across reopen — no re-apply, no loss', async () => {
		const dir = join(tmpdir(), `crowbar-test-${process.pid}-${Date.now()}`);
		await mkdir(dir);
		const path = join(dir, 'crowbar-test.db');
		try {
			let db = await freshFileDb(path);
			const gym = await makeGym(db, 'Iron Hall');
			closeDb(db);

			// Reopen the same file: data intact, migrations recognized as applied.
			db = await freshFileDb(path);
			const gyms = await listGyms(db);
			expect(gyms.map((g) => g.name)).toEqual(['Home', 'Iron Hall']);
			const groups = await listMuscleGroups(db);
			expect(groups).toHaveLength(constants.MUSCLE_GROUPS.length);
		} finally {
			await rm(dir, { recursive: true, force: true });
		}
	});
});