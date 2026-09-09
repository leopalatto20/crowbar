import { opendir, readdir } from 'node:fs/promises';
import { join } from 'node:path';

import { createGym, getDb, listGyms, setDbFactory } from '@/db';

import { closeDb, freshDb } from '@/test/helpers/db';
import { logSet, makeGym, makeMovement, startSession as startSessionFixture } from '@/test/helpers/fixtures';

/**
 * The getDb() test seam (issue #3, stories 2 & 9): tests run against real
 * SQLite — better-sqlite3 backing the same schema and migrations — installed
 * through `setDbFactory`, and never touch the on-device database.
 */
describe('the getDb() test seam', () => {
	afterEach(() => setDbFactory(undefined));

	test('getDb() serves the better-sqlite3 handle installed via setDbFactory', async () => {
		const db = await freshDb();
		setDbFactory(() => db);

		expect(getDb()).toBe(db);

		// The underlying client is a real SQLite connection, not a mock.
		const raw = db.$client.prepare('SELECT 1 AS one').get();
		expect(raw).toEqual({ one: 1 });
	});

	test('repository work through getDb() lands in the test database', async () => {
		const db = await freshDb();
		setDbFactory(() => db);

		const gym = await createGym(getDb(), { name: 'Iron Hall' });
		const movement = await makeMovement(getDb(), { name: 'Chest Press' });
		const { entry } = await startSessionFixture(getDb(), { gymId: gym.id, movement });
		await logSet(getDb(), entry, { loadLb: 100, reps: 5 });

		expect((await listGyms(getDb())).map((g) => g.name)).toContain('Iron Hall');
	});

	test('each test resolves its own fresh in-memory database', async () => {
		const first = await freshDb();
		await makeGym(first, 'Gym A');
		closeDb(first);

		const second = await freshDb();
		setDbFactory(() => second);
		expect((await listGyms(getDb())).map((g) => g.name)).toEqual(['Home']); // Gym A is gone
	});

	test('the suite never touches the on-device database file', async () => {
		// Exercise the seam and the domain against in-memory handles…
		const db = await freshDb();
		setDbFactory(() => db);
		const gym = await makeGym(getDb(), 'Iron Hall');
		const movement = await makeMovement(getDb(), { name: 'Chest Press' });
		const { entry } = await startSessionFixture(getDb(), { gymId: gym.id, movement });
		await logSet(getDb(), entry, { loadLb: 100, reps: 5 });

		// …then prove no on-device file was ever opened anywhere under the repo.
		const offenders: string[] = [];
		await walk(process.cwd(), 6, (path) => {
			if (path.endsWith('crowbar.db') || path.endsWith('.db')) {
				offenders.push(path);
			}
		});
		expect(offenders).toEqual([]);
	});
});

async function walk(dir: string, depth: number, visit: (path: string) => void): Promise<void> {
	if (depth < 0) return;
	const entries = await readdir(dir, { withFileTypes: true });
	for (const entry of entries) {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) {
			if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.expo' || entry.name === 'coverage') {
				continue;
			}
			await walk(path, depth - 1, visit);
		} else {
			visit(path);
		}
	}
}