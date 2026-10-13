export type Effort = "RIR" | "RPE";
export type Unit = "kg" | "lb" | "level";
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

export function unitLabel(unit: Unit) {
  return unit === "level" ? "lvl" : unit;
}

export function formatNumber(value: number | null) {
  if (value === null) return "–";
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
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

export function formatTarget(target: Target, effort: Effort) {
  const reps =
    target.repMin === target.repMax ? `${target.repMin}` : `${target.repMin}–${target.repMax}`;
  const low = toEffortDisplay(effort === "RIR" ? target.rirMin : target.rirMax, effort);
  const high = toEffortDisplay(effort === "RIR" ? target.rirMax : target.rirMin, effort);
  const effortRange = low === high ? `${low}` : `${low}–${high}`;
  return `${target.sets} × ${reps} · ${effort} ${effortRange}`;
}

export function formatPerformance(p: Performance | null, unit: Unit, effort: Effort) {
  if (!p) return "–";
  const load = unit === "level" ? `L${formatNumber(p.weight)}` : formatNumber(p.weight);
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
