import { eq } from 'drizzle-orm';

import {
  createMovement,
  findMovementByName,
  getDefaultUnit,
  listMuscleGroups,
  setsByIsland,
  schema,
  updateMovement,
  weeklyVolumeByMuscleGroup,
  weekBounds,
} from '@/db';

import { freshDb } from '@/test/helpers/db';
import { logSet, makeGym, startSession } from '@/test/helpers/fixtures';

describe('movement editor repository seam', () => {
  test('rejects blank names on create and update', async () => {
    const db = await freshDb();
    const chest = (await listMuscleGroups(db)).find((group) => group.name === 'Chest');
    if (!chest) throw new Error('Chest was not seeded');

    await expect(
      createMovement(db, { name: ' \t ', primaryMuscleGroupId: chest.id }),
    ).rejects.toThrow(/name/i);
    const movement = await createMovement(db, {
      name: 'Blank Test',
      primaryMuscleGroupId: chest.id,
    });
    await expect(updateMovement(db, movement.id, { name: ' \n ' })).rejects.toThrow(/name/i);
  });

  test('uses the settings default for omitted units, honors explicit units, and blocks duplicates', async () => {
    const db = await freshDb();
    const chest = (await listMuscleGroups(db)).find((group) => group.name === 'Chest');
    if (!chest) throw new Error('Chest was not seeded');

    await db
      .update(schema.settings)
      .set({ value: 'lb' })
      .where(eq(schema.settings.key, 'default_unit'));
    expect(await getDefaultUnit(db)).toBe('lb');
    const settingsDefault = await createMovement(db, {
      name: 'Settings Default Unit',
      primaryMuscleGroupId: chest.id,
    });
    const explicitUnit = await createMovement(db, {
      name: 'Explicit Unit',
      primaryMuscleGroupId: chest.id,
      unit: 'kg',
    });
    expect(settingsDefault.unit).toBe('lb');
    expect(explicitUnit.unit).toBe('kg');
    await expect(
      createMovement(db, { name: ' settings   default unit ', primaryMuscleGroupId: chest.id }),
    ).rejects.toThrow(/already exists|duplicate/i);
  });

  test('rejects exact duplicates, including archived movements', async () => {
    const db = await freshDb();
    const chest = (await listMuscleGroups(db)).find((group) => group.name === 'Chest');
    if (!chest) throw new Error('Chest was not seeded');
    const movement = await createMovement(db, {
      name: 'Archived Duplicate',
      primaryMuscleGroupId: chest.id,
    });
    await db
      .update(schema.movements)
      .set({ archived: 1 })
      .where(eq(schema.movements.id, movement.id));
    const near = await createMovement(db, {
      name: 'Archived Near Match',
      primaryMuscleGroupId: chest.id,
    });
    await db.update(schema.movements).set({ archived: 1 }).where(eq(schema.movements.id, near.id));

    expect((await findMovementByName(db, 'Archived Near Matc', { near: true }))?.id).toBe(near.id);
    await expect(
      createMovement(db, { name: ' archived   duplicate ', primaryMuscleGroupId: chest.id }),
    ).rejects.toThrow(/already exists|duplicate/i);
  });

  test('allows a self rename while preserving display spelling', async () => {
    const db = await freshDb();
    const chest = (await listMuscleGroups(db)).find((group) => group.name === 'Chest');
    if (!chest) throw new Error('Chest was not seeded');
    const movement = await createMovement(db, {
      name: 'Self Rename',
      primaryMuscleGroupId: chest.id,
    });

    const updated = await updateMovement(db, movement.id, { name: '  Self  Rename  ' });
    expect(updated.name).toBe('Self  Rename');
  });

  test('finds exact names and one deterministic near match within distance two', async () => {
    const db = await freshDb();
    const chest = (await listMuscleGroups(db)).find((group) => group.name === 'Chest');
    if (!chest) throw new Error('Chest was not seeded');
    const first = await createMovement(db, { name: 'ZyxAlpha', primaryMuscleGroupId: chest.id });
    const second = await createMovement(db, { name: 'ZyxAlphi', primaryMuscleGroupId: chest.id });

    expect((await findMovementByName(db, ' zyx alpha '))?.id).toBe(first.id);
    expect((await findMovementByName(db, 'ZyxAlph', { near: true }))?.id).toBe(first.id);
    // Excluding the edited row still returns the next nearest candidate.
    expect((await findMovementByName(db, 'ZyxAlph', { near: true, excludeId: first.id }))?.id).toBe(
      second.id,
    );
    expect(await findMovementByName(db, 'Zyx', { near: true })).toBeNull();
  });

  test('updates each movement field independently and re-tags historical volume', async () => {
    const db = await freshDb();
    const groups = await listMuscleGroups(db);
    const chest = groups.find((group) => group.name === 'Chest');
    const back = groups.find((group) => group.name === 'Back');
    if (!chest || !back) throw new Error('Expected seeded muscle groups');
    const movement = await createMovement(db, {
      name: 'Editable Movement',
      primaryMuscleGroupId: chest.id,
    });
    const collision = await createMovement(db, {
      name: 'Collision Movement',
      primaryMuscleGroupId: chest.id,
    });
    await expect(updateMovement(db, movement.id, { name: ` ${collision.name} ` })).rejects.toThrow(
      /already exists|duplicate/i,
    );

    const gym = await makeGym(db, 'Editor Gym');
    const startedAt = new Date(2026, 0, 14, 12).getTime();
    const session = await startSession(db, { gymId: gym.id, movement, startedAt });
    await logSet(db, session.entry, { loadLb: 100, recordedAt: startedAt });

    await expect(
      updateMovement(db, movement.id, { name: 'Renamed Movement' }),
    ).resolves.toMatchObject({ name: 'Renamed Movement' });
    await expect(
      updateMovement(db, movement.id, { primaryMuscleGroupId: back.id }),
    ).resolves.toMatchObject({ primaryMuscleGroupId: back.id });
    await expect(updateMovement(db, movement.id, { unit: 'lb' })).resolves.toMatchObject({
      unit: 'lb',
    });
    await expect(
      updateMovement(db, movement.id, { instructions: 'Brace and pause.' }),
    ).resolves.toMatchObject({ instructions: 'Brace and pause.' });
    const recordedSets = await setsByIsland(db, { gymId: gym.id, movementId: movement.id });
    expect(recordedSets[0]).toMatchObject({ loadLb: 100 });

    const volume = await weeklyVolumeByMuscleGroup(db, weekBounds(startedAt));
    expect(volume).toContainEqual({ muscleGroupId: back.id, countedSets: 1 });
    expect(volume).not.toContainEqual({ muscleGroupId: chest.id, countedSets: 1 });
  });
});
