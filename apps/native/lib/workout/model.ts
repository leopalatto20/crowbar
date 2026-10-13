import type { I18n } from "@/lib/i18n";

export const EFFORTS = ["RIR", "RPE"] as const;
export type Effort = (typeof EFFORTS)[number];
export const UNITS = ["kg", "lb", "level"] as const;
export type Unit = (typeof UNITS)[number];
export type SetKind = "warmup" | "working";
export type Field = "weight" | "reps" | "rir";

export type Performance = { weight: number; reps: number; rir: number | null };

export type LoggedSet = {
  id: string;
  kind: SetKind;
  weight: number | null;
  reps: number | null;
  rir: number | null;
  done: boolean;
  previous: Performance | null;
};

export type Target = {
  sets: number;
  repMin: number;
  repMax: number;
  rirMin: number;
  rirMax: number;
};

export type WorkoutExercise = {
  id: string;
  name: string;
  shortName: string;
  stationLabel: string | null;
  unit: Unit;
  notes: string | null;
  target: Target;
  restSeconds: number;
  sets: LoggedSet[];
};

let nextId = 0;
export function makeSetId() {
  nextId += 1;
  return `set-${nextId}`;
}

export function effective(set: LoggedSet, field: Field): number | null {
  return set[field] ?? set.previous?.[field] ?? null;
}

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

export function formatVolume(target: Pick<Target, "sets" | "repMin" | "repMax">) {
  return `${target.sets} × ${formatRange(target.repMin, target.repMax)}`;
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

export function formatTarget(target: Target, restSeconds: number, effort: Effort, i18n: I18n) {
  return i18n.t.ledger.target(
    formatVolume(target),
    formatEffort(target.rirMin, target.rirMax, effort, i18n),
    formatClock(restSeconds),
  );
}

export function formatPerformance(p: Performance | null, unit: Unit, effort: Effort, i18n: I18n) {
  if (!p) return "–";
  const weight = i18n.formatDecimal(p.weight);
  const load = unit === "level" ? i18n.t.stackLevel(weight) : weight;
  const e = toEffortDisplay(p.rir, effort);
  return e === null ? `${load} × ${p.reps}` : `${load} × ${p.reps} @${e}`;
}

export function formatClock(totalSeconds: number) {
  const s = Math.max(0, Math.ceil(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function workingIndex(sets: LoggedSet[], index: number) {
  return sets.slice(0, index + 1).filter((s) => s.kind === "working").length;
}
