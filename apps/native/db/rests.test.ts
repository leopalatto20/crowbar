import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { BuiltInExercise } from "./built-in-exercises";
import { seedBuiltInExercises } from "./exercises";
import { createGym } from "./gyms";
import { adjustRest, endRest, getRest, restClock } from "./rests";
import { addRoutineExercise, createRoutine, updateRoutineExercise } from "./routines";
import { seedSettings, updateSettings } from "./settings";
import { createTestDatabase } from "./test-database";
import {
  addSet,
  addWorkoutExercise,
  confirmSet,
  deleteSet,
  deleteWorkout,
  finishWorkout,
  getLedger,
  logPastWorkout,
  reopenSet,
  startWorkout,
  toggleSetKind,
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

const TIME_ZONE = "America/Mexico_City";
const BENCH_SET = { load: 100, reps: 5 };

// Upper A: Bench Press with one warm-up and two working sets resting 3:00, then Pull-Up with no
// rest Target.
async function upperA(path?: string) {
  const db = await createTestDatabase(path);
  seedSettings(db, "MX");
  seedBuiltInExercises(db, [benchPress, pullUp]);
  const routineId = createRoutine(db, "Upper A");
  updateRoutineExercise(db, addRoutineExercise(db, routineId, benchPress.id), {
    warmups: 1,
    sets: 2,
    restSeconds: 180,
  });
  updateRoutineExercise(db, addRoutineExercise(db, routineId, pullUp.id), {
    sets: 1,
    restSeconds: null,
  });
  const gymId = createGym(db, "Downtown Iron");
  const workoutId = startWorkout(db, {
    gymId,
    timeZone: TIME_ZONE,
    routineId,
    now: 0,
  });
  const [bench, pull] = getLedger(db, workoutId, "en")!.exercises;
  const [warmup, first, second] = bench!.sets.map((set) => set.id);
  return {
    db,
    gymId,
    workoutId,
    bench: { id: bench!.id, warmup: warmup!, first: first!, second: second! },
    pull: { id: pull!.id, set: pull!.sets[0]!.id },
  };
}

describe("starting a Rest", () => {
  test("confirming a Working set rests for its slot's rest Target", async () => {
    const { db, bench } = await upperA();
    confirmSet(db, bench.first, BENCH_SET, 10_000);
    expect(getRest(db, "en")).toEqual({
      setId: bench.first,
      workoutExerciseId: bench.id,
      exerciseName: "Barbell Bench Press",
      startedAt: 10_000,
      endsAt: 190_000,
    });
  });

  test("confirming a warm-up starts none", async () => {
    const { db, bench } = await upperA();
    confirmSet(db, bench.warmup, BENCH_SET, 10_000);
    expect(getRest(db, "en")).toBeNull();
  });

  test("confirming a warm-up leaves a running Rest alone but ends one that's over", async () => {
    const { db, bench, pull } = await upperA();
    confirmSet(db, pull.set, { reps: 8 }, 10_000);
    confirmSet(db, bench.warmup, BENCH_SET, 20_000);
    expect(getRest(db, "en")).toMatchObject({ setId: pull.set });

    reopenSet(db, bench.warmup);
    confirmSet(db, bench.warmup, BENCH_SET, 200_000);
    expect(getRest(db, "en")).toBeNull();
  });

  test("a slot with no rest Target rests for the default rest", async () => {
    const { db, pull } = await upperA();
    updateSettings(db, { defaultRestSeconds: 90 });
    confirmSet(db, pull.set, { reps: 8 }, 10_000);
    expect(getRest(db, "en")).toMatchObject({
      setId: pull.set,
      startedAt: 10_000,
      endsAt: 100_000,
    });
  });

  test("the last Working set of an Exercise still rests", async () => {
    const { db, bench } = await upperA();
    confirmSet(db, bench.first, BENCH_SET, 10_000);
    confirmSet(db, bench.second, BENCH_SET, 200_000);
    expect(getRest(db, "en")).toMatchObject({ setId: bench.second, endsAt: 380_000 });
  });

  test("a set confirmed in a finished Workout starts none", async () => {
    const { db, workoutId, bench } = await upperA();
    confirmSet(db, bench.first, BENCH_SET, 10_000);
    finishWorkout(db, workoutId, { now: 20_000 });
    addSet(db, bench.id);
    confirmSet(db, getLedger(db, workoutId, "en")!.exercises[0]!.sets.at(-1)!.id, BENCH_SET);
    expect(getRest(db, "en")).toBeNull();
  });

  test("a backfilled past Workout starts none", async () => {
    const { db, gymId } = await upperA();
    const workoutId = logPastWorkout(db, { gymId, timeZone: TIME_ZONE, now: 10_000_000 });
    addWorkoutExercise(db, workoutId, benchPress.id);
    confirmSet(db, getLedger(db, workoutId, "en")!.exercises[0]!.sets[0]!.id, BENCH_SET);
    expect(getRest(db, "en")).toBeNull();
  });

  test("starts none while the Rest timer is off", async () => {
    const { db, bench } = await upperA();
    updateSettings(db, { restTimerEnabled: false });
    confirmSet(db, bench.first, BENCH_SET, 10_000);
    expect(getRest(db, "en")).toBeNull();
  });
});

describe("the Rest's Exercise", () => {
  test("is named in the lifter's language", async () => {
    const { db, bench } = await upperA();
    confirmSet(db, bench.first, BENCH_SET, 10_000);
    expect(getRest(db, "en")).toMatchObject({ exerciseName: "Barbell Bench Press" });
    expect(getRest(db, "es")).toMatchObject({ exerciseName: "Press de banca con barra" });
  });
});

describe("adjusting a Rest", () => {
  test("+15 and −15 move its end, once, without touching the rest Target", async () => {
    const { db, workoutId, bench } = await upperA();
    confirmSet(db, bench.first, BENCH_SET, 10_000);
    adjustRest(db, 15, 20_000);
    adjustRest(db, 15, 21_000);
    adjustRest(db, -15, 22_000);
    expect(getRest(db, "en")).toMatchObject({ startedAt: 10_000, endsAt: 205_000 });
    expect(getLedger(db, workoutId, "en")!.exercises[0]!.target?.restSeconds).toBe(180);
  });

  test("−15 never ends it before now", async () => {
    const { db, bench } = await upperA();
    confirmSet(db, bench.first, BENCH_SET, 10_000);
    adjustRest(db, -15, 185_000);
    expect(getRest(db, "en")).toMatchObject({ endsAt: 185_000 });
  });

  test("the next Rest starts from its own rest Target again", async () => {
    const { db, bench } = await upperA();
    confirmSet(db, bench.first, BENCH_SET, 10_000);
    adjustRest(db, 15, 20_000);
    confirmSet(db, bench.second, BENCH_SET, 300_000);
    expect(getRest(db, "en")).toMatchObject({ startedAt: 300_000, endsAt: 480_000 });
  });
});

describe("ending a Rest", () => {
  test("Skip ends it", async () => {
    const { db, bench } = await upperA();
    confirmSet(db, bench.first, BENCH_SET, 10_000);
    endRest(db);
    expect(getRest(db, "en")).toBeNull();
  });

  test("finishing the Workout ends it", async () => {
    const { db, workoutId, bench } = await upperA();
    confirmSet(db, bench.first, BENCH_SET, 10_000);
    finishWorkout(db, workoutId, { now: 20_000 });
    expect(getRest(db, "en")).toBeNull();
  });

  test("turning the Rest timer off ends it", async () => {
    const { db, bench } = await upperA();
    confirmSet(db, bench.first, BENCH_SET, 10_000);
    updateSettings(db, { restTimerEnabled: false });
    expect(getRest(db, "en")).toBeNull();
  });

  test("discarding the Workout ends it", async () => {
    const { db, workoutId, bench } = await upperA();
    confirmSet(db, bench.first, BENCH_SET, 10_000);
    deleteWorkout(db, workoutId);
    expect(getRest(db, "en")).toBeNull();
  });
});

describe("one Rest at a time", () => {
  test("confirming another set replaces the Rest with that set's", async () => {
    const { db, bench, pull } = await upperA();
    confirmSet(db, bench.first, BENCH_SET, 10_000);
    confirmSet(db, pull.set, { reps: 8 }, 30_000);
    expect(getRest(db, "en")).toEqual({
      setId: pull.set,
      workoutExerciseId: pull.id,
      exerciseName: "Pull-Up",
      startedAt: 30_000,
      endsAt: 150_000,
    });
  });

  test("un-confirming the set that started it cancels it", async () => {
    const { db, bench } = await upperA();
    confirmSet(db, bench.first, BENCH_SET, 10_000);
    reopenSet(db, bench.first);
    expect(getRest(db, "en")).toBeNull();
  });

  test("un-confirming an earlier set leaves it running", async () => {
    const { db, bench } = await upperA();
    confirmSet(db, bench.first, BENCH_SET, 10_000);
    confirmSet(db, bench.second, BENCH_SET, 200_000);
    reopenSet(db, bench.first);
    expect(getRest(db, "en")).toMatchObject({ setId: bench.second });
  });

  test("deleting the set that started it cancels it", async () => {
    const { db, bench } = await upperA();
    confirmSet(db, bench.first, BENCH_SET, 10_000);
    deleteSet(db, bench.first);
    expect(getRest(db, "en")).toBeNull();
  });

  test("turning the set that started it into a warm-up cancels it", async () => {
    const { db, bench } = await upperA();
    confirmSet(db, bench.first, BENCH_SET, 10_000);
    toggleSetKind(db, bench.first);
    expect(getRest(db, "en")).toBeNull();
  });
});

describe("reconciling a Rest from its end", () => {
  let directory: string | undefined;
  afterEach(() => {
    if (directory) rmSync(directory, { recursive: true, force: true });
  });

  test("counts down while it runs", () => {
    expect(restClock({ startedAt: 0, endsAt: 180_000 }, 60_000)).toEqual({
      over: false,
      remaining: 120,
      progress: 1 / 3,
    });
  });

  test("counts overtime up once it's over", () => {
    expect(restClock({ startedAt: 0, endsAt: 180_000 }, 192_000)).toEqual({
      over: true,
      overtime: 12,
    });
  });

  test("survives the app being killed", async () => {
    directory = mkdtempSync(join(tmpdir(), "crowbar-"));
    const path = join(directory, "crowbar.db");
    const { db, bench } = await upperA(path);
    confirmSet(db, bench.first, BENCH_SET, 10_000);

    const relaunched = await createTestDatabase(path);

    const resumed = getRest(relaunched, "en");
    expect(resumed).toMatchObject({ setId: bench.first, startedAt: 10_000, endsAt: 190_000 });
    expect(restClock(resumed!, 100_000)).toMatchObject({ over: false, remaining: 90 });
    expect(restClock(resumed!, 250_000)).toEqual({ over: true, overtime: 60 });
  });
});
