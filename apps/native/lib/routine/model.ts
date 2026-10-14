import type { LastRun } from "@/db/routines";
import type { I18n } from "@/lib/i18n";
import {
  type Effort,
  type Target,
  formatClock,
  formatEffort,
  formatRange,
} from "@/lib/workout/model";

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

export function formatPlannedRest(seconds: number | null) {
  return seconds === null ? BLANK : formatClock(seconds);
}

export function formatPlannedVolume({ sets, repMin, repMax }: Target) {
  return `${sets ?? BLANK} × ${formatPlannedRange(repMin, repMax)}`;
}

export function formatPlannedEffort({ rirMin, rirMax }: Target, effort: Effort, i18n: I18n) {
  return rirMin === null || rirMax === null
    ? `${i18n.t.effort[effort]} ${BLANK}`
    : formatEffort(rirMin, rirMax, effort, i18n);
}

// The Ledger's guide line names only what was planned, where the editor shows every blank.
export function formatTarget(target: Target, effort: Effort, i18n: I18n) {
  const { sets, repMin, rirMin, rirMax, restSeconds } = target;
  const parts = [];
  if (sets !== null || repMin !== null) parts.push(formatPlannedVolume(target));
  if (rirMin !== null && rirMax !== null) parts.push(formatEffort(rirMin, rirMax, effort, i18n));
  if (restSeconds !== null) parts.push(i18n.t.ledger.targetRest(formatClock(restSeconds)));
  return i18n.t.ledger.target(parts.join(" · "));
}

export type Age = { unit: "day" | "week" | "month" | "year"; count: number };

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(epochMs: number) {
  const date = new Date(epochMs);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

// Calendar days in the device's zone, so last night's Workout reads "yesterday" this morning.
// Rounding absorbs the 23- and 25-hour days around a daylight saving change.
export function ageOf(epochMs: number, now: number): Age {
  const days = Math.max(0, Math.round((startOfDay(now) - startOfDay(epochMs)) / DAY_MS));
  if (days < 7) return { unit: "day", count: days };
  if (days < 30) return { unit: "week", count: Math.floor(days / 7) };
  if (days < 365) return { unit: "month", count: Math.floor(days / 30) };
  return { unit: "year", count: Math.floor(days / 365) };
}

export function formatLastRun({ startedAt, gymName }: LastRun, i18n: I18n) {
  const { workoutTab } = i18n.t;
  return workoutTab.lastRun(workoutTab.ago(ageOf(startedAt, Date.now())), gymName);
}

// SwiftUI's onMove semantics: the destination is an offset in the list before the move.
export function move(ids: string[], sources: number[], destination: number) {
  const moving = sources.map((index) => ids[index]!);
  const before = ids.slice(0, destination).filter((id) => !moving.includes(id));
  const after = ids.slice(destination).filter((id) => !moving.includes(id));
  return [...before, ...moving, ...after];
}
