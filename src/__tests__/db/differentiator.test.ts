import { setsByIsland } from '@/db';

import { freshDb } from '@/test/helpers/db';
import {
  completeSession,
  logSet,
  makeGym,
  makeMovement,
  startSession,
  type StartedSession,
} from '@/test/helpers/fixtures';

/**
 * The differentiator (issue #3, story 4; ADR 0001): progress lives per
 * Exercise × Gym. Sessions at different Gyms — or the same Movement at a
 * different Equipment class — produce separate islands; the same island
 * accumulates.
 */
describe('the differentiator — progress islands (Exercise × Gym)', () => {
  let db: Awaited<ReturnType<typeof freshDb>>;
  beforeEach(async () => {
    db = await freshDb();
  });

  async function island(gymId: number, movementId: number, equipmentClass: string) {
    return setsByIsland(db, { gymId, movementId, equipmentClass });
  }

  test('the same island accumulates across sessions', async () => {
    const gymA = await makeGym(db, 'Gym A');
    const movement = await makeMovement(db, { name: 'Chest Press' });
    const t0 = new Date(2026, 0, 12, 9).getTime(); // Monday, distinct timestamps

    const first = await startSession(db, {
      gymId: gymA.id,
      movement,
      equipmentClass: 'barbell',
      startedAt: t0,
    });
    await logSet(db, first.entry, { loadLb: 100, reps: 5, recordedAt: t0 });
    await logSet(db, first.entry, { loadLb: 100, reps: 5, recordedAt: t0 + 60_000 });

    const second = await startSession(db, {
      gymId: gymA.id,
      movement,
      equipmentClass: 'barbell',
      startedAt: t0 + 120_000,
    });
    await logSet(db, second.entry, { loadLb: 105, reps: 5, recordedAt: t0 + 120_000 });
    await completeSession(db, { sessionId: second.session.id, endedAt: t0 + 180_000 });

    const sets = await island(gymA.id, movement.id, 'barbell');
    expect(sets).toHaveLength(3);
    expect(sets.map((s) => s.loadLb)).toEqual([105, 100, 100]); // newest first
  });

  test('sessions at different Gyms stay separate islands', async () => {
    const gymA = await makeGym(db, 'Gym A');
    const gymB = await makeGym(db, 'Gym B');
    const movement = await makeMovement(db, { name: 'Chest Press' });

    await logTwoSets(
      db,
      await startSession(db, { gymId: gymA.id, movement, equipmentClass: 'barbell' }),
    );
    await logTwoSets(
      db,
      await startSession(db, { gymId: gymB.id, movement, equipmentClass: 'barbell' }),
    );

    expect(await island(gymA.id, movement.id, 'barbell')).toHaveLength(2);
    expect(await island(gymB.id, movement.id, 'barbell')).toHaveLength(2);
  });

  test('same Gym, different Equipment class — separate islands', async () => {
    const gymA = await makeGym(db, 'Gym A');
    const movement = await makeMovement(db, { name: 'Chest Press' });

    await logTwoSets(
      db,
      await startSession(db, { gymId: gymA.id, movement, equipmentClass: 'barbell' }),
    );
    await logTwoSets(
      db,
      await startSession(db, { gymId: gymA.id, movement, equipmentClass: 'dumbbell' }),
    );

    expect(await island(gymA.id, movement.id, 'barbell')).toHaveLength(2);
    expect(await island(gymA.id, movement.id, 'dumbbell')).toHaveLength(2);

    // Both islands stay one movement's history inside the gym.
    const wholeMovement = await setsByIsland(db, { gymId: gymA.id, movementId: movement.id });
    expect(wholeMovement).toHaveLength(4);
  });

  test('islands never merge across Gyms, even un-scoped', async () => {
    const gymA = await makeGym(db, 'Gym A');
    const gymB = await makeGym(db, 'Gym B');
    const movement = await makeMovement(db, { name: 'Chest Press' });

    await logTwoSets(
      db,
      await startSession(db, { gymId: gymA.id, movement, equipmentClass: 'barbell' }),
    );
    await logTwoSets(
      db,
      await startSession(db, { gymId: gymB.id, movement, equipmentClass: 'barbell' }),
    );

    // Reads without a Gym never happen — the differentiator is structural.
    const gymALevel = await setsByIsland(db, { gymId: gymA.id, movementId: movement.id });
    const gymBLevel = await setsByIsland(db, { gymId: gymB.id, movementId: movement.id });
    expect(gymALevel).toHaveLength(2);
    expect(gymBLevel).toHaveLength(2);
  });
});

async function logTwoSets(
  db: Awaited<ReturnType<typeof freshDb>>,
  started: StartedSession,
): Promise<void> {
  await logSet(db, started.entry, { loadLb: 100, reps: 5 });
  await logSet(db, started.entry, { loadLb: 110, reps: 5 });
}
