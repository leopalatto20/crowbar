import { eq } from 'drizzle-orm';

import {
  archiveRoutine,
  createRoutine,
  deleteRoutine,
  getRoutine,
  getRoutineDeleteReferences,
  listMovements,
  listRoutines,
  schema,
  unarchiveRoutine,
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
      { id: saved.routine.id, name: 'Push day', movementCount: 1, archived: false },
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

  test('archives and restores a Routine without changing its entries or references', async () => {
    const movement = await makeMovement(db, { name: 'Archived routine movement' });
    const gym = await makeGym(db, 'Archived routine gym');
    const saved = await createRoutine(db, { name: 'Archived routine', movementIds: [movement.id] });
    const subRoutine = (
      await db
        .insert(schema.subRoutines)
        .values({ routineId: saved.routine.id, gymId: gym.id })
        .returning()
    )[0];
    const startedAt = 1_700_000_000_000;
    const session = (
      await db
        .insert(schema.sessions)
        .values({ gymId: gym.id, subRoutineId: subRoutine.id, startedAt })
        .returning()
    )[0];
    const references = await getRoutineDeleteReferences(db, saved.routine.id);

    const archived = await archiveRoutine(db, saved.routine.id);
    expect(archived.archived).toBe(1);
    expect(await listRoutines(db)).toEqual([]);
    expect(await listRoutines(db, { includeArchived: true })).toEqual([
      { id: saved.routine.id, name: 'Archived routine', movementCount: 1, archived: true },
    ]);
    expect(await db.select().from(schema.routineEntries)).toHaveLength(1);
    expect(await getRoutineDeleteReferences(db, saved.routine.id)).toEqual(references);
    expect(await db.select().from(schema.subRoutines)).toEqual([subRoutine]);
    expect(await db.select().from(schema.sessions)).toEqual([session]);

    const restored = await unarchiveRoutine(db, saved.routine.id);
    expect(restored.archived).toBe(0);
    expect((await listRoutines(db))[0]).toMatchObject({
      name: 'Archived routine',
      archived: false,
    });
    expect(await getRoutineDeleteReferences(db, saved.routine.id)).toEqual(references);
    expect((await listMovements(db)).map((row) => row.id)).toContain(movement.id);
  });

  test('persists optional targets and rejects invalid targets atomically', async () => {
    const movement = await makeMovement(db, { name: 'Targeted press' });
    const saved = await createRoutine(db, {
      name: 'Targeted routine',
      entries: [
        {
          movementId: movement.id,
          workingSetCount: 4,
          repMin: 6,
          repMax: 8,
          proximityValue: 2,
          proximityScale: 'rpe',
          tempo: '3-1-1-0',
        },
      ],
    });
    expect(saved.entries[0]).toMatchObject({
      workingSetCount: 4,
      repMin: 6,
      repMax: 8,
      proximityValue: 2,
      proximityScale: 'rpe',
      tempo: '3-1-1-0',
    });

    await expect(
      createRoutine(db, {
        name: 'Invalid targets',
        entries: [{ movementId: movement.id, workingSetCount: 0 }],
      }),
    ).rejects.toThrow('Working-set count');
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

    await expect(
      updateRoutine(db, saved.routine.id, {
        name: 'Failed edit',
        entries: [{ movementId: first.id, workingSetCount: 0 }],
      }),
    ).rejects.toThrow('Working-set count');
    expect(await getRoutine(db, saved.routine.id)).toMatchObject({
      routine: { name: 'Edited routine' },
      entries: [{ movementId: second.id, workingSetCount: 3 }],
    });
  });

  test('rejects duplicate entries and duplicate Routine names', async () => {
    const movement = await makeMovement(db, { name: 'Unique movement' });
    await createRoutine(db, { name: 'Morning Push', movementIds: [movement.id] });
    await expect(
      createRoutine(db, {
        name: 'morning push',
        movementIds: [movement.id],
      }),
    ).rejects.toThrow('already exists');
    await expect(
      createRoutine(db, {
        name: 'Another routine',
        movementIds: [movement.id, movement.id],
      }),
    ).rejects.toThrow('same Movement twice');
  });

  test('deletes a Routine with no Sub-routine or Session-history references', async () => {
    const movement = await makeMovement(db, { name: 'Disposable routine movement' });
    const saved = await createRoutine(db, {
      name: 'Disposable routine',
      movementIds: [movement.id],
    });

    expect(await getRoutineDeleteReferences(db, saved.routine.id)).toEqual({
      subRoutines: [],
      sessions: [],
    });
    expect(await deleteRoutine(db, saved.routine.id)).toEqual({ deleted: true });
    expect(await getRoutine(db, saved.routine.id)).toBeNull();
    expect(await db.select().from(schema.routineEntries)).toEqual([]);
  });

  test('blocks Routine deletion and reports Sub-routine and Session-history references', async () => {
    const movement = await makeMovement(db, { name: 'Referenced routine movement' });
    const gym = await makeGym(db, 'Routine gym');
    const saved = await createRoutine(db, {
      name: 'Referenced routine',
      movementIds: [movement.id],
    });
    const subRoutine = (
      await db
        .insert(schema.subRoutines)
        .values({ routineId: saved.routine.id, gymId: gym.id })
        .returning()
    )[0];
    const startedAt = 1_700_000_000_000;
    const session = (
      await db
        .insert(schema.sessions)
        .values({ gymId: gym.id, subRoutineId: subRoutine.id, startedAt })
        .returning()
    )[0];

    expect(await getRoutineDeleteReferences(db, saved.routine.id)).toEqual({
      subRoutines: [
        { id: subRoutine.id, name: 'Routine gym', routineId: saved.routine.id, gymId: gym.id },
      ],
      sessions: [{ id: session.id, name: 'Routine gym', date: startedAt }],
    });
    expect(await deleteRoutine(db, saved.routine.id)).toEqual({
      deleted: false,
      references: {
        subRoutines: [
          { id: subRoutine.id, name: 'Routine gym', routineId: saved.routine.id, gymId: gym.id },
        ],
        sessions: [{ id: session.id, name: 'Routine gym', date: startedAt }],
      },
    });
    expect(await getRoutine(db, saved.routine.id)).not.toBeNull();
  });

  test('rejects invalid drafts atomically', async () => {
    const movement = await makeMovement(db, { name: 'Archived draft movement' });
    await db
      .update(schema.movements)
      .set({ archived: 1 })
      .where(eq(schema.movements.id, movement.id));

    await expect(createRoutine(db, { name: ' ', movementIds: [movement.id] })).rejects.toThrow(
      'Routine name cannot be blank',
    );
    await expect(
      createRoutine(db, { name: 'Should not save', movementIds: [movement.id] }),
    ).rejects.toThrow('Every Routine Movement must be active');
    expect(await db.select().from(schema.routines)).toEqual([]);
    expect(await db.select().from(schema.routineEntries)).toEqual([]);
  });
});
