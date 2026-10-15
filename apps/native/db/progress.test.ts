import { describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";

import type { SetKind } from "@/lib/workout/model";

import type { BuiltInExercise } from "./built-in-exercises";
import type { Database } from "./database";
import { seedBuiltInExercises } from "./exercises";
import { createGym } from "./gyms";
import { station } from "./schema";
import { getExerciseProgress } from "./progress";
import { seedSettings, updateSettings } from "./settings";
import { createTestDatabase } from "./test-database";
import {
  addSet,
  addStation,
  addWorkoutExercise,
  confirmSet,
  deleteSet,
  finishWorkout,
  getLedger,
  logPastWorkout,
  startWorkout,
  switchStation,
  toggleSetKind,
  updateSet,
} from "./workouts";

const benchPress: BuiltInExercise = {
  id: "barbell-bench-press",
  name: { en: "Barbell Bench Press", es: "Press de banca con barra" },
  equipmentType: "barbell",
  loadType: "external",
  unilateral: false,
  muscleGroup: "chest",
};

const pullUp: BuiltInExercise = {
  id: "pull-up",
  name: { en: "Pull-Up", es: "Dominada" },
  equipmentType: "bodyweight",
  loadType: "bodyweight",
  unilateral: false,
  muscleGroup: "lats",
};

const assistedPullUp: BuiltInExercise = {
  id: "assisted-pull-up",
  name: { en: "Assisted Pull-Up", es: "Dominada asistida" },
  equipmentType: "machine",
  loadType: "assisted",
  unilateral: false,
  muscleGroup: "lats",
};

const chestPress: BuiltInExercise = {
  id: "machine-chest-press",
  name: { en: "Machine Chest Press", es: "Press de pecho en máquina" },
  equipmentType: "machine",
  loadType: "external",
  unilateral: false,
  muscleGroup: "chest",
};

const splitSquat: BuiltInExercise = {
  id: "dumbbell-bulgarian-split-squat",
  name: { en: "Dumbbell Bulgarian Split Squat", es: "Sentadilla búlgara con mancuernas" },
  equipmentType: "dumbbell",
  loadType: "external",
  unilateral: true,
  muscleGroup: "quads",
};

const TIME_ZONE = "America/Mexico_City";

type LoggedSet = { kind?: SetKind; load: number; reps: number; rir?: number };

async function libraryDatabase() {
  const db = await createTestDatabase();
  seedSettings(db, "MX");
  seedBuiltInExercises(db, [benchPress, pullUp, assistedPullUp, chestPress, splitSquat]);
  return { db, gymId: createGym(db, "Downtown Iron") };
}

// Logs the sets in order on the Exercise's default Station at the Gym, then finishes.
function logWorkout(
  db: Database,
  {
    gymId,
    exerciseId,
    at,
    sets,
  }: { gymId: string; exerciseId: string; at: number; sets: LoggedSet[] },
) {
  const workoutId = startWorkout(db, { gymId, timeZone: TIME_ZONE, now: at });
  const entryId = addWorkoutExercise(db, workoutId, exerciseId);
  sets.forEach(({ kind = "working", load, reps, rir }, index) => {
    if (index > 0) addSet(db, entryId);
    const set = getLedger(db, workoutId, "en")!.exercises[0]!.sets[index]!;
    if (set.kind !== kind) toggleSetKind(db, set.id);
    confirmSet(db, set.id, { load, reps, rir: rir ?? null });
  });
  finishWorkout(db, workoutId, { now: at + 1 });
  return workoutId;
}

function progress(db: Database, exerciseId: string, at?: { stationId?: string; gymId?: string }) {
  const found = getExerciseProgress(db, exerciseId, "en", at);
  if (!found) throw new Error(`Exercise ${exerciseId} is gone`);
  return found;
}

describe("set history", () => {
  test("lists each Workout's Working sets, newest first, numbered among Working sets", async () => {
    const { db, gymId } = await libraryDatabase();
    const first = logWorkout(db, {
      gymId,
      exerciseId: benchPress.id,
      at: 1_000,
      sets: [{ load: 100, reps: 5, rir: 2 }],
    });
    const second = logWorkout(db, {
      gymId,
      exerciseId: benchPress.id,
      at: 2_000,
      sets: [
        { kind: "warmup", load: 60, reps: 10 },
        { load: 100, reps: 5, rir: 2 },
        { load: 95, reps: 6, rir: 1 },
      ],
    });

    const { selected } = progress(db, benchPress.id);
    expect(selected?.workouts.map((found) => found.id)).toEqual([second, first]);
    expect(selected?.workouts[0]).toMatchObject({ startedAt: 2_000, timeZone: TIME_ZONE });
    expect(
      selected?.workouts[0]?.sets.map(({ number, load, reps, rir }) => ({
        number,
        load,
        reps,
        rir,
      })),
    ).toEqual([
      { number: 1, load: 100, reps: 5, rir: 2 },
      { number: 2, load: 95, reps: 6, rir: 1 },
    ]);
  });
});

describe("set history across slots", () => {
  test("two slots on one Station number on as one Workout, and unconfirmed sets never show", async () => {
    const { db, gymId } = await libraryDatabase();
    const workoutId = startWorkout(db, { gymId, timeZone: TIME_ZONE, now: 1_000 });
    addWorkoutExercise(db, workoutId, benchPress.id);
    addWorkoutExercise(db, workoutId, benchPress.id);
    const [early, late] = getLedger(db, workoutId, "en")!.exercises;
    confirmSet(db, early!.sets[0]!.id, { load: 100, reps: 5 });
    addSet(db, late!.id);
    confirmSet(db, getLedger(db, workoutId, "en")!.exercises[1]!.sets[0]!.id, {
      load: 80,
      reps: 10,
    });

    // Read mid-Workout: the Workout in progress shows what's confirmed so far.
    expect(
      progress(db, benchPress.id).selected?.workouts.map((w) =>
        w.sets.map(({ number, load }) => ({ number, load })),
      ),
    ).toEqual([
      [
        { number: 1, load: 100 },
        { number: 2, load: 80 },
      ],
    ]);
  });
});

describe("set history mid-Workout", () => {
  test("a set confirmed ahead of an earlier one keeps the Ledger's number, and compares with it", async () => {
    const { db, gymId } = await libraryDatabase();
    logWorkout(db, {
      gymId,
      exerciseId: benchPress.id,
      at: 1_000,
      sets: [
        { load: 100, reps: 5 },
        { load: 90, reps: 8 },
      ],
    });
    const workoutId = startWorkout(db, { gymId, timeZone: TIME_ZONE, now: 2_000 });
    const entryId = addWorkoutExercise(db, workoutId, benchPress.id);
    addSet(db, entryId);
    confirmSet(db, getLedger(db, workoutId, "en")!.exercises[0]!.sets[1]!.id, {
      load: 95,
      reps: 8,
    });

    expect(
      progress(db, benchPress.id).selected?.workouts[0]?.sets.map(({ number, beat }) => ({
        number,
        beat,
      })),
    ).toEqual([{ number: 2, beat: true }]);
  });
});

describe("beating the previous Workout", () => {
  test("marks each Working set ahead of the same-numbered one last time: load, then reps, then effort", async () => {
    const { db, gymId } = await libraryDatabase();
    logWorkout(db, {
      gymId,
      exerciseId: benchPress.id,
      at: 1_000,
      sets: [
        { load: 100, reps: 8, rir: 1 },
        { load: 100, reps: 5, rir: 1 },
        { load: 100, reps: 5, rir: 1 },
        { load: 100, reps: 5, rir: 1 },
        { load: 100, reps: 5, rir: 1 },
        { load: 100, reps: 5 },
      ],
    });
    logWorkout(db, {
      gymId,
      exerciseId: benchPress.id,
      at: 2_000,
      sets: [
        // A warm-up in front never shifts which Working set is compared.
        { kind: "warmup", load: 60, reps: 10 },
        { load: 102.5, reps: 3, rir: 0 },
        { load: 100, reps: 6, rir: 0 },
        { load: 100, reps: 5, rir: 2 },
        { load: 100, reps: 5, rir: 1 },
        { load: 95, reps: 12, rir: 3 },
        { load: 100, reps: 5, rir: 3 },
        { load: 100, reps: 5, rir: 1 },
      ],
    });

    const [latest, earliest] = progress(db, benchPress.id).selected!.workouts;
    expect(latest?.sets.map((set) => set.beat)).toEqual([
      true, // more load, even with fewer reps
      true, // same load, more reps
      true, // same load and reps, lower effort
      false, // same in every way
      false, // more reps can't make up for less load
      false, // no effort logged last time to be lower than
      false, // last time didn't reach this set number
    ]);
    expect(earliest?.sets.every((set) => !set.beat)).toBe(true);
  });
});

describe("beating the previous Workout, by Load type", () => {
  // The latest Workout's arrows against two sets logged before them.
  async function arrows(exerciseId: string, before: LoggedSet[], after: LoggedSet[]) {
    const { db, gymId } = await libraryDatabase();
    logWorkout(db, { gymId, exerciseId, at: 1_000, sets: before });
    logWorkout(db, { gymId, exerciseId, at: 2_000, sets: after });
    return progress(db, exerciseId).selected!.workouts[0]!.sets.map((set) => set.beat);
  }

  test("Assisted: less assistance is more load", async () => {
    expect(
      await arrows(
        assistedPullUp.id,
        [
          { load: 30, reps: 8 },
          { load: 30, reps: 8 },
        ],
        [
          { load: 20, reps: 6 },
          { load: 40, reps: 10 },
        ],
      ),
    ).toEqual([true, false]);
  });

  test("Bodyweight: added load beats bodyweight only", async () => {
    expect(
      await arrows(
        pullUp.id,
        [
          { load: 0, reps: 10 },
          { load: 10, reps: 6 },
        ],
        [
          { load: 10, reps: 5 },
          { load: 0, reps: 12 },
        ],
      ),
    ).toEqual([true, false]);
  });

  test("Stack level: a higher level is more load", async () => {
    const { db, gymId } = await libraryDatabase();
    updateSettings(db, { defaultWeightUnit: "level" });
    logWorkout(db, {
      gymId,
      exerciseId: chestPress.id,
      at: 1_000,
      sets: [
        { load: 7, reps: 10 },
        { load: 7, reps: 10 },
      ],
    });
    logWorkout(db, {
      gymId,
      exerciseId: chestPress.id,
      at: 2_000,
      sets: [
        { load: 8, reps: 8 },
        { load: 6, reps: 14 },
      ],
    });

    const { selected } = progress(db, chestPress.id);
    expect(selected?.format).toEqual({ unit: "level", loadType: "external", unilateral: false });
    expect(selected?.workouts[0]?.sets.map((set) => set.beat)).toEqual([true, false]);
  });
});

describe("Rep records", () => {
  test("hold the most reps at each load and the heaviest load per rep count, over Working sets only", async () => {
    const { db, gymId } = await libraryDatabase();
    logWorkout(db, {
      gymId,
      exerciseId: benchPress.id,
      at: 1_000,
      sets: [
        { kind: "warmup", load: 60, reps: 15 },
        { load: 100, reps: 5 },
        { load: 90, reps: 8 },
      ],
    });
    logWorkout(db, {
      gymId,
      exerciseId: benchPress.id,
      at: 2_000,
      sets: [
        { kind: "warmup", load: 120, reps: 5 },
        { load: 100, reps: 7 },
        { load: 105, reps: 5 },
        { load: 90, reps: 7 },
      ],
    });

    expect(progress(db, benchPress.id).selected?.repRecords).toEqual({
      mostRepsByLoad: [
        { load: 105, reps: 5 },
        { load: 100, reps: 7 },
        { load: 90, reps: 8 },
      ],
      heaviestByReps: [
        { reps: 5, load: 105 },
        { reps: 7, load: 100 },
        { reps: 8, load: 90 },
      ],
    });
  });

  test("Assisted: the least assistance is the heaviest load", async () => {
    const { db, gymId } = await libraryDatabase();
    logWorkout(db, {
      gymId,
      exerciseId: assistedPullUp.id,
      at: 1_000,
      sets: [
        { load: 30, reps: 8 },
        { load: 20, reps: 8 },
        { load: 40, reps: 10 },
      ],
    });

    expect(progress(db, assistedPullUp.id).selected?.repRecords).toEqual({
      mostRepsByLoad: [
        { load: 20, reps: 8 },
        { load: 30, reps: 8 },
        { load: 40, reps: 10 },
      ],
      heaviestByReps: [
        { reps: 8, load: 20 },
        { reps: 10, load: 40 },
      ],
    });
  });

  test("Bodyweight: added load is heavier than bodyweight only", async () => {
    const { db, gymId } = await libraryDatabase();
    logWorkout(db, {
      gymId,
      exerciseId: pullUp.id,
      at: 1_000,
      sets: [
        { load: 0, reps: 8 },
        { load: 10, reps: 8 },
        { load: 0, reps: 12 },
      ],
    });

    expect(progress(db, pullUp.id).selected?.repRecords).toEqual({
      mostRepsByLoad: [
        { load: 10, reps: 8 },
        { load: 0, reps: 12 },
      ],
      heaviestByReps: [
        { reps: 8, load: 10 },
        { reps: 12, load: 0 },
      ],
    });
  });

  test("follow edits and deletes of past sets", async () => {
    const { db, gymId } = await libraryDatabase();
    const workoutId = logWorkout(db, {
      gymId,
      exerciseId: benchPress.id,
      at: 1_000,
      sets: [
        { load: 100, reps: 5 },
        { load: 110, reps: 3 },
      ],
    });
    const [first, second] = getLedger(db, workoutId, "en")!.exercises[0]!.sets;

    updateSet(db, first!.id, { reps: 6 });
    deleteSet(db, second!.id);

    expect(progress(db, benchPress.id).selected?.repRecords).toEqual({
      mostRepsByLoad: [{ load: 100, reps: 6 }],
      heaviestByReps: [{ reps: 6, load: 100 }],
    });
  });
});

describe("choosing the Station", () => {
  test("has nothing to show for an Exercise never logged", async () => {
    const { db } = await libraryDatabase();
    expect(progress(db, benchPress.id)).toEqual({
      name: "Barbell Bench Press",
      builtIn: true,
      hidden: false,
      stations: [],
      selected: null,
    });
    expect(getExerciseProgress(db, "no-such-exercise", "en")).toBeUndefined();
  });

  test("lists every Gym's Stations and opens on the last-used Gym's", async () => {
    const { db, gymId } = await libraryDatabase();
    const uptown = createGym(db, "Uptown Barbell");
    logWorkout(db, { gymId, exerciseId: benchPress.id, at: 1_000, sets: [{ load: 100, reps: 5 }] });
    logWorkout(db, {
      gymId: uptown,
      exerciseId: benchPress.id,
      at: 2_000,
      sets: [{ load: 90, reps: 5 }],
    });

    const found = getExerciseProgress(db, benchPress.id, "es");
    expect(found?.name).toBe("Press de banca con barra");
    expect(
      found?.stations.map(({ gymName, label, retired }) => ({ gymName, label, retired })),
    ).toEqual([
      { gymName: "Downtown Iron", label: null, retired: false },
      { gymName: "Uptown Barbell", label: null, retired: false },
    ]);
    expect(found?.selected?.station.gymName).toBe("Uptown Barbell");
    // Each Gym's sets stay with its own Station.
    expect(found?.selected?.workouts.flatMap((w) => w.sets.map((set) => set.load))).toEqual([90]);
  });

  test("opens on the Gym of the Workout in progress over a later past Workout elsewhere", async () => {
    const { db, gymId } = await libraryDatabase();
    const uptown = createGym(db, "Uptown Barbell");
    logWorkout(db, { gymId, exerciseId: benchPress.id, at: 1_000, sets: [{ load: 100, reps: 5 }] });
    logWorkout(db, {
      gymId: uptown,
      exerciseId: benchPress.id,
      at: 2_000,
      sets: [{ load: 90, reps: 5 }],
    });
    startWorkout(db, { gymId, timeZone: TIME_ZONE, now: 3_000 });
    logPastWorkout(db, { gymId: uptown, timeZone: TIME_ZONE, startedAt: 3_500, now: 4_000 });

    expect(progress(db, benchPress.id).selected?.station.gymName).toBe("Downtown Iron");
  });

  test("opens on the asked-for Gym or Station", async () => {
    const { db, gymId } = await libraryDatabase();
    const uptown = createGym(db, "Uptown Barbell");
    logWorkout(db, { gymId, exerciseId: benchPress.id, at: 1_000, sets: [{ load: 100, reps: 5 }] });
    logWorkout(db, {
      gymId: uptown,
      exerciseId: benchPress.id,
      at: 2_000,
      sets: [{ load: 90, reps: 5 }],
    });
    const downtown = progress(db, benchPress.id).stations[0]!.id;

    expect(progress(db, benchPress.id, { gymId }).selected?.station.id).toBe(downtown);
    expect(progress(db, benchPress.id, { stationId: downtown }).selected?.station.id).toBe(
      downtown,
    );
    // A Gym with no Station for the Exercise still opens on one.
    const empty = createGym(db, "Hotel gym");
    expect(progress(db, benchPress.id, { gymId: empty }).selected?.station.gymName).toBe(
      "Uptown Barbell",
    );
  });

  test("Retired Stations stay selectable and marked, never bridged to their replacement", async () => {
    const { db, gymId } = await libraryDatabase();
    logWorkout(db, { gymId, exerciseId: chestPress.id, at: 1_000, sets: [{ load: 50, reps: 10 }] });
    const workoutId = startWorkout(db, { gymId, timeZone: TIME_ZONE, now: 2_000 });
    const entryId = addWorkoutExercise(db, workoutId, chestPress.id);
    addStation(db, entryId, { label: "Life Fitness", existingLabel: "Hammer Strength" });
    confirmSet(db, getLedger(db, workoutId, "en")!.exercises[0]!.sets[0]!.id, {
      load: 40,
      reps: 12,
    });
    finishWorkout(db, workoutId, { now: 2_001 });
    const hammer = progress(db, chestPress.id).stations.find((s) => s.label === "Hammer Strength")!;
    db.update(station).set({ retired: true }).where(eq(station.id, hammer.id)).run();

    const { stations, selected } = progress(db, chestPress.id);
    expect(stations.map(({ label, retired }) => ({ label, retired }))).toEqual([
      { label: "Hammer Strength", retired: true },
      { label: "Life Fitness", retired: false },
    ]);
    expect(selected?.station.label).toBe("Life Fitness");
    expect(selected?.workouts.map((w) => w.sets.map((set) => [set.load, set.beat]))).toEqual([
      [[40, false]],
    ]);
    const retired = progress(db, chestPress.id, { stationId: hammer.id }).selected;
    expect(retired?.station).toEqual({ ...hammer, retired: true });
    expect(retired?.workouts.map((w) => w.sets.map((set) => set.load))).toEqual([[50]]);
  });

  test("a Retired Station is the default only when the Gym has no other", async () => {
    const { db, gymId } = await libraryDatabase();
    logWorkout(db, { gymId, exerciseId: chestPress.id, at: 1_000, sets: [{ load: 50, reps: 10 }] });
    const [hammer] = progress(db, chestPress.id).stations;
    db.update(station).set({ retired: true }).where(eq(station.id, hammer!.id)).run();
    expect(progress(db, chestPress.id).selected?.station.id).toBe(hammer!.id);

    // Logged to more recently than the new Station, then retired.
    db.update(station).set({ retired: false }).where(eq(station.id, hammer!.id)).run();
    const workoutId = startWorkout(db, { gymId, timeZone: TIME_ZONE, now: 2_000 });
    const entryId = addWorkoutExercise(db, workoutId, chestPress.id);
    addStation(db, entryId, { label: "Life Fitness", existingLabel: "Hammer Strength" });
    switchStation(db, entryId, hammer!.id);
    confirmSet(db, getLedger(db, workoutId, "en")!.exercises[0]!.sets[0]!.id, {
      load: 55,
      reps: 8,
    });
    finishWorkout(db, workoutId, { now: 2_001 });
    db.update(station).set({ retired: true }).where(eq(station.id, hammer!.id)).run();

    expect(progress(db, chestPress.id).selected?.station.label).toBe("Life Fitness");
  });
});

describe("progress chart", () => {
  test("External: one Volume point per Workout, oldest first, over Working sets with their count", async () => {
    const { db, gymId } = await libraryDatabase();
    logWorkout(db, {
      gymId,
      exerciseId: benchPress.id,
      at: 1_000,
      sets: [
        { kind: "warmup", load: 60, reps: 10 },
        { load: 100, reps: 5 },
        { load: 90, reps: 8 },
      ],
    });
    logWorkout(db, {
      gymId,
      exerciseId: benchPress.id,
      at: 2_000,
      sets: [{ load: 102.5, reps: 4 }],
    });

    expect(progress(db, benchPress.id).selected?.chart).toEqual({
      measure: "volume",
      points: [
        { startedAt: 1_000, timeZone: TIME_ZONE, value: 1_220, sets: 2 },
        { startedAt: 2_000, timeZone: TIME_ZONE, value: 410, sets: 1 },
      ],
    });
  });

  test("two slots on the same Station in one Workout sum into one point", async () => {
    const { db, gymId } = await libraryDatabase();
    const workoutId = startWorkout(db, { gymId, timeZone: TIME_ZONE, now: 1_000 });
    addWorkoutExercise(db, workoutId, benchPress.id);
    addWorkoutExercise(db, workoutId, benchPress.id);
    const [early, late] = getLedger(db, workoutId, "en")!.exercises;
    confirmSet(db, early!.sets[0]!.id, { load: 100, reps: 5 });
    confirmSet(db, late!.sets[0]!.id, { load: 80, reps: 10 });
    finishWorkout(db, workoutId, { now: 2_000 });

    expect(
      progress(db, benchPress.id).selected?.chart.points.map(({ value, sets }) => ({
        value,
        sets,
      })),
    ).toEqual([{ value: 1_300, sets: 2 }]);
  });

  test("mid-Workout, only the confirmed Working sets count", async () => {
    const { db, gymId } = await libraryDatabase();
    const workoutId = startWorkout(db, { gymId, timeZone: TIME_ZONE, now: 1_000 });
    const entryId = addWorkoutExercise(db, workoutId, benchPress.id);
    addSet(db, entryId);
    confirmSet(db, getLedger(db, workoutId, "en")!.exercises[0]!.sets[0]!.id, {
      load: 100,
      reps: 5,
    });

    expect(
      progress(db, benchPress.id).selected?.chart.points.map(({ value, sets }) => ({
        value,
        sets,
      })),
    ).toEqual([{ value: 500, sets: 1 }]);
  });

  test("Unilateral: Volume over reps per side, not doubled", async () => {
    const { db, gymId } = await libraryDatabase();
    logWorkout(db, {
      gymId,
      exerciseId: splitSquat.id,
      at: 1_000,
      sets: [{ load: 20, reps: 10 }],
    });

    expect(progress(db, splitSquat.id).selected?.chart.points.map(({ value }) => value)).toEqual([
      200,
    ]);
  });

  test("Stack level: level × reps, not a Volume", async () => {
    const { db, gymId } = await libraryDatabase();
    updateSettings(db, { defaultWeightUnit: "level" });
    logWorkout(db, {
      gymId,
      exerciseId: chestPress.id,
      at: 1_000,
      sets: [
        { load: 7, reps: 10 },
        { load: 8, reps: 8 },
      ],
    });

    const { chart } = progress(db, chestPress.id).selected!;
    expect(chart.measure).toBe("levelReps");
    expect(chart.points.map(({ value }) => value)).toEqual([134]);
  });

  test("Bodyweight: total Working-set reps, whatever the added load", async () => {
    const { db, gymId } = await libraryDatabase();
    logWorkout(db, {
      gymId,
      exerciseId: pullUp.id,
      at: 1_000,
      sets: [
        { kind: "warmup", load: 0, reps: 5 },
        { load: 0, reps: 12 },
        { load: 10, reps: 8 },
      ],
    });

    const { chart } = progress(db, pullUp.id).selected!;
    expect(chart.measure).toBe("reps");
    expect(chart.points.map(({ value, sets }) => ({ value, sets }))).toEqual([
      { value: 20, sets: 2 },
    ]);
  });

  test("Assisted: total Working-set reps, whatever the assistance", async () => {
    const { db, gymId } = await libraryDatabase();
    logWorkout(db, {
      gymId,
      exerciseId: assistedPullUp.id,
      at: 1_000,
      sets: [
        { load: 30, reps: 10 },
        { load: 20, reps: 7 },
      ],
    });

    const { chart } = progress(db, assistedPullUp.id).selected!;
    expect(chart.measure).toBe("reps");
    expect(chart.points.map(({ value }) => value)).toEqual([17]);
  });
});
