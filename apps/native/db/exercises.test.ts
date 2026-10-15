import { describe, expect, test } from "bun:test";
import { BUILT_IN_EXERCISES, type BuiltInExercise } from "./built-in-exercises";
import {
  createCustomExercise,
  deleteCustomExercise,
  editCustomExercise,
  exerciseHistoryCounts,
  exerciseNamed,
  getCustomExercise,
  hideExercise,
  listExercises,
  searchExercises,
  seedBuiltInExercises,
  unhideExercise,
} from "./exercises";
import { createGym } from "./gyms";
import { addRoutineExercise, createRoutine, getRoutine } from "./routines";
import type { Database } from "./database";
import { seedSettings } from "./settings";
import { createTestDatabase } from "./test-database";
import {
  addSet,
  addWorkoutExercise,
  confirmSet,
  currentWorkout,
  deleteWorkout,
  finishWorkout,
  getLedger,
  setMachineNotes,
  startWorkout,
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

const legExtension: BuiltInExercise = {
  id: "machine-leg-extension",
  name: { en: "Machine Leg Extension", es: "Extensión de cuádriceps en máquina" },
  equipmentType: "machine",
  loadType: "external",
  unilateral: false,
  muscleGroup: "quads",
};

const TIME_ZONE = "America/Mexico_City";

async function trainingDatabase() {
  const db = await createTestDatabase();
  seedSettings(db, "MX");
  seedBuiltInExercises(db, [benchPress, pullUp]);
  return { db, gymId: createGym(db, "Downtown Iron") };
}

// Starts a Workout with one entry per Exercise, confirming `logged` of each entry's `sets` sets.
function logWorkout(
  db: Database,
  gymId: string,
  now: number,
  entries: { exerciseId: string; sets: number; logged: number }[],
) {
  const workoutId = startWorkout(db, { gymId, timeZone: TIME_ZONE, now });
  for (const { exerciseId, sets, logged } of entries) {
    const entry = addWorkoutExercise(db, workoutId, exerciseId);
    for (let i = 1; i < sets; i++) addSet(db, entry);
    const added = getLedger(db, workoutId, "en")!.exercises.find(({ id }) => id === entry)!;
    for (const set of added.sets.slice(0, logged)) confirmSet(db, set.id, { load: 50, reps: 10 });
  }
  return workoutId;
}

function logFinishedWorkout(
  db: Database,
  gymId: string,
  now: number,
  entries: { exerciseId: string; sets: number }[],
) {
  const workoutId = logWorkout(
    db,
    gymId,
    now,
    entries.map((entry) => ({ ...entry, logged: entry.sets })),
  );
  finishWorkout(db, workoutId, { now: now + 500 });
  return workoutId;
}

describe("listExercises", () => {
  test("lists Built-in Exercises with their Muscle group, in name order", async () => {
    const db = await createTestDatabase();
    seedBuiltInExercises(db, [pullUp, benchPress]);

    expect(listExercises(db, "en")).toEqual([
      {
        id: "barbell-bench-press",
        name: "Barbell Bench Press",
        muscleGroup: "chest",
        hidden: false,
        builtIn: true,
        names: ["Barbell Bench Press", "Press de banca con barra"],
      },
      {
        id: "pull-up",
        name: "Pull-Up",
        muscleGroup: "lats",
        hidden: false,
        builtIn: true,
        names: ["Pull-Up", "Dominada"],
      },
    ]);
  });

  test("names Built-in Exercises in Spanish, in Spanish name order", async () => {
    const db = await createTestDatabase();
    seedBuiltInExercises(db, [benchPress, pullUp]);

    expect(listExercises(db, "es").map((listing) => listing.name)).toEqual([
      "Dominada",
      "Press de banca con barra",
    ]);
  });

  test("marks Hidden Exercises", async () => {
    const db = await createTestDatabase();
    seedBuiltInExercises(db, [benchPress, pullUp]);
    hideExercise(db, "pull-up");

    expect(listExercises(db, "en").map(({ id, hidden }) => [id, hidden])).toEqual([
      ["barbell-bench-press", false],
      ["pull-up", true],
    ]);
  });
});

describe("createCustomExercise", () => {
  test("needs only a name, defaulting to Other, External, bilateral and no Muscle group", async () => {
    const db = await createTestDatabase();

    const created = createCustomExercise(db, { name: "Pendlay Row" });

    expect(created).toMatchObject({ name: "Pendlay Row", muscleGroup: null, hidden: false });
    expect(created.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(getCustomExercise(db, created.id)).toMatchObject({
      equipmentType: "other",
      loadType: "external",
      unilateral: false,
    });
  });
});

describe("editCustomExercise", () => {
  test("renames it and changes its Muscle group", async () => {
    const db = await createTestDatabase();
    const { id } = createCustomExercise(db, { name: "Pendlay Row" });

    editCustomExercise(db, id, { name: "  Pendlay Barbell Row ", muscleGroup: "upperBack" });

    expect(listExercises(db, "en")).toMatchObject([
      { id, name: "Pendlay Barbell Row", muscleGroup: "upperBack" },
    ]);
    expect(getCustomExercise(db, id)).toMatchObject({
      name: "Pendlay Barbell Row",
      muscleGroup: "upperBack",
    });
  });
});

describe("Custom Exercise locks", () => {
  test("Equipment type, load type and unilateral stay editable until a set is logged", async () => {
    const { db, gymId } = await trainingDatabase();
    const { id } = createCustomExercise(db, { name: "Ring Dip" });
    // Only a confirmed set is history; one waiting in the Ledger locks nothing.
    logWorkout(db, gymId, 1_000, [{ exerciseId: id, sets: 1, logged: 0 }]);

    expect(getCustomExercise(db, id)?.locked).toBe(false);
    editCustomExercise(db, id, {
      equipmentType: "bodyweight",
      loadType: "bodyweight",
      unilateral: true,
    });

    expect(getCustomExercise(db, id)).toMatchObject({
      equipmentType: "bodyweight",
      loadType: "bodyweight",
      unilateral: true,
    });
  });

  test("once a set is logged, they can't change, while name and Muscle group still can", async () => {
    const { db, gymId } = await trainingDatabase();
    const { id } = createCustomExercise(db, { name: "Ring Dip", loadType: "bodyweight" });
    logFinishedWorkout(db, gymId, 1_000, [{ exerciseId: id, sets: 1 }]);

    expect(getCustomExercise(db, id)?.locked).toBe(true);
    expect(() => editCustomExercise(db, id, { equipmentType: "bodyweight" })).toThrow("locked");
    expect(() => editCustomExercise(db, id, { loadType: "external" })).toThrow("locked");
    expect(() => editCustomExercise(db, id, { unilateral: true })).toThrow("locked");
    // Saving the whole form again leaves the locked fields as they were, which is no change.
    editCustomExercise(db, id, {
      name: "Weighted Ring Dip",
      equipmentType: "other",
      loadType: "bodyweight",
      unilateral: false,
      muscleGroup: "triceps",
    });

    expect(getCustomExercise(db, id)).toEqual({
      id,
      name: "Weighted Ring Dip",
      equipmentType: "other",
      loadType: "bodyweight",
      unilateral: false,
      muscleGroup: "triceps",
      locked: true,
    });
  });
});

describe("deleteCustomExercise", () => {
  test("with no logged sets, removes the Exercise from the library and its Routines", async () => {
    const { db } = await trainingDatabase();
    const { id } = createCustomExercise(db, { name: "Ring Dip" });
    const routineId = createRoutine(db, "Push");
    addRoutineExercise(db, routineId, "barbell-bench-press");
    addRoutineExercise(db, routineId, id);

    expect(exerciseHistoryCounts(db, id)).toEqual({ stations: 0, workouts: 0, sets: 0 });
    deleteCustomExercise(db, id);

    expect(listExercises(db, "en").map((listing) => listing.id)).toEqual([
      "barbell-bench-press",
      "pull-up",
    ]);
    expect(getRoutine(db, routineId, "en")?.exercises.map(({ exercise }) => exercise.id)).toEqual([
      "barbell-bench-press",
    ]);
  });
});

describe("deleteCustomExercise with history", () => {
  async function ringDipHistory() {
    const { db, gymId: downtown } = await trainingDatabase();
    const garage = createGym(db, "Garage");
    const { id } = createCustomExercise(db, { name: "Ring Dip" });
    const shared = logFinishedWorkout(db, downtown, 1_000, [
      { exerciseId: id, sets: 2 },
      { exerciseId: "barbell-bench-press", sets: 1 },
    ]);
    const onlyRingDips = logFinishedWorkout(db, downtown, 2_000, [{ exerciseId: id, sets: 3 }]);
    const atGarage = logFinishedWorkout(db, garage, 3_000, [{ exerciseId: id, sets: 1 }]);
    const inProgress = logWorkout(db, downtown, 4_000, [
      { exerciseId: id, sets: 2, logged: 1 },
      { exerciseId: "barbell-bench-press", sets: 1, logged: 0 },
    ]);
    return { db, id, shared, onlyRingDips, atGarage, inProgress };
  }

  test("counts its Stations, its logged sets and the Workouts they were logged in", async () => {
    const { db, id } = await ringDipHistory();

    expect(exerciseHistoryCounts(db, id)).toEqual({ stations: 2, workouts: 4, sets: 7 });
  });

  test("counts a Station kept for its machine notes, though it has no sets", async () => {
    const { db, gymId } = await trainingDatabase();
    const { id } = createCustomExercise(db, { name: "Ring Dip" });
    const workoutId = startWorkout(db, { gymId, timeZone: TIME_ZONE, now: 1_000 });
    setMachineNotes(db, addWorkoutExercise(db, workoutId, id), "Rings at notch 4");
    deleteWorkout(db, workoutId);

    expect(exerciseHistoryCounts(db, id)).toEqual({ stations: 1, workouts: 0, sets: 0 });
  });

  test("removes its sets everywhere, and the Workouts left with none", async () => {
    const { db, id, shared, onlyRingDips, atGarage, inProgress } = await ringDipHistory();

    deleteCustomExercise(db, id);

    expect(exerciseHistoryCounts(db, id)).toEqual({ stations: 0, workouts: 0, sets: 0 });
    expect(getLedger(db, shared, "en")?.exercises).toMatchObject([
      { exercise: { id: "barbell-bench-press" }, sets: [{ load: 50, reps: 10, done: true }] },
    ]);
    expect(getLedger(db, onlyRingDips, "en")).toBeUndefined();
    expect(getLedger(db, atGarage, "en")).toBeUndefined();
    // The Workout in progress carries on with what's left, as finishing would drop it if empty.
    expect(currentWorkout(db)?.id).toBe(inProgress);
    expect(getLedger(db, inProgress, "en")?.exercises).toMatchObject([
      { exercise: { id: "barbell-bench-press" }, sets: [{ done: false }] },
    ]);
  });
});

describe("Built-in Exercises", () => {
  test("can't be edited", async () => {
    const db = await createTestDatabase();
    seedBuiltInExercises(db, [pullUp]);

    expect(getCustomExercise(db, "pull-up")).toBeUndefined();
    expect(() => editCustomExercise(db, "pull-up", { muscleGroup: "biceps" })).toThrow(
      "only be hidden",
    );
    expect(listExercises(db, "en")[0]?.muscleGroup).toBe("lats");
  });

  test("can't be deleted", async () => {
    const db = await createTestDatabase();
    seedBuiltInExercises(db, [pullUp]);

    expect(() => deleteCustomExercise(db, "pull-up")).toThrow("only be hidden");
    expect(listExercises(db, "en").map((listing) => listing.id)).toEqual(["pull-up"]);
  });
});

describe("editCustomExercise names", () => {
  test("a name taken by another Exercise, Hidden or in another language, is refused", async () => {
    const db = await createTestDatabase();
    seedBuiltInExercises(db, [pullUp]);
    hideExercise(db, "pull-up");
    const { id } = createCustomExercise(db, { name: "Pendlay Row" });

    expect(() => editCustomExercise(db, id, { name: "PULL-UP" })).toThrow("already taken");
    expect(() => editCustomExercise(db, id, { name: "dominada" })).toThrow("already taken");
    expect(getCustomExercise(db, id)?.name).toBe("Pendlay Row");
  });

  test("its own name in another case is free", async () => {
    const db = await createTestDatabase();
    const { id } = createCustomExercise(db, { name: "Pendlay row" });

    editCustomExercise(db, id, { name: "Pendlay Row" });

    expect(getCustomExercise(db, id)?.name).toBe("Pendlay Row");
  });

  test("a blank name is refused", async () => {
    const db = await createTestDatabase();
    const { id } = createCustomExercise(db, { name: "Pendlay Row" });

    expect(() => editCustomExercise(db, id, { name: "  " })).toThrow("needs a name");
  });
});

describe("exerciseNamed", () => {
  test("finds the Exercise with exactly this name in any case, Hidden ones included", async () => {
    const db = await createTestDatabase();
    seedBuiltInExercises(db, [benchPress, pullUp]);
    hideExercise(db, "pull-up");
    const exercises = listExercises(db, "en");

    expect(exerciseNamed(exercises, " barbell bench PRESS ")?.id).toBe("barbell-bench-press");
    expect(exerciseNamed(exercises, "pull-up")).toMatchObject({ id: "pull-up", hidden: true });
  });

  test("finds a Built-in Exercise by its name in another language", async () => {
    const db = await createTestDatabase();
    seedBuiltInExercises(db, [pullUp]);

    expect(exerciseNamed(listExercises(db, "en"), "dominada")?.name).toBe("Pull-Up");
  });

  test("a partial name is no match", async () => {
    const db = await createTestDatabase();
    seedBuiltInExercises(db, [benchPress]);

    expect(exerciseNamed(listExercises(db, "en"), "Bench Press")).toBeUndefined();
  });
});

describe("hideExercise", () => {
  test("takes the Exercise out of search", async () => {
    const db = await createTestDatabase();
    seedBuiltInExercises(db, [benchPress, pullUp]);

    hideExercise(db, "pull-up");

    expect(searchExercises(listExercises(db, "en"), "").map((listing) => listing.id)).toEqual([
      "barbell-bench-press",
    ]);
  });

  test("leaves the Exercise in its Routines, which still run it, and keeps its history", async () => {
    const { db, gymId } = await trainingDatabase();
    const logged = logFinishedWorkout(db, gymId, 1_000, [{ exerciseId: "pull-up", sets: 1 }]);
    const routineId = createRoutine(db, "Pull");
    addRoutineExercise(db, routineId, "pull-up");

    hideExercise(db, "pull-up");

    expect(getRoutine(db, routineId, "en")?.exercises.map(({ exercise }) => exercise.id)).toEqual([
      "pull-up",
    ]);
    const started = startWorkout(db, { gymId, timeZone: TIME_ZONE, routineId, now: 2_000 });
    expect(getLedger(db, started, "en")?.exercises.map(({ exercise }) => exercise.id)).toEqual([
      "pull-up",
    ]);
    expect(getLedger(db, logged, "en")?.exercises[0]?.sets).toMatchObject([
      { load: 50, reps: 10, done: true },
    ]);
  });
});

describe("unhideExercise", () => {
  test("brings a Hidden Exercise back into search", async () => {
    const db = await createTestDatabase();
    seedBuiltInExercises(db, [benchPress, pullUp]);
    hideExercise(db, "pull-up");

    unhideExercise(db, "pull-up");

    expect(searchExercises(listExercises(db, "en"), "pull").map((listing) => listing.id)).toEqual([
      "pull-up",
    ]);
  });
});

describe("Exercise name uniqueness", () => {
  test("a name already taken in any case can't be created again", async () => {
    const db = await createTestDatabase();
    seedBuiltInExercises(db, [pullUp]);
    createCustomExercise(db, { name: "Pendlay Row" });

    expect(() => createCustomExercise(db, { name: "pull-up" })).toThrow("already taken");
    expect(() => createCustomExercise(db, { name: "  PENDLAY row " })).toThrow("already taken");
  });

  test("a blank name is refused", async () => {
    const db = await createTestDatabase();

    expect(() => createCustomExercise(db, { name: "   " })).toThrow("needs a name");
  });

  test("a Hidden Exercise keeps its name", async () => {
    const db = await createTestDatabase();
    seedBuiltInExercises(db, [pullUp]);
    hideExercise(db, "pull-up");

    expect(() => createCustomExercise(db, { name: "Pull-Up" })).toThrow("already taken");
  });

  test("a Built-in Exercise's Spanish name is taken too", async () => {
    const db = await createTestDatabase();
    seedBuiltInExercises(db, [pullUp]);

    expect(() => createCustomExercise(db, { name: "dominada" })).toThrow("already taken");
  });

  test("a name that only contains another Exercise's name is free", async () => {
    const db = await createTestDatabase();
    seedBuiltInExercises(db, [pullUp]);

    expect(createCustomExercise(db, { name: "Pull-Up Negative" }).name).toBe("Pull-Up Negative");
  });
});

describe("seedBuiltInExercises", () => {
  test("a new app version adds its Built-in Exercises and keeps Hidden ones hidden", async () => {
    const db = await createTestDatabase();
    seedBuiltInExercises(db, [benchPress]);
    hideExercise(db, "barbell-bench-press");

    seedBuiltInExercises(db, [benchPress, pullUp]);

    expect(listExercises(db, "en").map(({ id, hidden }) => [id, hidden])).toEqual([
      ["barbell-bench-press", true],
      ["pull-up", false],
    ]);
  });
});

describe("searchExercises", () => {
  test("matches any part of the name, ignoring case", async () => {
    const db = await createTestDatabase();
    seedBuiltInExercises(db, [benchPress, pullUp, legExtension]);

    const matches = searchExercises(listExercises(db, "en"), "BENCH");

    expect(matches.map((listing) => listing.id)).toEqual(["barbell-bench-press"]);
  });

  test("matches Spanish names typed without accents", async () => {
    const db = await createTestDatabase();
    seedBuiltInExercises(db, [benchPress, pullUp, legExtension]);

    const matches = searchExercises(listExercises(db, "es"), "extension de cuadriceps");

    expect(matches.map((listing) => listing.id)).toEqual(["machine-leg-extension"]);
  });

  test("leaves out Hidden Exercises", async () => {
    const db = await createTestDatabase();
    seedBuiltInExercises(db, [benchPress, pullUp]);
    hideExercise(db, "pull-up");

    expect(searchExercises(listExercises(db, "en"), "").map((listing) => listing.id)).toEqual([
      "barbell-bench-press",
    ]);
  });

  test("an empty search matches every Exercise", async () => {
    const db = await createTestDatabase();
    seedBuiltInExercises(db, [benchPress, pullUp]);

    expect(searchExercises(listExercises(db, "en"), "  ")).toHaveLength(2);
  });
});

describe("BUILT_IN_EXERCISES", () => {
  test("ids are kebab-case slugs, each used once", () => {
    const ids = BUILT_IN_EXERCISES.map((builtIn) => builtIn.id);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("names are unique case-insensitively within each language", () => {
    for (const language of ["en", "es"] as const) {
      const names = BUILT_IN_EXERCISES.map((builtIn) => builtIn.name[language].toLowerCase());
      expect(new Set(names).size).toBe(names.length);
    }
  });
});
