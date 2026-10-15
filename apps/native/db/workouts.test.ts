import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { BuiltInExercise } from "./built-in-exercises";
import { seedBuiltInExercises } from "./exercises";
import { createGym, lastUsedGym } from "./gyms";
import {
  addRoutineExercise,
  createRoutine,
  deleteRoutine,
  getRoutine,
  listRoutines,
  removeRoutineExercise,
  renameRoutine,
  updateRoutineExercise,
} from "./routines";
import type { Database } from "./database";

import { station } from "./schema";
import { seedSettings, updateSettings } from "./settings";
import { createTestDatabase } from "./test-database";
import { parseDecimal } from "@/lib/i18n/locale";

import {
  addSet,
  addStation,
  switchStation,
  addWorkoutExercise,
  changeWorkoutGym,
  confirmSet,
  currentWorkout,
  deleteSet,
  finishEditing,
  discardAndStartWorkout,
  finishWorkout,
  getLedger,
  saveWorkoutAsRoutine,
  deleteWorkout,
  workoutSetCount,
  listGymChangeRelabels,
  listHistory,
  listWorkoutEdits,
  listWriteBack,
  removeWorkoutExercise,
  moveWorkoutExercise,
  reopenSet,
  setMachineNotes,
  setWorkoutDuration,
  setWorkoutStart,
  startWorkout,
  swapWorkoutExercise,
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

const lateralRaise: BuiltInExercise = {
  id: "dumbbell-lateral-raise",
  name: { en: "Dumbbell Lateral Raise", es: "Elevación lateral con mancuernas" },
  equipmentType: "dumbbell",
  loadType: "external",
  unilateral: false,
  muscleGroup: "sideDelts",
};

const TIME_ZONE = "America/Mexico_City";

async function libraryDatabase() {
  const db = await createTestDatabase();
  seedSettings(db, "MX");
  seedBuiltInExercises(db, [benchPress, pullUp, assistedPullUp, lateralRaise]);
  return db;
}

async function startedWorkout() {
  const db = await libraryDatabase();
  const gymId = createGym(db, "Downtown Iron");
  const workoutId = startWorkout(db, { gymId, timeZone: TIME_ZONE });
  return { db, gymId, workoutId };
}

function ledger(db: Database, workoutId: string) {
  const found = getLedger(db, workoutId, "en");
  if (!found) throw new Error(`Workout ${workoutId} is gone`);
  return found;
}

describe("startWorkout", () => {
  test("has no Gym to start at before the first Gym is named", async () => {
    const db = await libraryDatabase();
    expect(lastUsedGym(db)).toBeUndefined();
  });

  test("starts an empty Workout at the named Gym", async () => {
    const db = await libraryDatabase();
    const gymId = createGym(db, "  Downtown Iron ");
    const id = startWorkout(db, { gymId, timeZone: TIME_ZONE, now: 1_000 });

    expect(currentWorkout(db)).toEqual({ id, routineName: null, startedAt: 1_000 });
    expect(getLedger(db, id, "en")).toEqual({
      id,
      gymId,
      gymName: "Downtown Iron",
      routineName: null,
      startedAt: 1_000,
      finishedAt: null,
      timeZone: TIME_ZONE,
      exercises: [],
    });
  });

  test("later starts use the Gym of the last Workout over a newer Gym", async () => {
    const db = await libraryDatabase();
    const downtown = createGym(db, "Downtown Iron");
    createGym(db, "Garage");
    startWorkout(db, { gymId: downtown, timeZone: TIME_ZONE, now: 1_000 });
    expect(lastUsedGym(db)?.id).toBe(downtown);
  });

  test("uses the named Gym before any Workout is logged there", async () => {
    const db = await libraryDatabase();
    const gymId = createGym(db, "Downtown Iron");
    expect(lastUsedGym(db)).toEqual({ id: gymId, name: "Downtown Iron" });
  });
});

describe("one Workout at a time", () => {
  test("a second Workout can't start while one is in progress", async () => {
    const { db, gymId, workoutId } = await startedWorkout();
    expect(() => startWorkout(db, { gymId, timeZone: TIME_ZONE })).toThrow();
    expect(currentWorkout(db)?.id).toBe(workoutId);
  });

  // Two finished Workouts must coexist, so the constraint covers only unfinished ones.
  test("Workouts keep starting after earlier ones are finished", async () => {
    const { db, gymId, workoutId, workoutExerciseId } = await benchInWorkout();
    confirmSet(db, setsOf(db, workoutId, workoutExerciseId)[0]!.id, { load: 100, reps: 5 });
    finishWorkout(db, workoutId);
    const second = startWorkout(db, { gymId, timeZone: TIME_ZONE });
    confirmSet(db, setsOf(db, second, addWorkoutExercise(db, second, benchPress.id))[0]!.id, {
      load: 100,
      reps: 6,
    });
    finishWorkout(db, second);

    const third = startWorkout(db, { gymId, timeZone: TIME_ZONE });
    expect(currentWorkout(db)?.id).toBe(third);
  });

  test("discarding and starting replaces the Workout in progress", async () => {
    const { db, workoutId, workoutExerciseId } = await benchInWorkout();
    confirmSet(db, setsOf(db, workoutId, workoutExerciseId)[0]!.id, { load: 100, reps: 5 });
    const garage = createGym(db, "Garage");

    const next = discardAndStartWorkout(db, workoutId, {
      gymId: garage,
      timeZone: TIME_ZONE,
      now: 2_000,
    });

    expect(getLedger(db, workoutId, "en")).toBeUndefined();
    expect(currentWorkout(db)?.id).toBe(next);
    expect(ledger(db, next)).toMatchObject({ gymName: "Garage", startedAt: 2_000, exercises: [] });
  });
});

describe("resuming after the app is killed", () => {
  let directory: string | undefined;
  afterEach(() => {
    if (directory) rmSync(directory, { recursive: true, force: true });
  });

  test("a relaunch finds the Workout in progress with every committed field", async () => {
    directory = mkdtempSync(join(tmpdir(), "crowbar-"));
    const path = join(directory, "crowbar.db");
    const db = await createTestDatabase(path);
    seedSettings(db, "MX");
    seedBuiltInExercises(db, [benchPress, pullUp]);
    const workoutId = startWorkout(db, {
      gymId: createGym(db, "Downtown Iron"),
      timeZone: TIME_ZONE,
      now: 1_000,
    });
    const bench = addWorkoutExercise(db, workoutId, benchPress.id);
    addSet(db, bench);
    const [first, second] = setsOf(db, workoutId, bench);
    confirmSet(db, first!.id, { load: 100, reps: 5, rir: 2 });
    updateSet(db, second!.id, { load: 102.5 });
    const pull = addWorkoutExercise(db, workoutId, pullUp.id);
    toggleSetKind(db, setsOf(db, workoutId, pull)[0]!.id);

    const relaunched = await createTestDatabase(path);

    expect(currentWorkout(relaunched)?.id).toBe(workoutId);
    const resumed = ledger(relaunched, workoutId);
    expect(resumed).toMatchObject({ gymName: "Downtown Iron", startedAt: 1_000, finishedAt: null });
    expect(
      resumed.exercises.map((entry) => ({
        exercise: entry.exercise.id,
        sets: entry.sets.map(({ kind, load, reps, rir, done }) => ({
          kind,
          load,
          reps,
          rir,
          done,
        })),
      })),
    ).toEqual([
      {
        exercise: benchPress.id,
        sets: [
          { kind: "working", load: 100, reps: 5, rir: 2, done: true },
          { kind: "working", load: 102.5, reps: null, rir: null, done: false },
        ],
      },
      {
        exercise: pullUp.id,
        sets: [{ kind: "warmup", load: null, reps: null, rir: null, done: false }],
      },
    ]);
  });
});

describe("addWorkoutExercise", () => {
  test("adds the Exercise with one empty working set in the default weight unit", async () => {
    const { db, workoutId } = await startedWorkout();
    const id = addWorkoutExercise(db, workoutId, benchPress.id);

    expect(ledger(db, workoutId).exercises).toEqual([
      {
        id,
        exercise: {
          id: benchPress.id,
          name: "Barbell Bench Press",
          equipmentType: "barbell",
          loadType: "external",
          unilateral: false,
        },
        station: null,
        stations: [],
        unit: "kg",
        target: null,
        sets: [
          {
            id: expect.any(String),
            kind: "working",
            load: null,
            reps: null,
            rir: null,
            done: false,
            lastHere: null,
          },
        ],
      },
    ]);
  });

  test("names the Exercise in the Ledger's language", async () => {
    const { db, workoutId } = await startedWorkout();
    addWorkoutExercise(db, workoutId, benchPress.id);
    expect(getLedger(db, workoutId, "es")?.exercises[0]?.exercise.name).toBe(
      "Press de banca con barra",
    );
  });
});

async function benchInWorkout() {
  const started = await startedWorkout();
  const workoutExerciseId = addWorkoutExercise(started.db, started.workoutId, benchPress.id);
  return { ...started, workoutExerciseId };
}

function setsOf(db: Database, workoutId: string, workoutExerciseId: string) {
  const entry = ledger(db, workoutId).exercises.find((e) => e.id === workoutExerciseId);
  if (!entry) throw new Error(`Workout Exercise ${workoutExerciseId} is gone`);
  return entry.sets;
}

// Logs one finished Workout of Bench Press at the Gym, one confirmed set per value.
function logBench(
  db: Database,
  gymId: string,
  now: number,
  sets: { load: number; reps: number; rir?: number; warmup?: boolean }[],
) {
  const workoutId = startWorkout(db, { gymId, timeZone: TIME_ZONE, now });
  const entry = addWorkoutExercise(db, workoutId, benchPress.id);
  for (let i = 1; i < sets.length; i++) addSet(db, entry);
  setsOf(db, workoutId, entry).forEach((set, index) => {
    const { load, reps, rir = null, warmup } = sets[index]!;
    if (warmup) toggleSetKind(db, set.id);
    confirmSet(db, set.id, { load, reps, rir });
  });
  finishWorkout(db, workoutId, { now: now + 1 });
  return workoutId;
}

describe("updateSet", () => {
  test("writes each committed field through", async () => {
    const { db, workoutId, workoutExerciseId } = await benchInWorkout();
    const [set] = setsOf(db, workoutId, workoutExerciseId);
    updateSet(db, set!.id, { load: 100 });
    updateSet(db, set!.id, { reps: 5, rir: 2 });
    expect(setsOf(db, workoutId, workoutExerciseId)).toEqual([
      { id: set!.id, kind: "working", load: 100, reps: 5, rir: 2, done: false, lastHere: null },
    ]);
  });

  test("saves 82.5 whether typed with a decimal comma or point", async () => {
    const { db, workoutId, workoutExerciseId } = await benchInWorkout();
    addSet(db, workoutExerciseId);
    const [comma, point] = setsOf(db, workoutId, workoutExerciseId);
    updateSet(db, comma!.id, { load: parseDecimal("82,5") });
    updateSet(db, point!.id, { load: parseDecimal("82.5") });
    expect(setsOf(db, workoutId, workoutExerciseId).map((set) => set.load)).toEqual([82.5, 82.5]);
  });

  test("clears a field", async () => {
    const { db, workoutId, workoutExerciseId } = await benchInWorkout();
    const [set] = setsOf(db, workoutId, workoutExerciseId);
    updateSet(db, set!.id, { load: 100 });
    updateSet(db, set!.id, { load: null });
    expect(setsOf(db, workoutId, workoutExerciseId)[0]?.load).toBeNull();
  });
});

describe("addSet", () => {
  test("copies the set above", async () => {
    const { db, workoutId, workoutExerciseId } = await benchInWorkout();
    const [first] = setsOf(db, workoutId, workoutExerciseId);
    toggleSetKind(db, first!.id);
    updateSet(db, first!.id, { load: 60, reps: 8 });
    addSet(db, workoutExerciseId);
    expect(setsOf(db, workoutId, workoutExerciseId)[1]).toMatchObject({
      kind: "warmup",
      load: 60,
      reps: 8,
      rir: null,
      done: false,
    });
  });

  test("leaves the new set unconfirmed even when the set above is confirmed", async () => {
    const { db, workoutId, workoutExerciseId } = await benchInWorkout();
    const [first] = setsOf(db, workoutId, workoutExerciseId);
    updateSet(db, first!.id, { load: 100, reps: 5, rir: 1 });
    addSet(db, workoutExerciseId);
    expect(setsOf(db, workoutId, workoutExerciseId)[1]).toMatchObject({
      load: 100,
      reps: 5,
      rir: 1,
      done: false,
    });
  });
});

describe("toggleSetKind", () => {
  test("turns a working set into a warm-up, which takes no effort", async () => {
    const { db, workoutId, workoutExerciseId } = await benchInWorkout();
    const [set] = setsOf(db, workoutId, workoutExerciseId);
    updateSet(db, set!.id, { load: 60, reps: 8, rir: 3 });
    toggleSetKind(db, set!.id);
    expect(setsOf(db, workoutId, workoutExerciseId)[0]).toMatchObject({
      kind: "warmup",
      load: 60,
      reps: 8,
      rir: null,
    });
  });

  test("turns a warm-up back into a working set", async () => {
    const { db, workoutId, workoutExerciseId } = await benchInWorkout();
    const [set] = setsOf(db, workoutId, workoutExerciseId);
    toggleSetKind(db, set!.id);
    toggleSetKind(db, set!.id);
    expect(setsOf(db, workoutId, workoutExerciseId)[0]?.kind).toBe("working");
  });
});

describe("confirmSet", () => {
  test("commits the set's values and marks it done", async () => {
    const { db, workoutId, workoutExerciseId } = await benchInWorkout();
    const [set] = setsOf(db, workoutId, workoutExerciseId);
    updateSet(db, set!.id, { load: 100 });
    confirmSet(db, set!.id, { reps: 5, rir: 1 });
    expect(setsOf(db, workoutId, workoutExerciseId)[0]).toMatchObject({
      load: 100,
      reps: 5,
      rir: 1,
      done: true,
    });
  });

  test("refuses a set with no load or reps", async () => {
    const { db, workoutId, workoutExerciseId } = await benchInWorkout();
    const [set] = setsOf(db, workoutId, workoutExerciseId);
    expect(() => confirmSet(db, set!.id, { load: 100 })).toThrow();
    expect(setsOf(db, workoutId, workoutExerciseId)[0]).toMatchObject({ load: null, done: false });
  });

  test("logs a Bodyweight set with no load as bodyweight only", async () => {
    const { db, workoutId } = await startedWorkout();
    const pull = addWorkoutExercise(db, workoutId, pullUp.id);
    confirmSet(db, setsOf(db, workoutId, pull)[0]!.id, { reps: 8 });
    expect(setsOf(db, workoutId, pull)[0]).toMatchObject({ load: 0, reps: 8, done: true });
  });

  test("still refuses an Assisted set with no assistance", async () => {
    const { db, workoutId } = await startedWorkout();
    const assisted = addWorkoutExercise(db, workoutId, assistedPullUp.id);
    expect(() => confirmSet(db, setsOf(db, workoutId, assisted)[0]!.id, { reps: 8 })).toThrow();
  });

  test("reopening keeps the values", async () => {
    const { db, workoutId, workoutExerciseId } = await benchInWorkout();
    const [set] = setsOf(db, workoutId, workoutExerciseId);
    confirmSet(db, set!.id, { load: 100, reps: 5 });
    reopenSet(db, set!.id);
    expect(setsOf(db, workoutId, workoutExerciseId)[0]).toMatchObject({
      load: 100,
      reps: 5,
      done: false,
    });
  });
});

describe("implicit Stations", () => {
  function unitOf(db: Database, workoutId: string) {
    return ledger(db, workoutId).exercises.map((entry) => entry.unit);
  }

  test("no Station exists until a set is logged, so the default unit still applies", async () => {
    const { db, workoutId } = await benchInWorkout();
    updateSettings(db, { defaultWeightUnit: "lb" });
    expect(unitOf(db, workoutId)).toEqual(["lb"]);
  });

  test("the first logged set creates the Station in the default unit", async () => {
    const { db, workoutId, workoutExerciseId } = await benchInWorkout();
    updateSettings(db, { defaultWeightUnit: "lb" });
    const [set] = setsOf(db, workoutId, workoutExerciseId);
    confirmSet(db, set!.id, { load: 225, reps: 5 });
    updateSettings(db, { defaultWeightUnit: "kg" });
    expect(unitOf(db, workoutId)).toEqual(["lb"]);
  });

  test("a second slot of the same Exercise logs to the same Station", async () => {
    const { db, workoutId, workoutExerciseId: first } = await benchInWorkout();
    const second = addWorkoutExercise(db, workoutId, benchPress.id);
    updateSettings(db, { defaultWeightUnit: "lb" });
    confirmSet(db, setsOf(db, workoutId, first)[0]!.id, { load: 225, reps: 5 });
    updateSettings(db, { defaultWeightUnit: "kg" });
    confirmSet(db, setsOf(db, workoutId, second)[0]!.id, { load: 225, reps: 5 });
    expect(unitOf(db, workoutId)).toEqual(["lb", "lb"]);
  });
});

describe("Bodyweight Stations", () => {
  test("show kg while the default unit is Stack level", async () => {
    const { db, workoutId } = await startedWorkout();
    updateSettings(db, { defaultWeightUnit: "level" });
    addWorkoutExercise(db, workoutId, benchPress.id);
    addWorkoutExercise(db, workoutId, pullUp.id);
    expect(ledger(db, workoutId).exercises.map((entry) => entry.unit)).toEqual(["level", "kg"]);
  });

  test("are created in kg when the default unit is Stack level", async () => {
    const { db, workoutId } = await startedWorkout();
    updateSettings(db, { defaultWeightUnit: "level" });
    const pull = addWorkoutExercise(db, workoutId, pullUp.id);
    confirmSet(db, setsOf(db, workoutId, pull)[0]!.id, { load: 0, reps: 8 });
    updateSettings(db, { defaultWeightUnit: "lb" });
    expect(ledger(db, workoutId).exercises[0]?.unit).toBe("kg");
  });

  test("follow a kg or lb default like any other Station", async () => {
    const { db, workoutId } = await startedWorkout();
    updateSettings(db, { defaultWeightUnit: "lb" });
    const pull = addWorkoutExercise(db, workoutId, pullUp.id);
    confirmSet(db, setsOf(db, workoutId, pull)[0]!.id, { load: 25, reps: 8 });
    updateSettings(db, { defaultWeightUnit: "kg" });
    expect(ledger(db, workoutId).exercises[0]?.unit).toBe("lb");
  });
});

describe("finishWorkout", () => {
  test("drops unconfirmed sets and Exercises with no confirmed sets, keeping the order", async () => {
    const { db, workoutId, workoutExerciseId: bench } = await benchInWorkout();
    const pull = addWorkoutExercise(db, workoutId, pullUp.id);
    const raise = addWorkoutExercise(db, workoutId, lateralRaise.id);
    addSet(db, bench);
    addSet(db, raise);
    const [benchSet] = setsOf(db, workoutId, bench);
    const [, raiseSet] = setsOf(db, workoutId, raise);
    confirmSet(db, benchSet!.id, { load: 100, reps: 5 });
    confirmSet(db, raiseSet!.id, { load: 12, reps: 14 });
    updateSet(db, setsOf(db, workoutId, pull)[0]!.id, { load: 0, reps: 8 });

    finishWorkout(db, workoutId, { now: 5_000 });

    const finished = ledger(db, workoutId);
    expect(finished.finishedAt).toBe(5_000);
    expect(
      finished.exercises.map((entry) => ({
        exercise: entry.exercise.id,
        sets: entry.sets.map(({ load, reps }) => [load, reps]),
      })),
    ).toEqual([
      { exercise: benchPress.id, sets: [[100, 5]] },
      { exercise: lateralRaise.id, sets: [[12, 14]] },
    ]);
    expect(currentWorkout(db)).toBeUndefined();
  });

  test("removes a Workout with nothing logged", async () => {
    const { db, workoutId } = await benchInWorkout();
    finishWorkout(db, workoutId);
    expect(getLedger(db, workoutId, "en")).toBeUndefined();
  });

  test("the next Workout at the Gym logs to the same Station", async () => {
    const { db, gymId, workoutId, workoutExerciseId } = await benchInWorkout();
    updateSettings(db, { defaultWeightUnit: "lb" });
    confirmSet(db, setsOf(db, workoutId, workoutExerciseId)[0]!.id, { load: 225, reps: 5 });
    finishWorkout(db, workoutId);
    updateSettings(db, { defaultWeightUnit: "kg" });

    const next = startWorkout(db, { gymId, timeZone: TIME_ZONE });
    addWorkoutExercise(db, next, benchPress.id);
    expect(ledger(db, next).exercises[0]?.unit).toBe("lb");
  });

  test("another Gym gets its own Station", async () => {
    const { db, workoutId, workoutExerciseId } = await benchInWorkout();
    updateSettings(db, { defaultWeightUnit: "lb" });
    confirmSet(db, setsOf(db, workoutId, workoutExerciseId)[0]!.id, { load: 225, reps: 5 });
    finishWorkout(db, workoutId);
    updateSettings(db, { defaultWeightUnit: "kg" });

    const garage = startWorkout(db, { gymId: createGym(db, "Garage"), timeZone: TIME_ZONE });
    addWorkoutExercise(db, garage, benchPress.id);
    expect(ledger(db, garage).exercises[0]?.unit).toBe("kg");
  });

  test("a Station whose only sets were dropped goes with them", async () => {
    const { db, gymId, workoutId, workoutExerciseId } = await benchInWorkout();
    updateSettings(db, { defaultWeightUnit: "lb" });
    const [set] = setsOf(db, workoutId, workoutExerciseId);
    confirmSet(db, set!.id, { load: 225, reps: 5 });
    reopenSet(db, set!.id);
    finishWorkout(db, workoutId);
    updateSettings(db, { defaultWeightUnit: "kg" });

    const next = startWorkout(db, { gymId, timeZone: TIME_ZONE });
    addWorkoutExercise(db, next, benchPress.id);
    expect(ledger(db, next).exercises[0]?.unit).toBe("kg");
  });
});

describe("discarding the Workout in progress", () => {
  test("removes the Workout and everything logged in it", async () => {
    const { db, workoutId, workoutExerciseId } = await benchInWorkout();
    confirmSet(db, setsOf(db, workoutId, workoutExerciseId)[0]!.id, { load: 100, reps: 5 });
    deleteWorkout(db, workoutId);
    expect(getLedger(db, workoutId, "en")).toBeUndefined();
    expect(currentWorkout(db)).toBeUndefined();
  });

  test("removes the Stations it created but keeps earlier ones", async () => {
    const { db, gymId, workoutId, workoutExerciseId } = await benchInWorkout();
    updateSettings(db, { defaultWeightUnit: "lb" });
    confirmSet(db, setsOf(db, workoutId, workoutExerciseId)[0]!.id, { load: 225, reps: 5 });
    finishWorkout(db, workoutId);

    const discarded = startWorkout(db, { gymId, timeZone: TIME_ZONE });
    const bench = addWorkoutExercise(db, discarded, benchPress.id);
    const raise = addWorkoutExercise(db, discarded, lateralRaise.id);
    confirmSet(db, setsOf(db, discarded, bench)[0]!.id, { load: 225, reps: 5 });
    confirmSet(db, setsOf(db, discarded, raise)[0]!.id, { load: 25, reps: 12 });
    deleteWorkout(db, discarded);
    updateSettings(db, { defaultWeightUnit: "kg" });

    const next = startWorkout(db, { gymId, timeZone: TIME_ZONE });
    addWorkoutExercise(db, next, benchPress.id);
    addWorkoutExercise(db, next, lateralRaise.id);
    expect(ledger(db, next).exercises.map((entry) => entry.unit)).toEqual(["lb", "kg"]);
  });
});

describe("prefill from last time at the same Station", () => {
  function lastHereOf(db: Database, workoutId: string, workoutExerciseId: string) {
    return setsOf(db, workoutId, workoutExerciseId).map((set) => set.lastHere);
  }

  test("shows each set what was logged for its number in the most recent Workout", async () => {
    const db = await libraryDatabase();
    const gymId = createGym(db, "Downtown Iron");
    logBench(db, gymId, 1_000, [{ load: 90, reps: 5 }]);
    logBench(db, gymId, 2_000, [
      { load: 100, reps: 5, rir: 2 },
      { load: 100, reps: 4, rir: 1 },
    ]);

    const workoutId = startWorkout(db, { gymId, timeZone: TIME_ZONE, now: 3_000 });
    const bench = addWorkoutExercise(db, workoutId, benchPress.id);
    addSet(db, bench);
    expect(lastHereOf(db, workoutId, bench)).toEqual([
      { load: 100, reps: 5, rir: 2 },
      { load: 100, reps: 4, rir: 1 },
    ]);
  });

  test("matches Working sets and warm-ups by their own numbers", async () => {
    const db = await libraryDatabase();
    const gymId = createGym(db, "Downtown Iron");
    logBench(db, gymId, 1_000, [
      { load: 60, reps: 8, warmup: true },
      { load: 100, reps: 5, rir: 2 },
    ]);

    const workoutId = startWorkout(db, { gymId, timeZone: TIME_ZONE, now: 2_000 });
    const bench = addWorkoutExercise(db, workoutId, benchPress.id);
    addSet(db, bench);
    addSet(db, bench);
    const [, second, third] = setsOf(db, workoutId, bench);
    toggleSetKind(db, second!.id);
    toggleSetKind(db, third!.id);
    expect(lastHereOf(db, workoutId, bench)).toEqual([
      { load: 100, reps: 5, rir: 2 },
      { load: 60, reps: 8, rir: null },
      null,
    ]);
  });

  test("has nothing to show for a set number last time didn't reach", async () => {
    const db = await libraryDatabase();
    const gymId = createGym(db, "Downtown Iron");
    logBench(db, gymId, 1_000, [{ load: 100, reps: 5 }]);

    const workoutId = startWorkout(db, { gymId, timeZone: TIME_ZONE, now: 2_000 });
    const bench = addWorkoutExercise(db, workoutId, benchPress.id);
    toggleSetKind(db, setsOf(db, workoutId, bench)[0]!.id);
    expect(lastHereOf(db, workoutId, bench)).toEqual([null]);
  });

  test("the same Exercise at another Gym prefills from that Gym only", async () => {
    const db = await libraryDatabase();
    const downtown = createGym(db, "Downtown Iron");
    const garage = createGym(db, "Garage");
    logBench(db, downtown, 1_000, [{ load: 100, reps: 5 }]);
    logBench(db, garage, 2_000, [{ load: 80, reps: 8 }]);

    const atDowntown = startWorkout(db, { gymId: downtown, timeZone: TIME_ZONE, now: 3_000 });
    const bench = addWorkoutExercise(db, atDowntown, benchPress.id);
    expect(lastHereOf(db, atDowntown, bench)).toEqual([{ load: 100, reps: 5, rir: null }]);
    deleteWorkout(db, atDowntown);

    const atNewGym = startWorkout(db, {
      gymId: createGym(db, "Hotel"),
      timeZone: TIME_ZONE,
      now: 4_000,
    });
    expect(lastHereOf(db, atNewGym, addWorkoutExercise(db, atNewGym, benchPress.id))).toEqual([
      null,
    ]);
  });

  test("a past Workout reads only the Workouts that started before it", async () => {
    const db = await libraryDatabase();
    const gymId = createGym(db, "Downtown Iron");
    const first = logBench(db, gymId, 1_000, [{ load: 90, reps: 5 }]);
    const third = logBench(db, gymId, 3_000, [{ load: 100, reps: 5 }]);
    const second = logBench(db, gymId, 2_000, [{ load: 95, reps: 5 }]);

    expect(
      [first, second, third].map((id) => ledger(db, id).exercises[0]!.sets[0]!.lastHere?.load),
    ).toEqual([undefined, 90, 95]);
  });

  test("confirming an untouched set stores its ghost values", async () => {
    const db = await libraryDatabase();
    const gymId = createGym(db, "Downtown Iron");
    logBench(db, gymId, 1_000, [{ load: 100, reps: 5, rir: 2 }]);

    const workoutId = startWorkout(db, { gymId, timeZone: TIME_ZONE, now: 2_000 });
    const bench = addWorkoutExercise(db, workoutId, benchPress.id);
    confirmSet(db, setsOf(db, workoutId, bench)[0]!.id);
    expect(setsOf(db, workoutId, bench)[0]).toMatchObject({
      load: 100,
      reps: 5,
      rir: 2,
      done: true,
    });
  });

  test("a typed value overrides its ghost and the rest still commit", async () => {
    const db = await libraryDatabase();
    const gymId = createGym(db, "Downtown Iron");
    logBench(db, gymId, 1_000, [{ load: 100, reps: 5, rir: 2 }]);

    const workoutId = startWorkout(db, { gymId, timeZone: TIME_ZONE, now: 2_000 });
    const bench = addWorkoutExercise(db, workoutId, benchPress.id);
    const [set] = setsOf(db, workoutId, bench);
    updateSet(db, set!.id, { load: 102.5 });
    confirmSet(db, set!.id, { reps: 4 });
    expect(setsOf(db, workoutId, bench)[0]).toMatchObject({ load: 102.5, reps: 4, rir: 2 });
  });

  test("a set added mid-Workout copies what the set above shows", async () => {
    const db = await libraryDatabase();
    const gymId = createGym(db, "Downtown Iron");
    logBench(db, gymId, 1_000, [{ load: 100, reps: 5, rir: 2 }]);

    const workoutId = startWorkout(db, { gymId, timeZone: TIME_ZONE, now: 2_000 });
    const bench = addWorkoutExercise(db, workoutId, benchPress.id);
    updateSet(db, setsOf(db, workoutId, bench)[0]!.id, { reps: 6 });
    addSet(db, bench);
    expect(setsOf(db, workoutId, bench)[1]).toMatchObject({
      load: 100,
      reps: 6,
      rir: 2,
      done: false,
      lastHere: null,
    });
  });

  test("a set added mid-Workout prefills from its own number when last time reached it", async () => {
    const db = await libraryDatabase();
    const gymId = createGym(db, "Downtown Iron");
    logBench(db, gymId, 1_000, [
      { load: 100, reps: 5, rir: 2 },
      { load: 100, reps: 4, rir: 1 },
    ]);

    const workoutId = startWorkout(db, { gymId, timeZone: TIME_ZONE, now: 2_000 });
    const bench = addWorkoutExercise(db, workoutId, benchPress.id);
    addSet(db, bench);
    const second = setsOf(db, workoutId, bench)[1]!;
    confirmSet(db, second.id);
    expect(setsOf(db, workoutId, bench)[1]).toMatchObject({ load: 100, reps: 4, rir: 1 });
  });
});

describe("starting from a Routine", () => {
  async function upperA() {
    const db = await libraryDatabase();
    const gymId = createGym(db, "Downtown Iron");
    const routineId = createRoutine(db, "Upper A");
    const bench = addRoutineExercise(db, routineId, benchPress.id);
    updateRoutineExercise(db, bench, {
      warmups: 2,
      sets: 3,
      repMin: 5,
      repMax: 7,
      rirMin: 1,
      rirMax: 2,
      restSeconds: 180,
    });
    const pull = addRoutineExercise(db, routineId, pullUp.id);
    updateRoutineExercise(db, pull, {
      sets: null,
      repMin: null,
      repMax: null,
      rirMin: null,
      rirMax: null,
      restSeconds: null,
    });
    return { db, gymId, routineId, bench, pull };
  }

  function snapshot(db: Database, workoutId: string) {
    const found = ledger(db, workoutId);
    return {
      routineName: found.routineName,
      exercises: found.exercises.map((entry) => ({
        exercise: entry.exercise.id,
        target: entry.target,
        kinds: entry.sets.map((set) => set.kind),
      })),
    };
  }

  test("snapshots the Exercises, their order, warm-ups, Working sets and Targets", async () => {
    const { db, gymId, routineId } = await upperA();
    const workoutId = startWorkout(db, { gymId, timeZone: TIME_ZONE, routineId, now: 1_000 });

    expect(currentWorkout(db)).toEqual({ id: workoutId, routineName: "Upper A", startedAt: 1_000 });
    expect(snapshot(db, workoutId)).toEqual({
      routineName: "Upper A",
      exercises: [
        {
          exercise: benchPress.id,
          target: { sets: 3, repMin: 5, repMax: 7, rirMin: 1, rirMax: 2, restSeconds: 180 },
          kinds: ["warmup", "warmup", "working", "working", "working"],
        },
        // A slot with no planned set count still starts with one set to log.
        { exercise: pullUp.id, target: null, kinds: ["working"] },
      ],
    });
  });

  test("later Routine edits and renames never reach the Workout", async () => {
    const { db, gymId, routineId, bench, pull } = await upperA();
    const workoutId = startWorkout(db, { gymId, timeZone: TIME_ZONE, routineId });
    const before = snapshot(db, workoutId);

    renameRoutine(db, routineId, "Upper B");
    updateRoutineExercise(db, bench, { warmups: 0, sets: 5, restSeconds: 90 });
    removeRoutineExercise(db, pull);
    addRoutineExercise(db, routineId, lateralRaise.id);

    expect(snapshot(db, workoutId)).toEqual(before);
  });

  test("deleting the Routine keeps the Workout, its name and what was logged", async () => {
    const { db, gymId, routineId } = await upperA();
    const workoutId = startWorkout(db, { gymId, timeZone: TIME_ZONE, routineId });
    const [bench] = ledger(db, workoutId).exercises;
    confirmSet(db, bench!.sets[2]!.id, { load: 100, reps: 6 });
    finishWorkout(db, workoutId);
    const before = snapshot(db, workoutId);

    deleteRoutine(db, routineId);

    expect(snapshot(db, workoutId)).toEqual(before);
    expect(before.routineName).toBe("Upper A");
  });

  test("each slot resolves to the Station last used for its Exercise at the Gym", async () => {
    const { db, gymId, routineId } = await upperA();
    updateSettings(db, { defaultWeightUnit: "lb" });
    const first = startWorkout(db, { gymId, timeZone: TIME_ZONE, routineId, now: 1_000 });
    confirmSet(db, ledger(db, first).exercises[0]!.sets[2]!.id, { load: 225, reps: 5 });
    finishWorkout(db, first, { now: 2_000 });
    // A Station added at the Gym later, with nothing logged to it yet.
    db.insert(station)
      .values({
        id: "ffffffff-ffff-7fff-bfff-ffffffffffff",
        exerciseId: benchPress.id,
        gymId,
        unit: "kg",
      })
      .run();

    const next = startWorkout(db, { gymId, timeZone: TIME_ZONE, routineId, now: 3_000 });
    const [bench, pull] = ledger(db, next).exercises;
    expect(bench?.unit).toBe("lb");
    expect(bench?.sets[2]?.lastHere).toEqual({ load: 225, reps: 5, rir: null });
    // Never logged at this Gym: no Station until its first set, so the default unit shows.
    updateSettings(db, { defaultWeightUnit: "kg" });
    expect(ledger(db, next).exercises[1]?.unit).toBe("kg");
    expect(pull?.sets[0]?.lastHere).toBeNull();
  });

  test("of two Stations used at the Gym, the one used most recently wins", async () => {
    const { db, gymId, routineId } = await upperA();
    const first = startWorkout(db, { gymId, timeZone: TIME_ZONE, routineId, now: 1_000 });
    confirmSet(db, ledger(db, first).exercises[0]!.sets[2]!.id, { load: 100, reps: 5 });
    finishWorkout(db, first, { now: 1_500 });
    updateSettings(db, { defaultWeightUnit: "lb" });
    const second = startWorkout(db, { gymId, timeZone: TIME_ZONE, routineId, now: 2_000 });
    const [bench] = ledger(db, second).exercises;
    addStation(db, bench!.id, { label: "Life Fitness", existingLabel: "Hammer Strength" });
    confirmSet(db, bench!.sets[2]!.id, { load: 225, reps: 5 });
    finishWorkout(db, second, { now: 2_500 });

    const third = startWorkout(db, { gymId, timeZone: TIME_ZONE, routineId, now: 3_000 });
    const [next] = ledger(db, third).exercises;
    expect(next?.station?.label).toBe("Life Fitness");
    expect(next?.unit).toBe("lb");
    expect(next?.sets[2]?.lastHere).toEqual({ load: 225, reps: 5, rir: null });
  });
});

describe("changeWorkoutGym", () => {
  test("prefill follows the new Gym's Stations", async () => {
    const db = await libraryDatabase();
    const downtown = createGym(db, "Downtown Iron");
    const garage = createGym(db, "Garage");
    logBench(db, downtown, 1_000, [{ load: 100, reps: 5 }]);
    logBench(db, garage, 2_000, [{ load: 80, reps: 8 }]);
    const workoutId = startWorkout(db, { gymId: downtown, timeZone: TIME_ZONE, now: 3_000 });
    const bench = addWorkoutExercise(db, workoutId, benchPress.id);

    changeWorkoutGym(db, workoutId, garage);

    expect(ledger(db, workoutId).gymName).toBe("Garage");
    expect(setsOf(db, workoutId, bench).map((set) => set.lastHere)).toEqual([
      { load: 80, reps: 8, rir: null },
    ]);
  });

  test("sets already logged move to the new Gym and leave nothing behind", async () => {
    const db = await libraryDatabase();
    const downtown = createGym(db, "Downtown Iron");
    const garage = createGym(db, "Garage");
    const workoutId = startWorkout(db, { gymId: downtown, timeZone: TIME_ZONE, now: 1_000 });
    const bench = addWorkoutExercise(db, workoutId, benchPress.id);
    confirmSet(db, setsOf(db, workoutId, bench)[0]!.id, { load: 100, reps: 5 });

    changeWorkoutGym(db, workoutId, garage);
    finishWorkout(db, workoutId, { now: 2_000 });

    const lastHereAt = (gymId: string, now: number) => {
      const next = startWorkout(db, { gymId, timeZone: TIME_ZONE, now });
      const lastHere = setsOf(db, next, addWorkoutExercise(db, next, benchPress.id))[0]!.lastHere;
      deleteWorkout(db, next);
      return lastHere;
    };
    expect(lastHereAt(garage, 3_000)).toEqual({ load: 100, reps: 5, rir: null });
    expect(lastHereAt(downtown, 4_000)).toBeNull();
    expect(
      db
        .select()
        .from(station)
        .all()
        .map((row) => row.gymId),
    ).toEqual([garage]);
  });

  test("an Exercise never logged at the new Gym has nothing to prefill", async () => {
    const db = await libraryDatabase();
    const downtown = createGym(db, "Downtown Iron");
    logBench(db, downtown, 1_000, [{ load: 100, reps: 5 }]);
    const workoutId = startWorkout(db, { gymId: downtown, timeZone: TIME_ZONE, now: 2_000 });
    const bench = addWorkoutExercise(db, workoutId, benchPress.id);

    changeWorkoutGym(db, workoutId, createGym(db, "Garage"));
    updateSettings(db, { defaultWeightUnit: "lb" });

    expect(ledger(db, workoutId).exercises.map((entry) => entry.unit)).toEqual(["lb"]);
    expect(setsOf(db, workoutId, bench).map((set) => set.lastHere)).toEqual([null]);
  });

  test("the old Gym keeps its Stations' earlier history", async () => {
    const db = await libraryDatabase();
    const downtown = createGym(db, "Downtown Iron");
    const garage = createGym(db, "Garage");
    logBench(db, downtown, 1_000, [{ load: 100, reps: 5 }]);
    const workoutId = startWorkout(db, { gymId: downtown, timeZone: TIME_ZONE, now: 2_000 });
    const bench = addWorkoutExercise(db, workoutId, benchPress.id);
    confirmSet(db, setsOf(db, workoutId, bench)[0]!.id, { load: 105, reps: 5 });

    changeWorkoutGym(db, workoutId, garage);
    finishWorkout(db, workoutId, { now: 3_000 });

    const next = startWorkout(db, { gymId: downtown, timeZone: TIME_ZONE, now: 4_000 });
    const entry = addWorkoutExercise(db, next, benchPress.id);
    expect(setsOf(db, next, entry)[0]!.lastHere).toEqual({ load: 100, reps: 5, rir: null });
  });
});

describe("several Stations per Exercise", () => {
  test("a second Station labels both, and the Exercise moves onto the new one", async () => {
    const db = await libraryDatabase();
    const gymId = createGym(db, "Downtown Iron");
    logBench(db, gymId, 1_000, [{ load: 100, reps: 5 }]);
    const workoutId = startWorkout(db, { gymId, timeZone: TIME_ZONE, now: 2_000 });
    const bench = addWorkoutExercise(db, workoutId, benchPress.id);

    addStation(db, bench, { label: " Life Fitness ", existingLabel: "Hammer Strength" });

    const [entry] = ledger(db, workoutId).exercises;
    expect(entry?.station?.label).toBe("Life Fitness");
    expect(entry?.stations.map((option) => option.label)).toEqual([
      "Hammer Strength",
      "Life Fitness",
    ]);
    expect(entry?.sets[0]?.lastHere).toBeNull();
  });

  test("switching Station moves the Exercise's sets, and prefill follows", async () => {
    const db = await libraryDatabase();
    const gymId = createGym(db, "Downtown Iron");
    const hammerWorkout = logBench(db, gymId, 1_000, [{ load: 100, reps: 5 }]);
    const hammer = ledger(db, hammerWorkout).exercises[0]!.station!.id;
    const workoutId = startWorkout(db, { gymId, timeZone: TIME_ZONE, now: 2_000 });
    const bench = addWorkoutExercise(db, workoutId, benchPress.id);
    addStation(db, bench, { label: "Life Fitness", existingLabel: "Hammer Strength" });
    confirmSet(db, setsOf(db, workoutId, bench)[0]!.id, { load: 60, reps: 10 });

    switchStation(db, bench, hammer);

    const [entry] = ledger(db, workoutId).exercises;
    expect(entry?.station?.label).toBe("Hammer Strength");
    expect(
      entry?.sets.map(({ load, reps, done, lastHere }) => ({ load, reps, done, lastHere })),
    ).toEqual([{ load: 60, reps: 10, done: true, lastHere: { load: 100, reps: 5, rir: null } }]);
  });

  test("the next Workout at the Gym defaults to the Station switched to", async () => {
    const db = await libraryDatabase();
    const gymId = createGym(db, "Downtown Iron");
    const hammer = ledger(db, logBench(db, gymId, 1_000, [{ load: 100, reps: 5 }])).exercises[0]!
      .station!.id;
    const workoutId = startWorkout(db, { gymId, timeZone: TIME_ZONE, now: 2_000 });
    const bench = addWorkoutExercise(db, workoutId, benchPress.id);
    addStation(db, bench, { label: "Life Fitness", existingLabel: "Hammer Strength" });
    switchStation(db, bench, hammer);
    confirmSet(db, setsOf(db, workoutId, bench)[0]!.id, { load: 105, reps: 5 });
    finishWorkout(db, workoutId, { now: 2_500 });

    const next = startWorkout(db, { gymId, timeZone: TIME_ZONE, now: 3_000 });
    const entry = addWorkoutExercise(db, next, benchPress.id);
    expect(ledger(db, next).exercises[0]?.station?.label).toBe("Hammer Strength");
    expect(setsOf(db, next, entry)[0]?.lastHere).toEqual({ load: 105, reps: 5, rir: null });
  });

  test("a third Station needs only its own label", async () => {
    const db = await libraryDatabase();
    const gymId = createGym(db, "Downtown Iron");
    logBench(db, gymId, 1_000, [{ load: 100, reps: 5 }]);
    const workoutId = startWorkout(db, { gymId, timeZone: TIME_ZONE, now: 2_000 });
    const bench = addWorkoutExercise(db, workoutId, benchPress.id);
    expect(() => addStation(db, bench, { label: "Life Fitness" })).toThrow();
    expect(() => addStation(db, bench, { label: " ", existingLabel: "Hammer Strength" })).toThrow();
    addStation(db, bench, { label: "Life Fitness", existingLabel: "Hammer Strength" });

    addStation(db, bench, { label: "Cybex" });

    expect(ledger(db, workoutId).exercises[0]?.stations.map((option) => option.label)).toEqual([
      "Cybex",
      "Hammer Strength",
      "Life Fitness",
    ]);
  });

  test("a Station labelled but never logged to stays at the Gym", async () => {
    const db = await libraryDatabase();
    const gymId = createGym(db, "Downtown Iron");
    logBench(db, gymId, 1_000, [{ load: 100, reps: 5 }]);
    const workoutId = startWorkout(db, { gymId, timeZone: TIME_ZONE, now: 2_000 });
    addStation(db, addWorkoutExercise(db, workoutId, benchPress.id), {
      label: "Life Fitness",
      existingLabel: "Hammer Strength",
    });

    deleteWorkout(db, workoutId);

    const next = startWorkout(db, { gymId, timeZone: TIME_ZONE, now: 3_000 });
    addWorkoutExercise(db, next, benchPress.id);
    const [entry] = ledger(db, next).exercises;
    expect(entry?.station?.label).toBe("Hammer Strength");
    expect(entry?.stations.map((option) => option.label)).toEqual([
      "Hammer Strength",
      "Life Fitness",
    ]);
  });
});

describe("machine notes", () => {
  test("belong to the Station, so each Station shows its own", async () => {
    const db = await libraryDatabase();
    const gymId = createGym(db, "Downtown Iron");
    const hammer = ledger(db, logBench(db, gymId, 1_000, [{ load: 100, reps: 5 }])).exercises[0]!
      .station!.id;
    const workoutId = startWorkout(db, { gymId, timeZone: TIME_ZONE, now: 2_000 });
    const bench = addWorkoutExercise(db, workoutId, benchPress.id);
    setMachineNotes(db, bench, " Seat 4, pin 7 ");
    addStation(db, bench, { label: "Life Fitness", existingLabel: "Hammer Strength" });
    setMachineNotes(db, bench, "Back pad 2");

    expect(ledger(db, workoutId).exercises[0]?.station?.notes).toBe("Back pad 2");
    switchStation(db, bench, hammer);
    expect(ledger(db, workoutId).exercises[0]?.station?.notes).toBe("Seat 4, pin 7");
  });

  test("written before any set at the Gym are kept for the next Workout there", async () => {
    const { db, gymId, workoutId } = await startedWorkout();
    setMachineNotes(db, addWorkoutExercise(db, workoutId, benchPress.id), "Seat 4");
    deleteWorkout(db, workoutId);

    const next = startWorkout(db, { gymId, timeZone: TIME_ZONE });
    const bench = addWorkoutExercise(db, next, benchPress.id);
    confirmSet(db, setsOf(db, next, bench)[0]!.id, { load: 100, reps: 5 });

    const [entry] = ledger(db, next).exercises;
    expect(entry?.station?.notes).toBe("Seat 4");
    expect(entry?.stations).toHaveLength(1);
  });

  test("cleared notes leave a Station with nothing logged free to go", async () => {
    const { db, workoutId } = await startedWorkout();
    const bench = addWorkoutExercise(db, workoutId, benchPress.id);
    setMachineNotes(db, bench, "Seat 4");
    setMachineNotes(db, bench, "  ");
    expect(ledger(db, workoutId).exercises[0]?.station?.notes).toBeNull();

    deleteWorkout(db, workoutId);

    expect(db.select().from(station).all()).toEqual([]);
  });
});

describe("mid-Workout changes", () => {
  // Upper A: Bench Press (3 × 5–7, rest 3:00), then Pull-Up, then Lateral Raise.
  // `history` logs earlier Workouts at the Gym before this one starts.
  async function upperAWorkout(history?: (db: Database, gymId: string) => void) {
    const db = await libraryDatabase();
    const gymId = createGym(db, "Downtown Iron");
    history?.(db, gymId);
    const routineId = createRoutine(db, "Upper A");
    const slots = {
      bench: addRoutineExercise(db, routineId, benchPress.id),
      pull: addRoutineExercise(db, routineId, pullUp.id),
      raise: addRoutineExercise(db, routineId, lateralRaise.id),
    };
    updateRoutineExercise(db, slots.bench, { sets: 3, repMin: 5, repMax: 7, restSeconds: 180 });
    const workoutId = startWorkout(db, { gymId, timeZone: TIME_ZONE, routineId, now: 10_000 });
    const [bench, pull, raise] = ledger(db, workoutId).exercises.map((entry) => entry.id);
    return {
      db,
      gymId,
      routineId,
      slots,
      workoutId,
      entries: { bench: bench!, pull: pull!, raise: raise! },
    };
  }

  function routineOf(db: Database, routineId: string) {
    return getRoutine(db, routineId, "en")?.exercises.map((slot) => slot.exercise.id);
  }

  function exercisesOf(db: Database, workoutId: string) {
    return ledger(db, workoutId).exercises.map((entry) => entry.exercise.id);
  }

  describe("swapWorkoutExercise", () => {
    test("keeps the slot's Targets and sets, and prefills from the new Exercise's Station", async () => {
      const { db, workoutId, entries } = await upperAWorkout((db, gymId) => {
        const earlier = startWorkout(db, { gymId, timeZone: TIME_ZONE, now: 1_000 });
        const assisted = addWorkoutExercise(db, earlier, assistedPullUp.id);
        confirmSet(db, setsOf(db, earlier, assisted)[0]!.id, { load: 20, reps: 8 });
        finishWorkout(db, earlier, { now: 2_000 });
      });
      updateSet(db, setsOf(db, workoutId, entries.bench)[0]!.id, { load: 100 });

      swapWorkoutExercise(db, entries.bench, assistedPullUp.id);

      const [swapped] = ledger(db, workoutId).exercises;
      expect(swapped?.id).toBe(entries.bench);
      expect(swapped?.exercise.id).toBe(assistedPullUp.id);
      expect(swapped?.target).toEqual({
        sets: 3,
        repMin: 5,
        repMax: 7,
        rirMin: 1,
        rirMax: 2,
        restSeconds: 180,
      });
      // A value typed for the old Exercise means nothing for the new one.
      expect(swapped?.sets.map(({ load, lastHere }) => ({ load, lastHere }))).toEqual([
        { load: null, lastHere: { load: 20, reps: 8, rir: null } },
        { load: null, lastHere: null },
        { load: null, lastHere: null },
      ]);
    });

    test("is refused once a set is confirmed, so logged sets never change Exercise", async () => {
      const { db, workoutId, entries } = await upperAWorkout();
      const [first] = setsOf(db, workoutId, entries.bench);
      confirmSet(db, first!.id, { load: 100, reps: 5 });

      expect(() => swapWorkoutExercise(db, entries.bench, assistedPullUp.id)).toThrow();
      expect(exercisesOf(db, workoutId)[0]).toBe(benchPress.id);

      // Reopening the set makes it unlogged again, so the slot is free to swap.
      reopenSet(db, first!.id);
      swapWorkoutExercise(db, entries.bench, assistedPullUp.id);
      expect(exercisesOf(db, workoutId)[0]).toBe(assistedPullUp.id);
    });

    test("a Station only the swapped-out Exercise's reopened set created goes with it", async () => {
      const { db, workoutId, entries } = await upperAWorkout();
      const [first] = setsOf(db, workoutId, entries.bench);
      confirmSet(db, first!.id, { load: 100, reps: 5 });
      reopenSet(db, first!.id);

      swapWorkoutExercise(db, entries.bench, assistedPullUp.id);

      const bench = addWorkoutExercise(db, workoutId, benchPress.id);
      expect(ledger(db, workoutId).exercises.find((e) => e.id === bench)?.stations).toEqual([]);
    });
  });

  describe("removeWorkoutExercise", () => {
    test("takes the Exercise and its sets out of this Workout only", async () => {
      const { db, routineId, workoutId, entries } = await upperAWorkout();
      confirmSet(db, setsOf(db, workoutId, entries.pull)[0]!.id, { load: 0, reps: 8 });

      removeWorkoutExercise(db, entries.pull);

      expect(exercisesOf(db, workoutId)).toEqual([benchPress.id, lateralRaise.id]);
      expect(routineOf(db, routineId)).toEqual([benchPress.id, pullUp.id, lateralRaise.id]);
      // Its confirmed set went with it: nothing is left to keep at finish.
      finishWorkout(db, workoutId);
      expect(getLedger(db, workoutId, "en")).toBeUndefined();
    });
  });

  describe("moveWorkoutExercise", () => {
    test("reorders this Workout only", async () => {
      const { db, routineId, workoutId, entries } = await upperAWorkout();

      moveWorkoutExercise(db, entries.raise, 0);
      expect(exercisesOf(db, workoutId)).toEqual([lateralRaise.id, benchPress.id, pullUp.id]);
      moveWorkoutExercise(db, entries.raise, 1);
      expect(exercisesOf(db, workoutId)).toEqual([benchPress.id, lateralRaise.id, pullUp.id]);

      expect(routineOf(db, routineId)).toEqual([benchPress.id, pullUp.id, lateralRaise.id]);
    });

    test("the Workout is recorded in the Ledger order at finish", async () => {
      const { db, workoutId, entries } = await upperAWorkout();
      const curl = addWorkoutExercise(db, workoutId, pullUp.id);
      moveWorkoutExercise(db, curl, 0);
      moveWorkoutExercise(db, entries.bench, 3);
      removeWorkoutExercise(db, entries.raise);
      for (const entry of [curl, entries.bench, entries.pull]) {
        confirmSet(db, setsOf(db, workoutId, entry)[0]!.id, { load: 10, reps: 10 });
      }
      const order = ledger(db, workoutId).exercises.map((entry) => entry.id);

      finishWorkout(db, workoutId);

      expect(order).toEqual([curl, entries.pull, entries.bench]);
      expect(ledger(db, workoutId).exercises.map((entry) => entry.id)).toEqual(order);
    });
  });

  describe("the structural edit log", () => {
    test("records each Swap, Add, Remove and Move by slot, in the order made", async () => {
      const { db, workoutId, slots, entries } = await upperAWorkout();

      swapWorkoutExercise(db, entries.bench, assistedPullUp.id);
      const extra = addWorkoutExercise(db, workoutId, benchPress.id);
      moveWorkoutExercise(db, entries.raise, 0);
      removeWorkoutExercise(db, entries.pull);

      expect(listWorkoutEdits(db, workoutId)).toEqual([
        {
          kind: "swap",
          routineExerciseId: slots.bench,
          workoutExerciseId: entries.bench,
          exerciseId: assistedPullUp.id,
        },
        { kind: "add", workoutExerciseId: extra, exerciseId: benchPress.id },
        { kind: "move", routineExerciseId: slots.raise, workoutExerciseId: entries.raise },
        { kind: "remove", routineExerciseId: slots.pull },
      ]);
    });

    test("an Exercise left unlogged records nothing, even one added mid-Workout", async () => {
      const { db, workoutId, entries } = await upperAWorkout();
      addWorkoutExercise(db, workoutId, benchPress.id);
      confirmSet(db, setsOf(db, workoutId, entries.bench)[0]!.id, { load: 100, reps: 5 });

      finishWorkout(db, workoutId);

      expect(exercisesOf(db, workoutId)).toEqual([benchPress.id]);
      expect(listWorkoutEdits(db, workoutId)).toEqual([]);
    });

    test("a swapped or moved slot left unlogged records nothing", async () => {
      const { db, workoutId, slots, entries } = await upperAWorkout();
      swapWorkoutExercise(db, entries.bench, assistedPullUp.id);
      moveWorkoutExercise(db, entries.raise, 0);
      removeWorkoutExercise(db, entries.pull);
      confirmSet(db, setsOf(db, workoutId, entries.raise)[0]!.id, { load: 12, reps: 12 });
      moveWorkoutExercise(db, entries.bench, 0);

      finishWorkout(db, workoutId);

      // The Remove was explicit, so it stays; the Swap and Move went with the unlogged slot.
      expect(listWorkoutEdits(db, workoutId)).toEqual([
        { kind: "move", routineExerciseId: slots.raise, workoutExerciseId: entries.raise },
        { kind: "remove", routineExerciseId: slots.pull },
      ]);
    });

    test("swapping or moving an added Exercise is part of its Add, and removing it undoes it", async () => {
      const { db, workoutId } = await upperAWorkout();
      const kept = addWorkoutExercise(db, workoutId, benchPress.id);
      const dropped = addWorkoutExercise(db, workoutId, pullUp.id);

      swapWorkoutExercise(db, kept, assistedPullUp.id);
      moveWorkoutExercise(db, kept, 0);
      removeWorkoutExercise(db, dropped);

      expect(listWorkoutEdits(db, workoutId)).toEqual([
        { kind: "add", workoutExerciseId: kept, exerciseId: assistedPullUp.id },
      ]);
    });

    test("moving the same slot again records one Move", async () => {
      const { db, workoutId, slots, entries } = await upperAWorkout();
      moveWorkoutExercise(db, entries.raise, 0);
      moveWorkoutExercise(db, entries.raise, 1);

      expect(listWorkoutEdits(db, workoutId)).toEqual([
        { kind: "move", routineExerciseId: slots.raise, workoutExerciseId: entries.raise },
      ]);
    });

    test("an edit whose slot is then deleted from the Routine is kept with no slot", async () => {
      const { db, workoutId, slots, entries } = await upperAWorkout();
      swapWorkoutExercise(db, entries.bench, assistedPullUp.id);

      removeRoutineExercise(db, slots.bench);

      expect(listWorkoutEdits(db, workoutId)).toEqual([
        {
          kind: "swap",
          routineExerciseId: null,
          workoutExerciseId: entries.bench,
          exerciseId: assistedPullUp.id,
        },
      ]);
    });

    test("a Workout started empty has no Routine to record edits for", async () => {
      const { db, workoutId } = await startedWorkout();
      const bench = addWorkoutExercise(db, workoutId, benchPress.id);
      addWorkoutExercise(db, workoutId, pullUp.id);
      swapWorkoutExercise(db, bench, assistedPullUp.id);
      moveWorkoutExercise(db, bench, 1);

      expect(listWorkoutEdits(db, workoutId)).toEqual([]);
    });
  });

  describe("Routine write-back", () => {
    function logFirstSet(db: Database, workoutId: string, workoutExerciseId: string) {
      confirmSet(db, setsOf(db, workoutId, workoutExerciseId)[0]!.id, { load: 10, reps: 10 });
    }

    function slotsOf(db: Database, routineId: string) {
      return getRoutine(db, routineId, "en")!.exercises;
    }

    test("a Swap puts the new Exercise in the slot, keeping its Targets", async () => {
      const { db, routineId, workoutId, entries } = await upperAWorkout();
      const before = slotsOf(db, routineId);
      swapWorkoutExercise(db, entries.bench, assistedPullUp.id);
      logFirstSet(db, workoutId, entries.bench);

      finishWorkout(db, workoutId, { writeBack: true });

      const [bench, ...rest] = slotsOf(db, routineId);
      expect(bench).toEqual({
        ...before[0]!,
        exercise: { id: assistedPullUp.id, name: "Assisted Pull-Up" },
      });
      expect(rest).toEqual(before.slice(1));
    });

    test("an Exercise left unlogged reaches the Routine neither as an edit nor as a removal", async () => {
      const { db, routineId, workoutId, entries } = await upperAWorkout();
      const before = slotsOf(db, routineId);
      swapWorkoutExercise(db, entries.bench, assistedPullUp.id);
      moveWorkoutExercise(db, entries.raise, 0);
      addWorkoutExercise(db, workoutId, benchPress.id);
      logFirstSet(db, workoutId, entries.pull);

      finishWorkout(db, workoutId, { writeBack: true });

      expect(slotsOf(db, routineId)).toEqual(before);
    });

    test("an added Exercise plans its logged Working sets, other Targets blank, where it was logged", async () => {
      const { db, routineId, workoutId, entries } = await upperAWorkout();
      const added = addWorkoutExercise(db, workoutId, benchPress.id);
      addSet(db, added);
      addSet(db, added);
      moveWorkoutExercise(db, added, 1);
      const [warmup] = setsOf(db, workoutId, added);
      toggleSetKind(db, warmup!.id);
      for (const set of setsOf(db, workoutId, added)) {
        confirmSet(db, set.id, { load: 60, reps: 8 });
      }
      for (const entry of [entries.bench, entries.pull]) logFirstSet(db, workoutId, entry);

      finishWorkout(db, workoutId, { writeBack: true });

      const [bench, addedSlot, pull, raise] = slotsOf(db, routineId);
      expect([bench, pull, raise].map((slot) => slot?.exercise.id)).toEqual([
        benchPress.id,
        pullUp.id,
        lateralRaise.id,
      ]);
      expect(addedSlot).toEqual({
        id: expect.any(String),
        exercise: { id: benchPress.id, name: "Barbell Bench Press" },
        warmups: 0,
        sets: 2,
        repMin: null,
        repMax: null,
        rirMin: null,
        rirMax: null,
        restSeconds: null,
      });
    });

    test("replays onto the Routine as it is now, slots the Workout never showed staying put", async () => {
      const { db, routineId, workoutId, entries } = await upperAWorkout();
      moveWorkoutExercise(db, entries.raise, 0);
      removeWorkoutExercise(db, entries.pull);
      const added = addWorkoutExercise(db, workoutId, benchPress.id);
      // Edited mid-Workout, so the Workout never showed it.
      addRoutineExercise(db, routineId, assistedPullUp.id);
      for (const entry of [entries.raise, entries.bench, added]) logFirstSet(db, workoutId, entry);

      finishWorkout(db, workoutId, { writeBack: true });

      expect(routineOf(db, routineId)).toEqual([
        lateralRaise.id,
        benchPress.id,
        benchPress.id,
        assistedPullUp.id,
      ]);
    });

    test("an Exercise left unlogged still holds its place for what was moved or added below it", async () => {
      const { db, routineId, workoutId, entries } = await upperAWorkout();
      moveWorkoutExercise(db, entries.raise, 1);
      const added = addWorkoutExercise(db, workoutId, assistedPullUp.id);
      moveWorkoutExercise(db, added, 1);
      for (const entry of [entries.raise, added, entries.pull]) logFirstSet(db, workoutId, entry);

      finishWorkout(db, workoutId, { writeBack: true });

      expect(routineOf(db, routineId)).toEqual([
        benchPress.id,
        assistedPullUp.id,
        lateralRaise.id,
        pullUp.id,
      ]);
    });

    test("offers nothing when nothing is logged, since the Workout isn't kept", async () => {
      const { db, routineId, workoutId, entries } = await upperAWorkout();
      const before = slotsOf(db, routineId);
      removeWorkoutExercise(db, entries.pull);

      expect(listWriteBack(db, workoutId, "en")).toBeNull();
      finishWorkout(db, workoutId, { writeBack: true });
      expect(slotsOf(db, routineId)).toEqual(before);
    });

    test("skips edits whose slot is gone from the Routine", async () => {
      const { db, routineId, workoutId, slots, entries } = await upperAWorkout();
      swapWorkoutExercise(db, entries.bench, assistedPullUp.id);
      removeWorkoutExercise(db, entries.pull);
      const added = addWorkoutExercise(db, workoutId, benchPress.id);
      removeRoutineExercise(db, slots.bench);
      removeRoutineExercise(db, slots.pull);
      for (const entry of [entries.bench, entries.raise, added]) logFirstSet(db, workoutId, entry);

      finishWorkout(db, workoutId, { writeBack: true });

      expect(routineOf(db, routineId)).toEqual([lateralRaise.id, benchPress.id]);
    });

    test("never changes a slot's set count", async () => {
      const { db, routineId, workoutId, entries } = await upperAWorkout();
      addSet(db, entries.bench);
      for (const set of setsOf(db, workoutId, entries.bench)) {
        confirmSet(db, set.id, { load: 100, reps: 5 });
      }
      moveWorkoutExercise(db, entries.raise, 0);
      logFirstSet(db, workoutId, entries.raise);

      finishWorkout(db, workoutId, { writeBack: true });

      expect(slotsOf(db, routineId).map((slot) => [slot.exercise.id, slot.sets])).toEqual([
        [lateralRaise.id, 3],
        [benchPress.id, 3],
        [pullUp.id, 3],
      ]);
    });

    test("lists exactly the edits it would apply, in the order made, by name", async () => {
      const { db, routineId, workoutId, entries } = await upperAWorkout();
      swapWorkoutExercise(db, entries.bench, pullUp.id);
      swapWorkoutExercise(db, entries.bench, assistedPullUp.id);
      const added = addWorkoutExercise(db, workoutId, benchPress.id);
      addWorkoutExercise(db, workoutId, benchPress.id);
      moveWorkoutExercise(db, entries.raise, 0);
      removeWorkoutExercise(db, entries.pull);
      renameRoutine(db, routineId, "Upper A (heavy)");
      for (const entry of [entries.bench, added, entries.raise]) logFirstSet(db, workoutId, entry);

      expect(listWriteBack(db, workoutId, "es")).toEqual({
        routineName: "Upper A (heavy)",
        edits: [
          { kind: "swap", from: "Press de banca con barra", to: "Dominada asistida" },
          { kind: "add", exercise: "Press de banca con barra" },
          { kind: "move", exercise: "Elevación lateral con mancuernas" },
          { kind: "remove", exercise: "Dominada" },
        ],
      });
    });

    test("lists nothing when no edit would change the Routine", async () => {
      const { db, workoutId, slots, entries } = await upperAWorkout();
      // Swapped and moved straight back, so the Routine already reads as logged.
      swapWorkoutExercise(db, entries.bench, assistedPullUp.id);
      swapWorkoutExercise(db, entries.bench, benchPress.id);
      moveWorkoutExercise(db, entries.raise, 0);
      moveWorkoutExercise(db, entries.raise, 2);
      removeWorkoutExercise(db, entries.pull);
      removeRoutineExercise(db, slots.pull);
      addWorkoutExercise(db, workoutId, benchPress.id);
      for (const entry of [entries.bench, entries.raise]) logFirstSet(db, workoutId, entry);

      expect(listWriteBack(db, workoutId, "en")).toBeNull();
    });

    test("of two Moves that reach the same order, lists the one made first", async () => {
      const { db, workoutId, entries } = await upperAWorkout();
      moveWorkoutExercise(db, entries.pull, 0);
      moveWorkoutExercise(db, entries.bench, 1);
      for (const entry of Object.values(entries)) logFirstSet(db, workoutId, entry);

      expect(listWriteBack(db, workoutId, "en")?.edits).toEqual([
        { kind: "move", exercise: "Pull-Up" },
      ]);
    });

    test("a Workout started empty has no Routine to write back to", async () => {
      const { db, workoutId } = await startedWorkout();
      const bench = addWorkoutExercise(db, workoutId, benchPress.id);
      logFirstSet(db, workoutId, bench);

      expect(listWriteBack(db, workoutId, "en")).toBeNull();
    });

    test("is off unless asked for", async () => {
      const { db, routineId, workoutId, entries } = await upperAWorkout();
      const before = slotsOf(db, routineId);
      swapWorkoutExercise(db, entries.bench, assistedPullUp.id);
      logFirstSet(db, workoutId, entries.bench);

      finishWorkout(db, workoutId);

      expect(slotsOf(db, routineId)).toEqual(before);
    });
  });
});

// One finished Workout at the Gym, with one confirmed set per Exercise, a Routine's included.
function logWorkout(
  db: Database,
  {
    gymId,
    startedAt,
    timeZone = TIME_ZONE,
    routineId,
    exerciseIds = [benchPress.id],
  }: {
    gymId: string;
    startedAt: number;
    timeZone?: string;
    routineId?: string;
    exerciseIds?: string[];
  },
) {
  const workoutId = startWorkout(db, { gymId, timeZone, routineId, now: startedAt });
  for (const exerciseId of exerciseIds) addWorkoutExercise(db, workoutId, exerciseId);
  for (const entry of ledger(db, workoutId).exercises) {
    confirmSet(db, entry.sets[0]!.id, { load: 20, reps: 10 });
  }
  finishWorkout(db, workoutId, { now: startedAt + 3_600_000 });
  return workoutId;
}

describe("listHistory", () => {
  test("groups finished Workouts by month, newest first, leaving out the one in progress", async () => {
    const db = await libraryDatabase();
    const downtown = createGym(db, "Downtown Iron");
    const garage = createGym(db, "Garage");
    const routineId = createRoutine(db, "Upper A");
    addRoutineExercise(db, routineId, benchPress.id);
    const september = logWorkout(db, { gymId: garage, startedAt: Date.UTC(2026, 8, 12, 15) });
    const early = logWorkout(db, {
      gymId: downtown,
      startedAt: Date.UTC(2026, 9, 2, 15),
      exerciseIds: [benchPress.id, pullUp.id],
    });
    const late = logWorkout(db, {
      gymId: downtown,
      startedAt: Date.UTC(2026, 9, 9, 15),
      routineId,
      exerciseIds: [],
    });
    startWorkout(db, { gymId: downtown, timeZone: TIME_ZONE, now: Date.UTC(2026, 9, 14, 15) });

    expect(listHistory(db)).toEqual([
      {
        year: 2026,
        month: 10,
        workouts: [
          {
            id: late,
            startedAt: Date.UTC(2026, 9, 9, 15),
            timeZone: TIME_ZONE,
            routineName: "Upper A",
            gymName: "Downtown Iron",
            exerciseCount: 1,
          },
          {
            id: early,
            startedAt: Date.UTC(2026, 9, 2, 15),
            timeZone: TIME_ZONE,
            routineName: null,
            gymName: "Downtown Iron",
            exerciseCount: 2,
          },
        ],
      },
      {
        year: 2026,
        month: 9,
        workouts: [
          {
            id: september,
            startedAt: Date.UTC(2026, 8, 12, 15),
            timeZone: TIME_ZONE,
            routineName: null,
            gymName: "Garage",
            exerciseCount: 1,
          },
        ],
      },
    ]);
  });

  test("puts each Workout in its month as its own time zone read the start", async () => {
    const db = await libraryDatabase();
    const gymId = createGym(db, "Downtown Iron");
    // Still the evening of September 30 in Mexico City.
    const mexicoCity = logWorkout(db, { gymId, startedAt: Date.UTC(2026, 9, 1, 3) });
    // Already the morning of October 1 in Tokyo, though it started earlier.
    const tokyo = logWorkout(db, {
      gymId,
      startedAt: Date.UTC(2026, 8, 30, 20),
      timeZone: "Asia/Tokyo",
    });

    expect(
      listHistory(db).map(({ year, month, workouts }) => ({
        year,
        month,
        ids: workouts.map((found) => found.id),
      })),
    ).toEqual([
      { year: 2026, month: 10, ids: [tokyo] },
      { year: 2026, month: 9, ids: [mexicoCity] },
    ]);
  });
});

describe("deleting a finished Workout", () => {
  test("counts the logged sets it takes, warm-ups included", async () => {
    const db = await libraryDatabase();
    const gymId = createGym(db, "Downtown Iron");
    const workoutId = logBench(db, gymId, 1_000, [
      { load: 60, reps: 8, warmup: true },
      { load: 100, reps: 5 },
      { load: 100, reps: 5 },
    ]);
    expect(workoutSetCount(db, workoutId)).toBe(3);
  });

  test("removes it from History, and the next Workout prefills from the one before", async () => {
    const db = await libraryDatabase();
    const gymId = createGym(db, "Downtown Iron");
    const kept = logBench(db, gymId, 1_000, [{ load: 100, reps: 5 }]);
    const deleted = logBench(db, gymId, 2_000, [{ load: 110, reps: 5 }]);

    deleteWorkout(db, deleted);

    expect(getLedger(db, deleted, "en")).toBeUndefined();
    expect(listHistory(db).flatMap((month) => month.workouts.map((found) => found.id))).toEqual([
      kept,
    ]);
    const next = startWorkout(db, { gymId, timeZone: TIME_ZONE, now: 3_000 });
    const entry = addWorkoutExercise(db, next, benchPress.id);
    expect(setsOf(db, next, entry)[0]!.lastHere).toEqual({ load: 100, reps: 5, rir: null });
  });
});

describe("editing a past Workout", () => {
  test("deleting a set keeps the others as logged", async () => {
    const db = await libraryDatabase();
    const gymId = createGym(db, "Downtown Iron");
    const workoutId = logBench(db, gymId, 1_000, [
      { load: 100, reps: 5 },
      { load: 100, reps: 4 },
    ]);
    const [entry] = ledger(db, workoutId).exercises;

    deleteSet(db, entry!.sets[0]!.id);

    expect(
      setsOf(db, workoutId, entry!.id).map(({ load, reps, done }) => ({ load, reps, done })),
    ).toEqual([{ load: 100, reps: 4, done: true }]);
  });

  test("an Exercise whose last set is deleted drops out, and its empty Station goes", async () => {
    const db = await libraryDatabase();
    const gymId = createGym(db, "Downtown Iron");
    const workoutId = startWorkout(db, { gymId, timeZone: TIME_ZONE, now: 1_000 });
    const bench = addWorkoutExercise(db, workoutId, benchPress.id);
    const pull = addWorkoutExercise(db, workoutId, pullUp.id);
    confirmSet(db, setsOf(db, workoutId, bench)[0]!.id, { load: 100, reps: 5 });
    confirmSet(db, setsOf(db, workoutId, pull)[0]!.id, { load: 0, reps: 10 });
    finishWorkout(db, workoutId, { now: 2_000 });

    deleteSet(db, setsOf(db, workoutId, bench)[0]!.id);

    expect(ledger(db, workoutId).exercises.map((entry) => entry.id)).toEqual([pull]);
    expect(
      db
        .select()
        .from(station)
        .all()
        .map((found) => found.exerciseId),
    ).toEqual([pullUp.id]);
  });

  test("a Station with a label or notes stays when its last set goes", async () => {
    const db = await libraryDatabase();
    const gymId = createGym(db, "Downtown Iron");
    const workoutId = logBench(db, gymId, 1_000, [{ load: 100, reps: 5 }]);
    const [entry] = ledger(db, workoutId).exercises;
    setMachineNotes(db, entry!.id, "Seat 4");

    deleteSet(db, entry!.sets[0]!.id);

    expect(ledger(db, workoutId).exercises).toEqual([]);
    expect(
      db
        .select()
        .from(station)
        .all()
        .map((found) => found.notes),
    ).toEqual(["Seat 4"]);
  });
  test("a set added copies the one above, even where an earlier Workout reached its number", async () => {
    const db = await libraryDatabase();
    const gymId = createGym(db, "Downtown Iron");
    logBench(db, gymId, 1_000, [
      { load: 80, reps: 8 },
      { load: 80, reps: 8 },
    ]);
    const workoutId = logBench(db, gymId, 2_000, [{ load: 100, reps: 5, rir: 2 }]);
    const [entry] = ledger(db, workoutId).exercises;

    addSet(db, entry!.id);

    expect(setsOf(db, workoutId, entry!.id)[1]).toMatchObject({
      load: 100,
      reps: 5,
      rir: 2,
      done: false,
    });
  });

  test("Done drops the sets never confirmed, and an Exercise added with none", async () => {
    const db = await libraryDatabase();
    const gymId = createGym(db, "Downtown Iron");
    const workoutId = logBench(db, gymId, 1_000, [{ load: 100, reps: 5 }]);
    const [bench] = ledger(db, workoutId).exercises;
    addSet(db, bench!.id);
    addSet(db, bench!.id);
    confirmSet(db, setsOf(db, workoutId, bench!.id)[1]!.id);
    addWorkoutExercise(db, workoutId, pullUp.id);

    finishEditing(db, workoutId);

    const found = ledger(db, workoutId);
    expect(found.exercises.map((entry) => entry.id)).toEqual([bench!.id]);
    expect(found.exercises[0]!.sets.map(({ load, reps, done }) => ({ load, reps, done }))).toEqual([
      { load: 100, reps: 5, done: true },
      { load: 100, reps: 5, done: true },
    ]);
  });
  test("switching Station moves all of the Exercise's sets, and later prefill follows", async () => {
    const db = await libraryDatabase();
    const gymId = createGym(db, "Downtown Iron");
    const hammerWorkout = logBench(db, gymId, 1_000, [{ load: 100, reps: 5 }]);
    const hammer = ledger(db, hammerWorkout).exercises[0]!.station!.id;
    const mistaken = startWorkout(db, { gymId, timeZone: TIME_ZONE, now: 2_000 });
    const bench = addWorkoutExercise(db, mistaken, benchPress.id);
    addStation(db, bench, { label: "Life Fitness", existingLabel: "Hammer Strength" });
    addSet(db, bench);
    setsOf(db, mistaken, bench).forEach((set) => confirmSet(db, set.id, { load: 110, reps: 5 }));
    finishWorkout(db, mistaken, { now: 2_500 });

    switchStation(db, bench, hammer);

    const [entry] = ledger(db, mistaken).exercises;
    expect(entry?.station?.label).toBe("Hammer Strength");
    expect(entry?.sets.map(({ load, done }) => ({ load, done }))).toEqual([
      { load: 110, done: true },
      { load: 110, done: true },
    ]);
    const next = startWorkout(db, { gymId, timeZone: TIME_ZONE, now: 3_000 });
    const nextBench = addWorkoutExercise(db, next, benchPress.id);
    expect(ledger(db, next).exercises[0]?.station?.id).toBe(hammer);
    expect(setsOf(db, next, nextBench)[0]?.lastHere).toEqual({ load: 110, reps: 5, rir: null });
  });

  test("Exercise changes record nothing for write-back, which happened at finish", async () => {
    const db = await libraryDatabase();
    const gymId = createGym(db, "Downtown Iron");
    const routineId = createRoutine(db, "Upper A");
    addRoutineExercise(db, routineId, benchPress.id);
    addRoutineExercise(db, routineId, pullUp.id);
    const workoutId = startWorkout(db, { gymId, timeZone: TIME_ZONE, routineId, now: 1_000 });
    for (const entry of ledger(db, workoutId).exercises) {
      confirmSet(db, entry.sets[0]!.id, { load: 0, reps: 5 });
    }
    finishWorkout(db, workoutId, { now: 2_000 });
    const [bench, pull] = ledger(db, workoutId).exercises.map((entry) => entry.id);

    moveWorkoutExercise(db, pull!, 0);
    removeWorkoutExercise(db, bench!);
    addWorkoutExercise(db, workoutId, lateralRaise.id);

    expect(listWorkoutEdits(db, workoutId)).toEqual([]);
  });
});

describe("changing a past Workout's Gym", () => {
  test("lists the logged Exercises whose numbers would read in another unit", async () => {
    const db = await libraryDatabase();
    const downtown = createGym(db, "Downtown Iron");
    const garage = createGym(db, "Garage");
    logBench(db, garage, 1_000, [{ load: 100, reps: 5 }]);
    const workoutId = startWorkout(db, { gymId: downtown, timeZone: TIME_ZONE, now: 2_000 });
    const bench = addWorkoutExercise(db, workoutId, benchPress.id);
    const pull = addWorkoutExercise(db, workoutId, pullUp.id);
    confirmSet(db, setsOf(db, workoutId, bench)[0]!.id, { load: 100, reps: 5 });
    confirmSet(db, setsOf(db, workoutId, pull)[0]!.id, { load: 10, reps: 8 });
    finishWorkout(db, workoutId, { now: 3_000 });
    updateSettings(db, { defaultWeightUnit: "lb" });
    // Never logged, so it has no numbers to relabel.
    addWorkoutExercise(db, workoutId, lateralRaise.id);

    expect(listGymChangeRelabels(db, workoutId, garage, "en")).toEqual([
      { exerciseName: "Pull-Up", from: "kg", to: "lb" },
    ]);
  });

  test("lists nothing when every logged Exercise keeps its unit", async () => {
    const db = await libraryDatabase();
    const workoutId = logBench(db, createGym(db, "Downtown Iron"), 1_000, [{ load: 100, reps: 5 }]);

    expect(listGymChangeRelabels(db, workoutId, createGym(db, "Garage"), "en")).toEqual([]);
  });

  test("each Exercise moves to the Station last used for it there, its numbers as logged", async () => {
    const db = await libraryDatabase();
    const downtown = createGym(db, "Downtown Iron");
    const garage = createGym(db, "Garage");
    const benchStation = ledger(db, logBench(db, garage, 1_000, [{ load: 80, reps: 8 }]))
      .exercises[0]!.station!.id;
    const rackWorkout = startWorkout(db, { gymId: garage, timeZone: TIME_ZONE, now: 2_000 });
    const rackBench = addWorkoutExercise(db, rackWorkout, benchPress.id);
    addStation(db, rackBench, { label: "Rack", existingLabel: "Flat bench" });
    confirmSet(db, setsOf(db, rackWorkout, rackBench)[0]!.id, { load: 90, reps: 6 });
    finishWorkout(db, rackWorkout, { now: 2_500 });
    // The older Station is the one used last.
    const benchWorkout = logBench(db, garage, 3_000, [{ load: 80, reps: 8 }]);
    switchStation(db, ledger(db, benchWorkout).exercises[0]!.id, benchStation);
    const workoutId = logBench(db, downtown, 4_000, [{ load: 100, reps: 5, rir: 1 }]);

    changeWorkoutGym(db, workoutId, garage);

    const [entry] = ledger(db, workoutId).exercises;
    expect(entry?.station?.label).toBe("Flat bench");
    expect(entry?.sets.map(({ load, reps, rir, done }) => ({ load, reps, rir, done }))).toEqual([
      { load: 100, reps: 5, rir: 1, done: true },
    ]);
  });

  test("an Exercise the new Gym has no Station for gets one in the default unit", async () => {
    const db = await libraryDatabase();
    const downtown = createGym(db, "Downtown Iron");
    const garage = createGym(db, "Garage");
    const workoutId = logBench(db, downtown, 1_000, [{ load: 100, reps: 5 }]);
    updateSettings(db, { defaultWeightUnit: "lb" });

    changeWorkoutGym(db, workoutId, garage);

    const [entry] = ledger(db, workoutId).exercises;
    expect(entry?.unit).toBe("lb");
    expect(
      db
        .select()
        .from(station)
        .all()
        .map(({ gymId, unit }) => ({ gymId, unit })),
    ).toEqual([{ gymId: garage, unit: "lb" }]);
  });

  test("an old Station left empty goes, unless it has a label or notes", async () => {
    const db = await libraryDatabase();
    const downtown = createGym(db, "Downtown Iron");
    const garage = createGym(db, "Garage");
    const workoutId = startWorkout(db, { gymId: downtown, timeZone: TIME_ZONE, now: 1_000 });
    const bench = addWorkoutExercise(db, workoutId, benchPress.id);
    const pull = addWorkoutExercise(db, workoutId, pullUp.id);
    confirmSet(db, setsOf(db, workoutId, bench)[0]!.id, { load: 100, reps: 5 });
    const raise = addWorkoutExercise(db, workoutId, lateralRaise.id);
    confirmSet(db, setsOf(db, workoutId, bench)[0]!.id, { load: 100, reps: 5 });
    confirmSet(db, setsOf(db, workoutId, pull)[0]!.id, { load: 0, reps: 10 });
    setMachineNotes(db, pull, "Wide grip");
    addStation(db, raise, { label: "Rack" });
    confirmSet(db, setsOf(db, workoutId, raise)[0]!.id, { load: 10, reps: 12 });
    finishWorkout(db, workoutId, { now: 2_000 });

    changeWorkoutGym(db, workoutId, garage);

    const left = db
      .select()
      .from(station)
      .all()
      .filter((found) => found.gymId === downtown);
    expect(left.map(({ exerciseId, label, notes }) => ({ exerciseId, label, notes }))).toEqual([
      { exerciseId: pullUp.id, label: null, notes: "Wide grip" },
      { exerciseId: lateralRaise.id, label: "Rack", notes: null },
    ]);
  });
});

describe("editing a past Workout's times", () => {
  const NOW = Date.UTC(2026, 9, 15, 18, 0);
  const MINUTE = 60_000;

  function historyIds(db: Database) {
    return listHistory(db).flatMap((month) => month.workouts.map((found) => found.id));
  }

  test("a new start re-sorts History and keeps the duration", async () => {
    const db = await libraryDatabase();
    const gymId = createGym(db, "Downtown Iron");
    const earlier = logBench(db, gymId, Date.UTC(2026, 9, 10, 14, 0), [{ load: 100, reps: 5 }]);
    const later = logBench(db, gymId, Date.UTC(2026, 9, 12, 14, 0), [{ load: 100, reps: 5 }]);
    setWorkoutDuration(db, later, 70);

    // 8:30 in Mexico City, which keeps UTC-6 all year.
    setWorkoutStart(db, later, { year: 2026, month: 10, day: 9, hour: 8, minute: 30 }, NOW);

    const moved = ledger(db, later);
    expect(moved.startedAt).toBe(Date.UTC(2026, 9, 9, 14, 30));
    expect(moved.finishedAt).toBe(Date.UTC(2026, 9, 9, 14, 30) + 70 * MINUTE);
    expect(historyIds(db)).toEqual([earlier, later]);
  });

  test("the start is read in the Workout's own time zone, not the device's", async () => {
    const db = await libraryDatabase();
    const gymId = createGym(db, "Downtown Iron");
    const workoutId = startWorkout(db, {
      gymId,
      timeZone: "America/New_York",
      now: Date.UTC(2026, 6, 1, 12, 0),
    });
    confirmSet(db, setsOf(db, workoutId, addWorkoutExercise(db, workoutId, benchPress.id))[0]!.id, {
      load: 100,
      reps: 5,
    });
    finishWorkout(db, workoutId, { now: Date.UTC(2026, 6, 1, 13, 0) });

    // New York is on daylight time, UTC-4, in July but standard time, UTC-5, in January.
    setWorkoutStart(db, workoutId, { year: 2026, month: 7, day: 2, hour: 9, minute: 0 }, NOW);
    expect(ledger(db, workoutId).startedAt).toBe(Date.UTC(2026, 6, 2, 13, 0));
    setWorkoutStart(db, workoutId, { year: 2026, month: 1, day: 2, hour: 9, minute: 0 }, NOW);
    expect(ledger(db, workoutId).startedAt).toBe(Date.UTC(2026, 0, 2, 14, 0));
  });

  test("a start in the future is refused", async () => {
    const db = await libraryDatabase();
    const gymId = createGym(db, "Downtown Iron");
    const workoutId = logBench(db, gymId, Date.UTC(2026, 9, 10, 14, 0), [{ load: 100, reps: 5 }]);

    // NOW reads 12:00 in Mexico City.
    expect(() =>
      setWorkoutStart(db, workoutId, { year: 2026, month: 10, day: 15, hour: 12, minute: 1 }, NOW),
    ).toThrow();
    expect(ledger(db, workoutId).startedAt).toBe(Date.UTC(2026, 9, 10, 14, 0));
    setWorkoutStart(db, workoutId, { year: 2026, month: 10, day: 15, hour: 12, minute: 0 }, NOW);
    expect(ledger(db, workoutId).startedAt).toBe(NOW);
  });

  test("overlapping another Workout is allowed", async () => {
    const db = await libraryDatabase();
    const gymId = createGym(db, "Downtown Iron");
    const first = logBench(db, gymId, Date.UTC(2026, 9, 10, 14, 0), [{ load: 100, reps: 5 }]);
    const second = logBench(db, gymId, Date.UTC(2026, 9, 11, 14, 0), [{ load: 100, reps: 5 }]);

    setWorkoutStart(db, second, { year: 2026, month: 10, day: 10, hour: 8, minute: 0 }, NOW);

    expect(ledger(db, second).startedAt).toBe(ledger(db, first).startedAt);
    expect(historyIds(db)).toHaveLength(2);
  });

  test("a duration must be a positive number of minutes", async () => {
    const db = await libraryDatabase();
    const gymId = createGym(db, "Downtown Iron");
    const start = Date.UTC(2026, 9, 10, 14, 0);
    const workoutId = logBench(db, gymId, start, [{ load: 100, reps: 5 }]);

    expect(() => setWorkoutDuration(db, workoutId, 0)).toThrow();
    setWorkoutDuration(db, workoutId, 95);
    expect(ledger(db, workoutId).finishedAt).toBe(start + 95 * MINUTE);
  });
});

describe("saveWorkoutAsRoutine", () => {
  test("copies the Exercises, their order and Working-set counts, with other Targets blank", async () => {
    const { db, workoutId } = await startedWorkout();
    createRoutine(db, "Lower");
    const bench = addWorkoutExercise(db, workoutId, benchPress.id);
    addSet(db, bench);
    addSet(db, bench);
    const raise = addWorkoutExercise(db, workoutId, lateralRaise.id);
    const pull = addWorkoutExercise(db, workoutId, pullUp.id);
    addSet(db, pull);
    moveWorkoutExercise(db, pull, 0);
    const [warmup, ...working] = setsOf(db, workoutId, bench);
    toggleSetKind(db, warmup!.id);
    for (const set of [warmup!, ...working]) confirmSet(db, set.id, { load: 100, reps: 5 });
    const [raiseWarmup] = setsOf(db, workoutId, raise);
    toggleSetKind(db, raiseWarmup!.id);
    confirmSet(db, raiseWarmup!.id, { load: 5, reps: 15 });
    for (const set of setsOf(db, workoutId, pull)) confirmSet(db, set.id, { reps: 8 });
    finishWorkout(db, workoutId);

    const routineId = saveWorkoutAsRoutine(db, workoutId, " Improvised push ");

    const blank = { warmups: 0, repMin: null, repMax: null, rirMin: null, rirMax: null };
    expect(getRoutine(db, routineId, "en")).toEqual({
      id: routineId,
      name: "Improvised push",
      exercises: [
        {
          id: expect.any(String),
          exercise: { id: pullUp.id, name: "Pull-Up" },
          ...blank,
          sets: 2,
          restSeconds: null,
        },
        {
          id: expect.any(String),
          exercise: { id: benchPress.id, name: "Barbell Bench Press" },
          ...blank,
          sets: 2,
          restSeconds: null,
        },
        {
          id: expect.any(String),
          exercise: { id: lateralRaise.id, name: "Dumbbell Lateral Raise" },
          ...blank,
          // Only warm-ups were logged, so no set count is planned.
          sets: null,
          restSeconds: null,
        },
      ],
    });
    // It joins the Workout tab after the Routines already there.
    expect(listRoutines(db).map((routine) => routine.name)).toEqual(["Lower", "Improvised push"]);
  });

  test("at finish, saves only what the finished Workout keeps", async () => {
    const { db, workoutId } = await startedWorkout();
    const bench = addWorkoutExercise(db, workoutId, benchPress.id);
    addWorkoutExercise(db, workoutId, pullUp.id);
    confirmSet(db, setsOf(db, workoutId, bench)[0]!.id, { load: 100, reps: 5 });

    const routineId = finishWorkout(db, workoutId, { saveAsRoutine: "Bench day" })!;

    expect(currentWorkout(db)).toBeUndefined();
    expect(getRoutine(db, routineId, "en")).toEqual({
      id: routineId,
      name: "Bench day",
      exercises: [
        {
          id: expect.any(String),
          exercise: { id: benchPress.id, name: "Barbell Bench Press" },
          warmups: 0,
          sets: 1,
          repMin: null,
          repMax: null,
          rirMin: null,
          rirMax: null,
          restSeconds: null,
        },
      ],
    });
  });
});
