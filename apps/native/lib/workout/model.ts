import type { LoadType } from "@/lib/exercise/model";
import type { I18n } from "@/lib/i18n";
// Relative: db/schema.ts imports this file, and drizzle-kit loads it without path aliases.
import { parseDecimal } from "../i18n/locale";

export const EFFORTS = ["RIR", "RPE"] as const;
export type Effort = (typeof EFFORTS)[number];
export const UNITS = ["kg", "lb", "level"] as const;
export type Unit = (typeof UNITS)[number];
export const SET_KINDS = ["warmup", "working"] as const;
export type SetKind = (typeof SET_KINDS)[number];
export const WORKOUT_EDIT_KINDS = ["swap", "add", "remove", "move"] as const;
export type Field = "load" | "reps" | "rir";
export type Performance = { load: number; reps: number; rir: number | null };
export type Target = {
  sets: number | null;
  repMin: number | null;
  repMax: number | null;
  rirMin: number | null;
  rirMax: number | null;
  restSeconds: number | null;
};

// RPE = 10 - RIR, so the stored value is always RIR and only the display flips.
export function toEffortDisplay(rir: number | null, effort: Effort) {
  if (rir === null) return null;
  return effort === "RIR" ? rir : 10 - rir;
}

export function fromEffortDisplay(value: number | null, effort: Effort) {
  if (value === null) return null;
  const rir = effort === "RIR" ? value : 10 - value;
  return Math.max(0, Math.min(10, rir));
}

export function formatRange(min: number, max: number) {
  return min === max ? `${min}` : `${min}–${max}`;
}

// RPE runs opposite to RIR, so the low end of the displayed range comes from the other bound.
export function formatEffortRange(rirMin: number, rirMax: number, effort: Effort) {
  const low = toEffortDisplay(effort === "RIR" ? rirMin : rirMax, effort) ?? 0;
  const high = toEffortDisplay(effort === "RIR" ? rirMax : rirMin, effort) ?? 0;
  return formatRange(low, high);
}

export function formatEffort(rirMin: number, rirMax: number, effort: Effort, i18n: I18n) {
  return `${i18n.t.effort[effort]} ${formatEffortRange(rirMin, rirMax, effort)}`;
}

// What a typed value stores as, or undefined when it can't be stored. Reps and effort are whole
// numbers; effort is typed in the lifter's scale but stored as RIR.
export function parseSetValue(field: Field, text: string, effort: Effort) {
  const value = parseDecimal(text.trim());
  if (value === null) return null;
  if (Number.isNaN(value) || value < 0) return undefined;
  if (field === "load") return value;
  if (!Number.isInteger(value)) return undefined;
  return field === "rir" ? fromEffortDisplay(value, effort) : value;
}

// Assistance is logged as a positive number but counted as negative load, so for every Load
// type a higher reading is better.
export function readLoad(load: number, loadType: LoadType) {
  return loadType === "assisted" ? -load : load;
}

// How a Station's loads read: the Exercise's Load type and unilateral flag, in the Station's unit.
export type LoadFormat = { unit: Unit; loadType: LoadType; unilateral: boolean };

function formatLoad(
  load: number,
  { unit, loadType }: LoadFormat,
  i18n: Pick<I18n, "t" | "formatDecimal">,
) {
  const amount = i18n.formatDecimal(Math.abs(load));
  const shown = unit === "level" ? i18n.t.stackLevel(amount) : amount;
  if (loadType === "external") return shown;
  const reading = readLoad(load, loadType);
  if (reading === 0) return i18n.t.load.bodyweight;
  return `${i18n.t.load.bodyweight} ${reading > 0 ? "+" : "−"}${shown}`;
}

export function formatPerformance(
  performance: Performance,
  format: LoadFormat,
  effort: Effort,
  i18n: Pick<I18n, "t" | "formatDecimal">,
) {
  const reps = format.unilateral ? i18n.t.load.perSide(performance.reps) : performance.reps;
  const loadByReps = `${formatLoad(performance.load, format, i18n)} × ${reps}`;
  const shown = toEffortDisplay(performance.rir, effort);
  return shown === null ? loadByReps : `${loadByReps} @${shown}`;
}

// An empty Workout has no Routine name; one from an unnamed Routine shows the placeholder name.
export function workoutTitle(routineName: string | null, { t }: I18n) {
  if (routineName === null) return t.ledger.title;
  return routineName || t.routine.untitled;
}

export function formatClock(totalSeconds: number) {
  const s = Math.max(0, Math.ceil(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// Floors where formatClock rounds up: a countdown shows the second still running, elapsed time
// only the ones already done.
export function formatElapsed(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = String(s % 60).padStart(2, "0");
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${seconds}`
    : `${minutes}:${seconds}`;
}

export function workingIndex(sets: { kind: SetKind }[], index: number) {
  return sets.slice(0, index + 1).filter((s) => s.kind === "working").length;
}
