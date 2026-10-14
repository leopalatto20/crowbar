import type { RoutineExercise } from "@/db/routines";
import type { I18n } from "@/lib/i18n";
import { type Effort, formatEffort, formatRange } from "@/lib/workout/model";

export type Range = [number, number];

export const WARMUP_PRESETS = [0, 1, 2, 3, 4];
export const SET_PRESETS = [1, 2, 3, 4, 5, 6];
export const REP_PRESETS: Range[] = [
  [3, 5],
  [4, 6],
  [5, 7],
  [6, 8],
  [8, 10],
  [8, 12],
  [10, 12],
  [12, 15],
  [15, 20],
  [20, 30],
];
export const RIR_PRESETS: Range[] = [
  [0, 0],
  [0, 1],
  [1, 1],
  [1, 2],
  [2, 3],
  [3, 4],
];
export const REST_PRESETS = [45, 60, 90, 120, 150, 180, 240, 300];

export function formatWarmups(warmups: number, i18n: I18n) {
  return warmups === 0 ? i18n.t.routine.noWarmup : i18n.t.routine.warmups(warmups);
}

// Targets may be blank, in a Routine saved from a Workout or a slot written back from one.
const BLANK = "–";

function formatPlannedRange(min: number | null, max: number | null) {
  return min === null || max === null ? BLANK : formatRange(min, max);
}

export function formatPlannedVolume({ sets, repMin, repMax }: RoutineExercise) {
  return `${sets ?? BLANK} × ${formatPlannedRange(repMin, repMax)}`;
}

export function formatPlannedEffort(
  { rirMin, rirMax }: RoutineExercise,
  effort: Effort,
  i18n: I18n,
) {
  return rirMin === null || rirMax === null
    ? `${i18n.t.effort[effort]} ${BLANK}`
    : formatEffort(rirMin, rirMax, effort, i18n);
}

// SwiftUI's onMove semantics: the destination is an offset in the list before the move.
export function move(ids: string[], sources: number[], destination: number) {
  const moving = sources.map((index) => ids[index]!);
  const before = ids.slice(0, destination).filter((id) => !moving.includes(id));
  const after = ids.slice(destination).filter((id) => !moving.includes(id));
  return [...before, ...moving, ...after];
}
