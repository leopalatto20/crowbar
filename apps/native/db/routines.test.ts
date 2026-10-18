import { describe, expect, test } from "bun:test";

import type { BuiltInExercise } from "./built-in-exercises";
import type { Database } from "./database";
import { seedBuiltInExercises } from "./exercises";
import {
  addRoutineExercise,
  createRoutine,
  deleteRoutine,
  discardBlankRoutine,
  duplicateRoutine,
  getRoutine,
  listRoutines,
  removeRoutineExercise,
  renameRoutine,
  reorderRoutineExercises,
  reorderRoutines,
  routineExerciseCount,
  swapRoutineExercise,
  updateRoutineExercise,
} from "./routines";
import { createGym } from "./gyms";
import { seedSettings } from "./settings";
import { createTestDatabase } from "./test-database";
import { addWorkoutExercise, confirmSet, finishWorkout, getLedger, startWorkout } from "./workouts";

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

async function libraryDatabase() {
  const db = await createTestDatabase();
  seedBuiltInExercises(db, [benchPress, pullUp, lateralRaise]);
  return db;
}

function exerciseIds(db: Database, routineId: string) {
  return getRoutine(db, routineId, "en")?.exercises.map((entry) => entry.exercise.id);
}

describe("createRoutine", () => {
  test("adds the Routine at the end of the manual order", async () => {
    const db = await createTestDatabase();

    const upper = createRoutine(db, "Upper A");
    const lower = createRoutine(db, "Lower A");

    expect(listRoutines(db)).toEqual([
      { id: upper, name: "Upper A", lastRun: null },
      { id: lower, name: "Lower A", lastRun: null },
    ]);
  });
});

describe("renameRoutine", () => {
  test("renames only that Routine, trimming the name", async () => {
    const db = await createTestDatabase();
    const upper = createRoutine(db, "Upper A");
    const lower = createRoutine(db, "Lower A");

    renameRoutine(db, upper, "  Push  ");

    expect(listRoutines(db)).toEqual([
      { id: upper, name: "Push", lastRun: null },
      { id: lower, name: "Lower A", lastRun: null },
    ]);
  });
});

describe("addRoutineExercise", () => {
  test("adds the Exercise last, at 3 × 8–12 @ RIR 1–2, 2:00 rest and no warm-ups", async () => {
    const db = await libraryDatabase();
    const upper = createRoutine(db, "Upper A");

    addRoutineExercise(db, upper, "pull-up");
    const added = addRoutineExercise(db, upper, "barbell-bench-press");

    expect(getRoutine(db, upper, "es")).toEqual({
      id: upper,
      name: "Upper A",
      exercises: [
        expect.objectContaining({ exercise: { id: "pull-up", name: "Dominada" } }),
        {
          id: added,
          exercise: { id: "barbell-bench-press", name: "Press de banca con barra" },
          warmups: 0,
          sets: 3,
          repMin: 8,
          repMax: 12,
          rirMin: 1,
          rirMax: 2,
          restSeconds: 120,
        },
      ],
    });
  });
});

describe("updateRoutineExercise", () => {
  test("changes only the Targets given, on only that Routine Exercise", async () => {
    const db = await libraryDatabase();
    const upper = createRoutine(db, "Upper A");
    const bench = addRoutineExercise(db, upper, "barbell-bench-press");
    addRoutineExercise(db, upper, "pull-up");

    updateRoutineExercise(db, bench, { warmups: 2, repMin: 5, repMax: 7 });
    updateRoutineExercise(db, bench, { rirMin: 0, rirMax: 1, restSeconds: 180 });

    expect(getRoutine(db, upper, "en")?.exercises).toEqual([
      expect.objectContaining({
        warmups: 2,
        sets: 3,
        repMin: 5,
        repMax: 7,
        rirMin: 0,
        rirMax: 1,
        restSeconds: 180,
      }),
      expect.objectContaining({ warmups: 0, sets: 3, repMin: 8, repMax: 12, restSeconds: 120 }),
    ]);
  });

  test("a Target can be left blank", async () => {
    const db = await libraryDatabase();
    const upper = createRoutine(db, "Upper A");
    const bench = addRoutineExercise(db, upper, "barbell-bench-press");

    updateRoutineExercise(db, bench, { sets: null, repMin: null, repMax: null, restSeconds: null });

    expect(getRoutine(db, upper, "en")?.exercises[0]).toMatchObject({
      sets: null,
      repMin: null,
      repMax: null,
      rirMin: 1,
      rirMax: 2,
      restSeconds: null,
    });
  });

  test("a rep range that ends below where it starts is refused", async () => {
    const db = await libraryDatabase();
    const bench = addRoutineExercise(db, createRoutine(db, "Upper A"), "barbell-bench-press");

    expect(() => updateRoutineExercise(db, bench, { repMin: 10, repMax: 6 })).toThrow();
  });
});

describe("reorderRoutineExercises", () => {
  test("keeps the order the lifter dragged into", async () => {
    const db = await libraryDatabase();
    const upper = createRoutine(db, "Upper A");
    const bench = addRoutineExercise(db, upper, "barbell-bench-press");
    const pull = addRoutineExercise(db, upper, "pull-up");
    const raise = addRoutineExercise(db, upper, "dumbbell-lateral-raise");

    reorderRoutineExercises(db, [raise, bench, pull]);

    expect(exerciseIds(db, upper)).toEqual([
      "dumbbell-lateral-raise",
      "barbell-bench-press",
      "pull-up",
    ]);
  });

  test("an Exercise added after reordering goes last", async () => {
    const db = await libraryDatabase();
    const upper = createRoutine(db, "Upper A");
    const bench = addRoutineExercise(db, upper, "barbell-bench-press");
    const pull = addRoutineExercise(db, upper, "pull-up");
    reorderRoutineExercises(db, [pull, bench]);

    addRoutineExercise(db, upper, "dumbbell-lateral-raise");

    expect(exerciseIds(db, upper)).toEqual([
      "pull-up",
      "barbell-bench-press",
      "dumbbell-lateral-raise",
    ]);
  });
});

describe("removeRoutineExercise", () => {
  test("takes the Exercise out of the Routine and keeps the rest in order", async () => {
    const db = await libraryDatabase();
    const upper = createRoutine(db, "Upper A");
    addRoutineExercise(db, upper, "barbell-bench-press");
    const pull = addRoutineExercise(db, upper, "pull-up");
    addRoutineExercise(db, upper, "dumbbell-lateral-raise");

    removeRoutineExercise(db, pull);

    expect(exerciseIds(db, upper)).toEqual(["barbell-bench-press", "dumbbell-lateral-raise"]);
  });
});

describe("swapRoutineExercise", () => {
  test("puts another Exercise in the slot, keeping its place and Targets", async () => {
    const db = await libraryDatabase();
    const upper = createRoutine(db, "Upper A");
    const bench = addRoutineExercise(db, upper, "barbell-bench-press");
    addRoutineExercise(db, upper, "pull-up");
    updateRoutineExercise(db, bench, {
      warmups: 2,
      sets: 4,
      repMin: 5,
      repMax: 7,
      restSeconds: 180,
    });

    swapRoutineExercise(db, bench, "dumbbell-lateral-raise");

    expect(exerciseIds(db, upper)).toEqual(["dumbbell-lateral-raise", "pull-up"]);
    expect(getRoutine(db, upper, "en")?.exercises[0]).toEqual(
      expect.objectContaining({
        id: bench,
        warmups: 2,
        sets: 4,
        repMin: 5,
        repMax: 7,
        restSeconds: 180,
      }),
    );
  });
});

describe("reorderRoutines", () => {
  test("keeps the manual order the lifter dragged into, and new Routines go last", async () => {
    const db = await createTestDatabase();
    const upper = createRoutine(db, "Upper A");
    const lower = createRoutine(db, "Lower A");
    const arms = createRoutine(db, "Arms");

    reorderRoutines(db, [arms, upper, lower]);
    createRoutine(db, "Upper B");

    expect(listRoutines(db).map((listing) => listing.name)).toEqual([
      "Arms",
      "Upper A",
      "Lower A",
      "Upper B",
    ]);
  });
});

describe("deleteRoutine", () => {
  test("removes the Routine with its Exercises, leaving other Routines alone", async () => {
    const db = await libraryDatabase();
    const upper = createRoutine(db, "Upper A");
    const lower = createRoutine(db, "Lower A");
    addRoutineExercise(db, upper, "barbell-bench-press");
    addRoutineExercise(db, lower, "pull-up");

    deleteRoutine(db, upper);

    expect(listRoutines(db)).toEqual([{ id: lower, name: "Lower A", lastRun: null }]);
    expect(getRoutine(db, upper, "en")).toBeUndefined();
    expect(exerciseIds(db, lower)).toEqual(["pull-up"]);
  });
});

describe("routineExerciseCount", () => {
  test("counts the Exercises deleting the Routine takes with it, none for an empty one", async () => {
    const db = await libraryDatabase();
    const upper = createRoutine(db, "Upper A");
    const lower = createRoutine(db, "Lower A");
    addRoutineExercise(db, lower, "pull-up");

    expect(routineExerciseCount(db, upper)).toBe(0);
    expect(routineExerciseCount(db, lower)).toBe(1);
  });
});

describe("duplicateRoutine", () => {
  test("copies the Exercises and Targets in order, right after the original", async () => {
    const db = await libraryDatabase();
    const upper = createRoutine(db, "Upper A");
    const lower = createRoutine(db, "Lower A");
    const bench = addRoutineExercise(db, upper, "barbell-bench-press");
    addRoutineExercise(db, upper, "pull-up");
    updateRoutineExercise(db, bench, {
      warmups: 2,
      sets: 4,
      repMin: 5,
      repMax: 7,
      restSeconds: null,
    });

    const copy = duplicateRoutine(db, upper, "Upper A copy");

    expect(listRoutines(db)).toEqual([
      { id: upper, name: "Upper A", lastRun: null },
      { id: copy, name: "Upper A copy", lastRun: null },
      { id: lower, name: "Lower A", lastRun: null },
    ]);
    expect(getRoutine(db, copy, "en")?.exercises).toEqual([
      expect.objectContaining({
        exercise: { id: "barbell-bench-press", name: "Barbell Bench Press" },
        warmups: 2,
        sets: 4,
        repMin: 5,
        repMax: 7,
        rirMin: 1,
        rirMax: 2,
        restSeconds: null,
      }),
      expect.objectContaining({ exercise: { id: "pull-up", name: "Pull-Up" }, sets: 3 }),
    ]);
  });

  test("the copy is edited independently of the original", async () => {
    const db = await libraryDatabase();
    const upper = createRoutine(db, "Upper A");
    addRoutineExercise(db, upper, "barbell-bench-press");
    const copy = duplicateRoutine(db, upper, "Upper A copy");

    const [copiedBench] = getRoutine(db, copy, "en")!.exercises;
    updateRoutineExercise(db, copiedBench!.id, { sets: 5 });

    expect(getRoutine(db, upper, "en")?.exercises[0]?.sets).toBe(3);
  });
});

describe("discardBlankRoutine", () => {
  test("deletes a Routine left with no name and no Exercises", async () => {
    const db = await createTestDatabase();
    const blank = createRoutine(db, "  ");

    discardBlankRoutine(db, blank);

    expect(listRoutines(db)).toEqual([]);
  });

  test("keeps a Routine with a name or with Exercises", async () => {
    const db = await libraryDatabase();
    const named = createRoutine(db, "Upper A");
    const unnamed = createRoutine(db, "");
    addRoutineExercise(db, unnamed, "pull-up");

    discardBlankRoutine(db, named);
    discardBlankRoutine(db, unnamed);

    expect(listRoutines(db).map((listing) => listing.id)).toEqual([named, unnamed]);
  });
});

describe("last run", () => {
  const TIME_ZONE = "America/Mexico_City";

  function run(db: Database, gymId: string, routineId: string | undefined, now: number) {
    const workoutId = startWorkout(db, { gymId, timeZone: TIME_ZONE, routineId, now });
    const entry = addWorkoutExercise(db, workoutId, benchPress.id);
    const set = getLedger(db, workoutId, "en")?.exercises.find((e) => e.id === entry)?.sets[0];
    confirmSet(db, set!.id, { load: 100, reps: 5 });
    return workoutId;
  }

  test("shows when and at which Gym each Routine's latest Workout started", async () => {
    const db = await libraryDatabase();
    seedSettings(db, "MX");
    const downtown = createGym(db, "Downtown Iron");
    const garage = createGym(db, "Garage");
    const upper = createRoutine(db, "Upper A");
    const lower = createRoutine(db, "Lower A");
    finishWorkout(db, run(db, downtown, upper, 1_000), { now: 1_500 });
    finishWorkout(db, run(db, garage, upper, 2_000), { now: 2_500 });
    // An empty Workout and one still in progress don't count as runs of a Routine.
    finishWorkout(db, run(db, downtown, undefined, 3_000), { now: 3_500 });
    run(db, downtown, upper, 4_000);

    expect(listRoutines(db)).toEqual([
      { id: upper, name: "Upper A", lastRun: { startedAt: 2_000, gymName: "Garage" } },
      { id: lower, name: "Lower A", lastRun: null },
    ]);
  });
});
