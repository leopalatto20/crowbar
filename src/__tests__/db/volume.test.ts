import { eq } from 'drizzle-orm';

import {
  appendSessionEntry,
  constants,
  listMuscleGroups,
  schema,
  weekBounds,
  weeklyVolumeByMuscleGroup,
} from '@/db';

import { freshDb } from '@/test/helpers/db';
import { logSet, makeGym, makeMovement, startSession } from '@/test/helpers/fixtures';

/**
 * Weekly volume per muscle group (issue #3, story 5): counted over the calendar
 * week (Mon–Sun), global across gyms and islands. Only direct sets count — each
 * set contributes to its movement's primary group, and the count is what the
 * group's Volume landmark compares against.
 */
describe('weekly volume per muscle group', () => {
  // A Wednesday in January — a DST-free calendar week (Mon Jan 12 → Mon Jan 19 2026).
  const wednesday = new Date(2026, 0, 14, 12).getTime();
  let db: Awaited<ReturnType<typeof freshDb>>;
  beforeEach(async () => {
    db = await freshDb();
  });

  async function volumeByGroup(): Promise<Record<string, number>> {
    const rows = await weeklyVolumeByMuscleGroup(db, weekBounds(wednesday));
    const groups = await listMuscleGroups(db);
    const nameById = new Map(groups.map((g) => [g.id, g.name]));
    return Object.fromEntries(rows.map((r) => [nameById.get(r.muscleGroupId), r.countedSets]));
  }

  test('counts direct sets per primary group over the calendar week, global across gyms', async () => {
    const gymA = await makeGym(db, 'Gym A');
    const gymB = await makeGym(db, 'Gym B');
    const movement = await makeMovement(db, { name: 'Chest Press', muscleGroup: 'Chest' });
    const hipHinge = await makeMovement(db, { name: 'Hip Hinge', muscleGroup: 'Back' });

    // Chest: 2 sets at Gym A, 2 at Gym B → 4 globally.
    const a = await startSession(db, { gymId: gymA.id, movement, startedAt: wednesday });
    await logSet(db, a.entry, { loadLb: 100, reps: 5, recordedAt: wednesday });
    await logSet(db, a.entry, { loadLb: 105, reps: 5, recordedAt: wednesday });
    const b = await startSession(db, { gymId: gymB.id, movement, startedAt: wednesday });
    await logSet(db, b.entry, { loadLb: 100, reps: 5, recordedAt: wednesday });
    await logSet(db, b.entry, { loadLb: 105, reps: 5, recordedAt: wednesday });

    // Back: 1 set elsewhere.
    const back = await startSession(db, {
      gymId: gymB.id,
      movement: hipHinge,
      startedAt: wednesday,
    });
    await logSet(db, back.entry, { loadLb: 200, reps: 5, recordedAt: wednesday });

    const volume = await volumeByGroup();
    expect(volume).toEqual({ Chest: 4, Back: 1 });
  });

  test('only sets inside the calendar week count (Mon 00:00 → next Mon 00:00)', async () => {
    const gym = await makeGym(db, 'Gym A');
    const movement = await makeMovement(db, { name: 'Chest Press' });
    const { start, end } = weekBounds(wednesday);

    const inWeek = await startSession(db, { gymId: gym.id, movement, startedAt: wednesday });
    await logSet(db, inWeek.entry, { loadLb: 100, reps: 5, recordedAt: wednesday });

    const beforeWeek = await startSession(db, { gymId: gym.id, movement, startedAt: start });
    await logSet(db, beforeWeek.entry, { loadLb: 100, reps: 5, recordedAt: start - 86_400_000 }); // previous Sunday

    const atEnd = await startSession(db, { gymId: gym.id, movement, startedAt: end });
    await logSet(db, atEnd.entry, { loadLb: 100, reps: 5, recordedAt: end }); // exactly next Monday 00:00

    expect(await volumeByGroup()).toEqual({ Chest: 1 });
  });

  test('skipped sessions entries never count', async () => {
    const gym = await makeGym(db, 'Gym A');
    const movement = await makeMovement(db, { name: 'Chest Press' });
    const started = await startSession(db, { gymId: gym.id, movement, startedAt: wednesday });

    const skipped = await appendSessionEntry(db, {
      sessionId: started.session.id,
      position: 1,
      movementId: movement.id,
      equipmentClass: 'barbell',
      skipped: true,
    });
    await logSet(db, skipped, { loadLb: 100, reps: 5, recordedAt: wednesday });
    await logSet(db, started.entry, { loadLb: 120, reps: 5, recordedAt: wednesday });

    expect(await volumeByGroup()).toEqual({ Chest: 1 });
  });

  test('the count is what the group landmark compares against (uniform 4–8 by default)', async () => {
    const gym = await makeGym(db, 'Gym A');
    const movement = await makeMovement(db, { name: 'Chest Press', muscleGroup: 'Chest' });

    for (let i = 0; i < 3; i++) {
      await logSet(
        db,
        (await startSession(db, { gymId: gym.id, movement, startedAt: wednesday })).entry,
        {
          loadLb: 100 + i,
          reps: 5,
          recordedAt: wednesday,
        },
      );
    }

    const landmark = (
      await db.select().from(schema.muscleGroups).where(eq(schema.muscleGroups.name, 'Chest'))
    )[0];
    expect(landmark.volumeMin).toBe(constants.DEFAULT_VOLUME_MIN);
    expect(landmark.volumeMax).toBe(constants.DEFAULT_VOLUME_MAX);

    // The query reports the raw direct count; the landmark comparison is the
    // app layer's job. 3 chest sets is below the 4–8 landmark — nothing here
    // rounds, merges, or counts secondary work.
    const volume = await volumeByGroup();
    expect(volume).toEqual({ Chest: 3 });
    expect(volume.Chest).toBeLessThan(landmark.volumeMin);
  });
});
