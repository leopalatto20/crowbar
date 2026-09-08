import { and, count, desc, eq, gte, lt } from 'drizzle-orm';

import { EQUIPMENT_CLASSES, MUSCLE_GROUPS, type EquipmentClass, type RecordingScale, type Unit } from './constants';
import {
	gyms,
	movements,
	muscleGroups,
	sessionEntries,
	sets,
	subRoutineEntries,
	subRoutines,
	sessions,
} from './schema';
import type { DB } from './get-db';

/** Equipment class and Recording scale are closed sets — invalid values are bugs. */
function assertIn(value: string, set: readonly string[], label: string): void {
	if (!set.includes(value)) {
		throw new Error(`Invalid ${label}: \`${value}\`. Expected one of: ${set.join(', ')}`);
	}
}
const equipmentIn = (v: string) => assertIn(v, EQUIPMENT_CLASSES, 'equipment class');

/**
 * Thin repository over the shared connection. Everything here is behavior only —
 * the shape mirrors the domain glossary (Gym, Movement, Routine, Sub-routine,
 * Session, Exercise, Set, Volume landmark). Loads are always handled in pounds
 * (ADR 0004).
 */

const NOW = Date.now;
const intFlag = (v: boolean): 0 | 1 => (v ? 1 : 0);
const DAY_MS = 86_400_000;

/* -------------------------------- Gyms -------------------------------- */

export async function createGym(
	db: DB,
	{ name, isHome = false }: { name: string; isHome?: boolean },
) {
	return (await db.insert(gyms).values({ name, isHome: intFlag(isHome) }).returning())[0];
}

export async function getHomeGym(db: DB) {
	return (await db.select().from(gyms).where(eq(gyms.isHome, 1)).limit(1))[0];
}

export async function listGyms(db: DB, { includeArchived = false } = {}) {
	if (includeArchived) {
		return db.select().from(gyms).orderBy(gyms.name);
	}
	return db
		.select()
		.from(gyms)
		.where(eq(gyms.archived, 0))
		.orderBy(gyms.name);
}

/* ------------------------------ Movements ------------------------------ */

export type NewMovement = {
	name: string;
	primaryMuscleGroupId: number;
	unit: Unit;
	instructions?: string | null;
};

export async function createMovement(db: DB, movement: NewMovement) {
	return (await db.insert(movements).values(movement).returning())[0];
}

export async function listMuscleGroups(db: DB) {
	const groups = await db.select().from(muscleGroups);
	const order = new Map(MUSCLE_GROUPS.map((name, index) => [name, index]));
	return groups.sort((a, b) => (order.get(a.name) ?? Infinity) - (order.get(b.name) ?? Infinity));
}

/* --------------------------- Sessions & sets --------------------------- */

export async function startSession(
	db: DB,
	{ gymId, subRoutineId, startedAt = NOW() }: { gymId: number; subRoutineId?: number; startedAt?: number },
) {
	return (
		await db
			.insert(sessions)
			.values({ gymId, subRoutineId, startedAt })
			.returning()
	)[0];
}

export async function endSession(
	db: DB,
	{ sessionId, endedAt = NOW() }: { sessionId: number; endedAt?: number },
) {
	await db.update(sessions).set({ endedAt }).where(eq(sessions.id, sessionId));
}

export async function appendSessionEntry(
	db: DB,
	{
		sessionId,
		position,
		movementId,
		equipmentClass,
		skipped = false,
	}: {
		sessionId: number;
		position: number;
		movementId: number;
		equipmentClass: EquipmentClass;
		skipped?: boolean;
	},
) {
	equipmentIn(equipmentClass);
	return (
		await db
			.insert(sessionEntries)
			.values({ sessionId, position, movementId, equipmentClass, skipped: intFlag(skipped) })
			.returning()
	)[0];
}

export type NewSet = {
	loadLb: number;
	reps: number;
	equipmentClass: EquipmentClass;
	proximity?: { scale: RecordingScale; value: number } | null;
	recordedAt?: number;
};

export async function logSet(db: DB, sessionEntryId: number, set: NewSet) {
	equipmentIn(set.equipmentClass);
	return (
		await db.insert(sets).values({
			sessionEntryId,
			loadLb: set.loadLb,
			reps: set.reps,
			equipmentClass: set.equipmentClass,
			proximityValue: set.proximity?.value,
			proximityScale: set.proximity?.scale,
			recordedAt: set.recordedAt ?? NOW(),
		}).returning()
	)[0];
}

/* ------------------------------ Sub-routines --------------------------- */

/**
 * The recorded binding Routine × Gym → Movement × Equipment class. Returns null
 * when no sub-routine has been created for that pair yet. Entries are ordered by
 * their routine position.
 */
export async function getSubRoutine(
	db: DB,
	{ routineId, gymId }: { routineId: number; gymId: number },
) {
	const sr = (
		await db
			.select()
			.from(subRoutines)
			.where(and(eq(subRoutines.routineId, routineId), eq(subRoutines.gymId, gymId)))
			.limit(1)
	)[0];
	if (!sr) {
		return null;
	}
	const entries = await db
		.select()
		.from(subRoutineEntries)
		.where(eq(subRoutineEntries.subRoutineId, sr.id))
		.orderBy(subRoutineEntries.position);
	return { ...sr, entries };
}

/**
 * Bind a movement to an Equipment class for a Routine × Gym, creating the
 * sub-routine on first use and upserting the positional entry.
 */
export async function setSubRoutineClass(
	db: DB,
	{
		routineId,
		gymId,
		movementId,
		equipmentClass,
		position,
	}: {
		routineId: number;
		gymId: number;
		movementId: number;
		equipmentClass: EquipmentClass;
		position: number;
	},
) {
	equipmentIn(equipmentClass);
	let sr = await getSubRoutine(db, { routineId, gymId });
	if (!sr) {
		const row = (
			await db.insert(subRoutines).values({ routineId, gymId }).returning()
		)[0];
		sr = { ...row, entries: [] };
	}
	const existing = (
		await db
			.select()
			.from(subRoutineEntries)
			.where(
				and(
					eq(subRoutineEntries.subRoutineId, sr.id),
					eq(subRoutineEntries.movementId, movementId),
				),
			)
			.limit(1)
	)[0];
	if (existing) {
		const updated = (
			await db
				.update(subRoutineEntries)
				.set({ equipmentClass, position })
				.where(eq(subRoutineEntries.id, existing.id))
				.returning()
		)[0];
		return updated;
	}
	return (
		await db
			.insert(subRoutineEntries)
			.values({ subRoutineId: sr.id, position, movementId, equipmentClass })
			.returning()
	)[0];
}

/* ------------------------- Progress islands (Exercise × Gym) ---------- */

/**
 * sets recorded at a movement in a gym — the island (Exercise = Movement × Class,
 * inside a Gym). Pass `equipmentClass` to scope to one island, honoring the
 * differentiator: same gym but different equipment, or the same exercise in a
 * different gym, stay separate islands (ADR 0001). Omit it to read the whole
 * movement's history across equipment.
 */
export async function setsByIsland(
	db: DB,
	{ gymId, movementId, equipmentClass }: { gymId: number; movementId: number; equipmentClass?: EquipmentClass },
	{ recordedAfter = 0 } = {},
) {
	const conditions = [
		eq(sessions.gymId, gymId),
		eq(sessionEntries.movementId, movementId),
		gte(sets.recordedAt, recordedAfter),
	];
	if (equipmentClass) {
		conditions.push(eq(sets.equipmentClass, equipmentClass));
	}
	return db
		.select({
			id: sets.id,
			loadLb: sets.loadLb,
			reps: sets.reps,
			equipmentClass: sets.equipmentClass,
			proximityValue: sets.proximityValue,
			proximityScale: sets.proximityScale,
			recordedAt: sets.recordedAt,
			gymId: sessions.gymId,
		})
		.from(sets)
		.innerJoin(sessionEntries, eq(sessionEntries.id, sets.sessionEntryId))
		.innerJoin(sessions, eq(sessions.id, sessionEntries.sessionId))
		.where(and(...conditions))
		.orderBy(desc(sets.recordedAt));
}

/* ------------------------------- Volume -------------------------------- */

/**
 * Calendar week bounds (Mon 00:00 → next Mon 00:00), matching the volume
 * landmark's week.
 */
export function weekBounds(at: number = NOW()) {
	const d = new Date(at);
	const day = (d.getDay() + 6) % 7; // Mon=0 … Sun=6
	d.setHours(0, 0, 0, 0);
	const start = d.getTime() - day * DAY_MS;
	return { start, end: start + 7 * DAY_MS };
}

/**
 * Weekly counted sets per muscle group over a calendar week, global across gyms
 * and islands. Only **direct** sets count: each set contributes to its movement's
 * primary muscle group, never to secondary work.
 */
export async function weeklyVolumeByMuscleGroup(
	db: DB,
	{ start, end }: { start: number; end: number },
) {
	return db
		.select({
			muscleGroupId: movements.primaryMuscleGroupId,
			countedSets: count(),
		})
		.from(sets)
		.innerJoin(sessionEntries, eq(sessionEntries.id, sets.sessionEntryId))
		.innerJoin(movements, eq(movements.id, sessionEntries.movementId))
		.where(
			and(
				eq(sessionEntries.skipped, 0),
				gte(sets.recordedAt, start),
				lt(sets.recordedAt, end),
			),
		)
		.groupBy(movements.primaryMuscleGroupId);
}