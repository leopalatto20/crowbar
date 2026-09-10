import type { RecordingScale } from '@/db/constants';
import type { RoutineEntryInput } from '@/db';

export type RoutineEntryTargetField =
	| 'workingSetCount'
	| 'repMin'
	| 'repMax'
	| 'proximityValue'
	| 'tempo';

export type RoutineEntryDraft = {
	movementId: number;
	workingSetCount: string;
	repMin: string;
	repMax: string;
	proximityValue: string;
	tempo: string;
};

type RemovedEntry = { entry: RoutineEntryDraft; index: number };

export type RoutineDraft = {
	name: string;
	recordingScale: RecordingScale;
	entries: RoutineEntryDraft[];
	lastRemoved: RemovedEntry | null;
};

export type RoutineDraftValidation = {
	valid: boolean;
	nameError: string | null;
	entryErrors: Record<number, string[]>;
};

export function createRoutineDraft(
	name = '',
	recordingScale: RecordingScale = 'rpe',
	entries: RoutineEntryInput[] = [],
): RoutineDraft {
	return {
		name,
		recordingScale,
		entries: entries.map(createRoutineEntryDraft),
		lastRemoved: null,
	};
}

export function createRoutineEntryDraft(input: RoutineEntryInput | number): RoutineEntryDraft {
	if (typeof input === 'number') {
		return emptyRoutineEntryDraft(input);
	}
	return {
		movementId: input.movementId,
		workingSetCount: stringValue(input.workingSetCount),
		repMin: stringValue(input.repMin),
		repMax: stringValue(input.repMax),
		proximityValue: stringValue(input.proximityValue),
		tempo: stringValue(input.tempo),
	};
}

function emptyRoutineEntryDraft(movementId: number): RoutineEntryDraft {
	return {
		movementId,
		workingSetCount: '',
		repMin: '',
		repMax: '',
		proximityValue: '',
		tempo: '',
	};
}

function stringValue(value: number | string | null | undefined): string {
	return value === null || value === undefined ? '' : String(value);
}

export function addRoutineEntry(draft: RoutineDraft, movementId: number): RoutineDraft {
	if (draft.entries.some((entry) => entry.movementId === movementId)) return draft;
	return {
		...draft,
		entries: [...draft.entries, emptyRoutineEntryDraft(movementId)],
		lastRemoved: null,
	};
}

export function updateRoutineEntryTarget(
	draft: RoutineDraft,
	movementId: number,
	field: RoutineEntryTargetField,
	value: string,
): RoutineDraft {
	return {
		...draft,
		entries: draft.entries.map((entry) =>
			entry.movementId === movementId ? { ...entry, [field]: value } : entry,
		),
	};
}

export function removeRoutineEntry(draft: RoutineDraft, movementId: number): RoutineDraft {
	const index = draft.entries.findIndex((entry) => entry.movementId === movementId);
	if (index < 0) return draft;
	return {
		...draft,
		entries: draft.entries.filter((entry) => entry.movementId !== movementId),
		lastRemoved: { entry: draft.entries[index], index },
	};
}

export function undoRoutineEntryRemoval(draft: RoutineDraft): RoutineDraft {
	if (!draft.lastRemoved || draft.entries.some((entry) => entry.movementId === draft.lastRemoved?.entry.movementId)) {
		return draft;
	}
	const entries = [...draft.entries];
	entries.splice(Math.min(draft.lastRemoved.index, entries.length), 0, draft.lastRemoved.entry);
	return { ...draft, entries, lastRemoved: null };
}

export function reorderRoutineEntry(
	draft: RoutineDraft,
	fromIndex: number,
	toIndex: number,
): RoutineDraft {
	if (
		fromIndex < 0 ||
		toIndex < 0 ||
		fromIndex >= draft.entries.length ||
		toIndex >= draft.entries.length ||
		fromIndex === toIndex
	) {
		return draft;
	}
	const entries = [...draft.entries];
	const [entry] = entries.splice(fromIndex, 1);
	entries.splice(toIndex, 0, entry);
	return { ...draft, entries };
}

export function moveRoutineEntry(
	draft: RoutineDraft,
	movementId: number,
	direction: 'up' | 'down',
): RoutineDraft {
	const index = draft.entries.findIndex((entry) => entry.movementId === movementId);
	if (index < 0) return draft;
	return reorderRoutineEntry(draft, index, direction === 'up' ? index - 1 : index + 1);
}

export function validateRoutineDraft(draft: RoutineDraft): RoutineDraftValidation {
	const nameError = draft.name.trim() ? null : 'Routine name cannot be blank.';
	const entryErrors: Record<number, string[]> = {};
	const seenMovementIds = new Set<number>();
	for (const entry of draft.entries) {
		const errors = validateRoutineEntry(entry, draft.recordingScale);
		if (seenMovementIds.has(entry.movementId)) errors.push('A Movement can only appear once in a Routine.');
		seenMovementIds.add(entry.movementId);
		if (errors.length > 0) entryErrors[entry.movementId] = errors;
	}
	return {
		valid: !nameError && draft.entries.length > 0 && Object.keys(entryErrors).length === 0,
		nameError,
		entryErrors,
	};
}

export function validateRoutineEntry(
	entry: RoutineEntryDraft,
	recordingScale: RecordingScale,
): string[] {
	const errors: string[] = [];
	if (entry.workingSetCount && !isPositiveWhole(entry.workingSetCount)) {
		errors.push('Working-set count must be a positive whole number.');
	}
	const hasRepMin = Boolean(entry.repMin);
	const hasRepMax = Boolean(entry.repMax);
	if (hasRepMin !== hasRepMax) {
		errors.push('Enter both a minimum and maximum rep target.');
	} else if (hasRepMin && (!isPositiveWhole(entry.repMin) || !isPositiveWhole(entry.repMax))) {
		errors.push('Rep targets must be positive whole numbers.');
	} else if (hasRepMin && Number(entry.repMin) > Number(entry.repMax)) {
		errors.push('Rep minimum cannot exceed rep maximum.');
	}
	if (entry.proximityValue) {
		const value = Number(entry.proximityValue);
		const minimum = recordingScale === 'rir' ? 0 : 1;
		if (!Number.isFinite(value) || value < minimum || value > 10) {
			errors.push(`${recordingScale.toUpperCase()} target must be between ${minimum} and 10.`);
		}
	}
	if (entry.tempo && !/^\d+-\d+-\d+-\d+$/.test(entry.tempo.trim())) {
		errors.push('Tempo must use four-part notation, for example 3-1-1-0.');
	}
	return errors;
}

function isPositiveWhole(value: string): boolean {
	const number = Number(value);
	return /^\d+$/.test(value.trim()) && Number.isInteger(number) && number > 0;
}

export function routineDraftToInput(draft: RoutineDraft): {
	name: string;
	entries: RoutineEntryInput[];
} {
	return {
		name: draft.name,
		entries: draft.entries.map((entry) => ({
			movementId: entry.movementId,
			workingSetCount: numberOrNull(entry.workingSetCount),
			repMin: numberOrNull(entry.repMin),
			repMax: numberOrNull(entry.repMax),
			proximityValue: numberOrNull(entry.proximityValue),
			proximityScale: entry.proximityValue.trim() ? draft.recordingScale : null,
			tempo: entry.tempo.trim() || null,
		})),
	};
}

function numberOrNull(value: string): number | null {
	return value.trim() ? Number(value) : null;
}
