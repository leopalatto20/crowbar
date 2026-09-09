/**
 * Closed set of Recorded + default identities shared by the app and migrations.
 * Keeping these as plain data lets the seeds and the repository agree without
 * coupling the schema to a runtime module.
 */

/** Closed set of Equipment classes (ADR 0001, glossary). */
export const EQUIPMENT_CLASSES = [
	'barbell',
	'dumbbell',
	'machine',
	'cable',
	'smith',
	'bodyweight',
	'other',
];

/** The single, app-wide Recording scale ('rir' | 'rpe'). */
export const RECORDING_SCALES = ['rir', 'rpe'];

/** Load display units ('kg' | 'lb'). Loads are always stored canonically in lb. */
export const UNITS = ['kg', 'lb'];

/** Closed canonical set of primary Muscle groups (glossary). */
export const MUSCLE_GROUPS = [
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
];

/** Uniform default weekly Volume landmark (counted sets) per muscle group. */
export const DEFAULT_VOLUME_MIN = 4;
export const DEFAULT_VOLUME_MAX = 8;

export const DEFAULT_RECORDING_SCALE = 'rpe';
export const DEFAULT_UNIT = 'kg';

/** Closed-set type aliases (glossary) so the type system enforces the sets. */
export type EquipmentClass = (typeof EQUIPMENT_CLASSES)[number];
export type RecordingScale = (typeof RECORDING_SCALES)[number];
export type Unit = (typeof UNITS)[number];
export type MuscleGroupName = (typeof MUSCLE_GROUPS)[number];