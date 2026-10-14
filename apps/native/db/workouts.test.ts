import { describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { BuiltInExercise } from "./built-in-exercises";
import { seedBuiltInExercises } from "./exercises";
import { createGym, lastUsedGym } from "./gyms";
import type { Database } from "./database";
import { seedSettings, updateSettings } from "./settings";
import { createTestDatabase } from "./test-database";
import { parseDecimal } from "@/lib/i18n/locale";

import {
  addSet,
  addWorkoutExercise,
  confirmSet,
  currentWorkoutId,
  discardWorkout,
  finishWorkout,
  getLedger,
  reopenSet,
  startWorkout,
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
  seedBuiltInExercises(db, [benchPress, pullUp, lateralRaise]);
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

    expect(currentWorkoutId(db)).toBe(id);
    expect(getLedger(db, id, "en")).toEqual({
      id,
      gymName: "Downtown Iron",
      startedAt: 1_000,
      finishedAt: null,
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
    expect(currentWorkoutId(db)).toBe(workoutId);
  });

  test("a new Workout starts once the last one is finished", async () => {
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
    expect(currentWorkoutId(db)).toBe(third);
  });
});

describe("resuming after the app is killed", () => {
  test("a relaunch finds the Workout in progress with every committed field", async () => {
    const path = join(mkdtempSync(join(tmpdir(), "crowbar-")), "crowbar.db");
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

    expect(currentWorkoutId(relaunched)).toBe(workoutId);
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
        exercise: { id: benchPress.id, name: "Barbell Bench Press" },
        unit: "kg",
        sets: [
          {
            id: expect.any(String),
            kind: "working",
            load: null,
            reps: null,
            rir: null,
            done: false,
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

describe("updateSet", () => {
  test("writes each committed field through", async () => {
    const { db, workoutId, workoutExerciseId } = await benchInWorkout();
    const [set] = setsOf(db, workoutId, workoutExerciseId);
    updateSet(db, set!.id, { load: 100 });
    updateSet(db, set!.id, { reps: 5, rir: 2 });
    expect(setsOf(db, workoutId, workoutExerciseId)).toEqual([
      { id: set!.id, kind: "working", load: 100, reps: 5, rir: 2, done: false },
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

    finishWorkout(db, workoutId, 5_000);

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
    expect(currentWorkoutId(db)).toBeUndefined();
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

describe("discardWorkout", () => {
  test("removes the Workout and everything logged in it", async () => {
    const { db, workoutId, workoutExerciseId } = await benchInWorkout();
    confirmSet(db, setsOf(db, workoutId, workoutExerciseId)[0]!.id, { load: 100, reps: 5 });
    discardWorkout(db, workoutId);
    expect(getLedger(db, workoutId, "en")).toBeUndefined();
    expect(currentWorkoutId(db)).toBeUndefined();
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
    discardWorkout(db, discarded);
    updateSettings(db, { defaultWeightUnit: "kg" });

    const next = startWorkout(db, { gymId, timeZone: TIME_ZONE });
    addWorkoutExercise(db, next, benchPress.id);
    addWorkoutExercise(db, next, lateralRaise.id);
    expect(ledger(db, next).exercises.map((entry) => entry.unit)).toEqual(["lb", "kg"]);
  });
});
