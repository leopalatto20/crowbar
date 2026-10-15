import { and, asc, desc, eq, isNull, max, sql } from "drizzle-orm";

import type { Language } from "@/lib/i18n/locale";
import type { LoadType } from "@/lib/exercise/model";
import { type LoadFormat, type Performance, type Unit, readLoad } from "@/lib/workout/model";

import type { Database } from "./database";
import { lastUsedGym } from "./gyms";
import { exercise, gym, station, workout, workoutExercise, workoutSet } from "./schema";

export type ProgressStation = {
  id: string;
  gymName: string;
  // Null while it's the Gym's only Station for the Exercise.
  label: string | null;
  retired: boolean;
};

export type HistorySet = Performance & {
  // Among the Workout's Working sets at the Station, as the Ledger numbers them.
  number: number;
  // Ahead of the set with the same number in the previous Workout listed.
  beat: boolean;
};

export type StationWorkout = {
  id: string;
  startedAt: number;
  timeZone: string;
  sets: HistorySet[];
};

export type RepRecords = {
  // Heaviest load first.
  mostRepsByLoad: { load: number; reps: number }[];
  // Fewest reps first.
  heaviestByReps: { reps: number; load: number }[];
};

// Volume needs a real weight, and a Bodyweight or Assisted load leaves the lifter's own weight out.
export type ChartMeasure = "volume" | "levelReps" | "reps";

export type ProgressChart = {
  measure: ChartMeasure;
  // Oldest first, one per Workout listed in the set history.
  points: { workoutId: string; startedAt: number; timeZone: string; value: number; sets: number }[];
};

// Where Exercise detail opens: the Station asked for, else the one last used at the Gym.
export type ProgressOpening = { stationId?: string; gymId?: string };

export type ExerciseProgress = {
  name: string;
  // Every Station of the Exercise, at every Gym, Retired ones included.
  stations: ProgressStation[];
  // Null until the Exercise has a Station anywhere.
  selected: {
    station: ProgressStation;
    format: LoadFormat;
    // Newest first; only Workouts with a Working set logged at the Station.
    workouts: StationWorkout[];
    repRecords: RepRecords;
    chart: ProgressChart;
  } | null;
};

// Progress is read per Station only (ADR 0001). With no Station asked for, it opens on the one last
// used at `gymId`, else at the Gym of the Workout in progress or the last-used Gym.
export function getExerciseProgress(
  db: Database,
  exerciseId: string,
  language: Language,
  { stationId, gymId }: ProgressOpening = {},
): ExerciseProgress | undefined {
  const movement = db
    .select({
      name: exercise.name,
      nameEs: exercise.nameEs,
      loadType: exercise.loadType,
      unilateral: exercise.unilateral,
    })
    .from(exercise)
    .where(eq(exercise.id, exerciseId))
    .get();
  if (!movement) return undefined;

  const stations = db
    .select({
      option: { id: station.id, gymName: gym.name, label: station.label, retired: station.retired },
      unit: station.unit,
    })
    .from(station)
    .innerJoin(gym, eq(gym.id, station.gymId))
    .where(eq(station.exerciseId, exerciseId))
    .orderBy(
      asc(sql`${gym.name} collate nocase`),
      asc(sql`${station.label} collate nocase`),
      asc(station.id),
    )
    .all();
  const selectedId =
    stations.find(({ option }) => option.id === stationId)?.option.id ??
    defaultStation(db, exerciseId, gymId ?? currentGym(db));
  const chosen = stations.find(({ option }) => option.id === selectedId);
  const workouts = chosen ? stationWorkouts(db, chosen.option.id, movement.loadType) : [];

  return {
    name: language === "es" ? (movement.nameEs ?? movement.name) : movement.name,
    stations: stations.map(({ option }) => option),
    selected: chosen
      ? {
          station: chosen.option,
          format: {
            unit: chosen.unit,
            loadType: movement.loadType,
            unilateral: movement.unilateral,
          },
          workouts,
          repRecords: repRecords(workouts, movement.loadType),
          chart: progressChart(workouts, chartMeasure(movement.loadType, chosen.unit)),
        }
      : null,
  };
}

function currentGym(db: Database) {
  const inProgress = db
    .select({ gymId: workout.gymId })
    .from(workout)
    .where(isNull(workout.finishedAt))
    .get();
  return inProgress?.gymId ?? lastUsedGym(db)?.id;
}

// Another Gym's Station still beats an empty screen, and a Retired one is a last resort.
function defaultStation(db: Database, exerciseId: string, gymId: string | undefined) {
  return db
    .select({ id: station.id })
    .from(station)
    .leftJoin(workoutExercise, eq(workoutExercise.stationId, station.id))
    .leftJoin(workout, eq(workout.id, workoutExercise.workoutId))
    .where(eq(station.exerciseId, exerciseId))
    .groupBy(station.id)
    .orderBy(
      desc(sql`${station.gymId} = ${gymId ?? null}`),
      asc(station.retired),
      desc(max(workout.startedAt)),
      desc(station.id),
    )
    .limit(1)
    .get()?.id;
}

// Numbered over every Working set, confirmed or not, as the Ledger numbers them; only confirmed
// ones are listed. So mid-Workout, a set confirmed ahead of an earlier one keeps its number.
function stationWorkouts(db: Database, stationId: string, loadType: LoadType): StationWorkout[] {
  const sets = db
    .select({
      workoutId: workout.id,
      startedAt: workout.startedAt,
      timeZone: workout.timeZone,
      load: workoutSet.load,
      reps: workoutSet.reps,
      rir: workoutSet.rir,
      done: workoutSet.done,
    })
    .from(workoutSet)
    .innerJoin(workoutExercise, eq(workoutExercise.id, workoutSet.workoutExerciseId))
    .innerJoin(workout, eq(workout.id, workoutExercise.workoutId))
    .where(and(eq(workoutExercise.stationId, stationId), eq(workoutSet.kind, "working")))
    .orderBy(
      desc(workout.startedAt),
      desc(workout.id),
      asc(workoutExercise.position),
      asc(workoutSet.position),
    )
    .all();

  const workouts: StationWorkout[] = [];
  let current: StationWorkout | undefined;
  let number = 0;
  for (const { workoutId, startedAt, timeZone, load, reps, rir, done } of sets) {
    if (current?.id !== workoutId) {
      current = { id: workoutId, startedAt, timeZone, sets: [] };
      workouts.push(current);
      number = 0;
    }
    number += 1;
    // The set_logged check guarantees a confirmed set has its load and reps.
    if (done) current.sets.push({ number, load: load!, reps: reps!, rir, beat: false });
  }
  const listed = workouts.filter((stationWorkout) => stationWorkout.sets.length > 0);
  listed.forEach(({ sets: latest }, index) => {
    const previous = listed[index + 1]?.sets ?? [];
    for (const set of latest) {
      const match = previous.find((earlier) => earlier.number === set.number);
      set.beat = match !== undefined && beats(set, match, loadType);
    }
  });
  return listed;
}

// Load decides first, then reps, then effort, so more load counts even on fewer reps, and the same
// load and reps beat last time only at a higher RIR. Higher load is better for every Load type.
function beats(set: Performance, previous: Performance, loadType: LoadType) {
  const load = readLoad(set.load, loadType);
  const previousLoad = readLoad(previous.load, loadType);
  if (load !== previousLoad) return load > previousLoad;
  if (set.reps !== previous.reps) return set.reps > previous.reps;
  return set.rir !== null && previous.rir !== null && set.rir > previous.rir;
}

// Derived from the sets on every read, so an edit or delete anywhere in history shows at once.
function repRecords(workouts: StationWorkout[], loadType: LoadType): RepRecords {
  const mostReps = new Map<number, number>();
  const heaviest = new Map<number, number>();
  for (const { load, reps } of workouts.flatMap((stationWorkout) => stationWorkout.sets)) {
    mostReps.set(load, Math.max(reps, mostReps.get(load) ?? reps));
    const best = heaviest.get(reps);
    if (best === undefined || readLoad(load, loadType) > readLoad(best, loadType)) {
      heaviest.set(reps, load);
    }
  }
  return {
    mostRepsByLoad: [...mostReps]
      .map(([load, reps]) => ({ load, reps }))
      .sort((a, b) => readLoad(b.load, loadType) - readLoad(a.load, loadType)),
    heaviestByReps: [...heaviest]
      .map(([reps, load]) => ({ reps, load }))
      .sort((a, b) => a.reps - b.reps),
  };
}

function chartMeasure(loadType: LoadType, unit: Unit): ChartMeasure {
  if (loadType !== "external") return "reps";
  return unit === "level" ? "levelReps" : "volume";
}

// Unilateral reps count per side and aren't doubled, so Volume compares only within the Station.
function progressChart(workouts: StationWorkout[], measure: ChartMeasure): ProgressChart {
  return {
    measure,
    points: [...workouts].reverse().map(({ id, startedAt, timeZone, sets }) => ({
      workoutId: id,
      startedAt,
      timeZone,
      value: sets.reduce(
        (sum, { load, reps }) => sum + (measure === "reps" ? reps : load * reps),
        0,
      ),
      sets: sets.length,
    })),
  };
}
