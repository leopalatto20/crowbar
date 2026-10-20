import { describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";

import type { BuiltInExercise } from "./built-in-exercises";
import {
  createCustomExercise,
  hideExercise,
  type NewCustomExercise,
  listExercises,
  seedBuiltInExercises,
} from "./exercises";
import { createGym } from "./gyms";
import type { Database } from "./database";
import {
  addRoutineExercise,
  createRoutine,
  getRoutine,
  listRoutines,
  updateRoutineExercise,
} from "./routines";
import { seedSettings } from "./settings";
import { importSharedRoutine, previewSharedRoutine, shareRoutine } from "./shared-routines";
import { exercise } from "./schema";
import { createTestDatabase } from "./test-database";
import {
  addWorkoutExercise,
  confirmSet,
  currentWorkout,
  getLedger,
  setMachineNotes,
  startWorkout,
} from "./workouts";

const TIME_ZONE = "America/Mexico_City";

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

async function libraryDatabase() {
  const db = await createTestDatabase();
  seedBuiltInExercises(db, [benchPress, pullUp]);
  return db;
}

function exerciseIdsOf(db: Database, routineId: string) {
  return getRoutine(db, routineId, "en")?.exercises.map((entry) => entry.exercise.id);
}

describe("a Routine of Built-in Exercises", () => {
  test("imports into another database with its Exercises in order and every Target", async () => {
    const sharer = await libraryDatabase();
    const routineId = createRoutine(sharer, "Upper A");
    const bench = addRoutineExercise(sharer, routineId, benchPress.id);
    updateRoutineExercise(sharer, bench, { warmups: 2, sets: 4, repMin: 5, repMax: 7 });
    const pull = addRoutineExercise(sharer, routineId, pullUp.id);
    updateRoutineExercise(sharer, pull, { rirMin: 0, rirMax: 1, restSeconds: 90 });
    const receiver = await libraryDatabase();

    const importedId = importSharedRoutine(receiver, shareRoutine(sharer, routineId));

    expect(getRoutine(receiver, importedId, "en")).toEqual({
      id: importedId,
      name: "Upper A",
      exercises: [
        {
          id: expect.any(String),
          exercise: { id: "barbell-bench-press", name: "Barbell Bench Press" },
          warmups: 2,
          sets: 4,
          repMin: 5,
          repMax: 7,
          rirMin: 1,
          rirMax: 2,
          restSeconds: 120,
        },
        {
          id: expect.any(String),
          exercise: { id: "pull-up", name: "Pull-Up" },
          warmups: 0,
          sets: 3,
          repMin: 8,
          repMax: 12,
          rirMin: 0,
          rirMax: 1,
          restSeconds: 90,
        },
      ],
    });
  });
});

describe("importSharedRoutine", () => {
  test("keeps blank Targets blank", async () => {
    const sharer = await libraryDatabase();
    const routineId = createRoutine(sharer, "Upper A");
    const bench = addRoutineExercise(sharer, routineId, benchPress.id);
    updateRoutineExercise(sharer, bench, {
      sets: null,
      repMin: null,
      repMax: null,
      rirMin: null,
      rirMax: null,
      restSeconds: null,
    });
    const receiver = await libraryDatabase();

    const importedId = importSharedRoutine(receiver, shareRoutine(sharer, routineId));

    expect(getRoutine(receiver, importedId, "en")?.exercises).toMatchObject([
      { sets: null, repMin: null, repMax: null, rirMin: null, rirMax: null, restSeconds: null },
    ]);
  });

  test("adds a new Routine last, keeping its name even when one already has it", async () => {
    const sharer = await libraryDatabase();
    const routineId = createRoutine(sharer, "Upper A");
    addRoutineExercise(sharer, routineId, benchPress.id);
    const receiver = await libraryDatabase();
    const existing = createRoutine(receiver, "Upper A");
    const legs = createRoutine(receiver, "Legs");

    const importedId = importSharedRoutine(receiver, shareRoutine(sharer, routineId));

    expect(listRoutines(receiver)).toEqual([
      { id: existing, name: "Upper A", lastRun: null },
      { id: legs, name: "Legs", lastRun: null },
      { id: importedId, name: "Upper A", lastRun: null },
    ]);
  });

  test("leaves the Workout in progress as it was", async () => {
    const sharer = await libraryDatabase();
    const routineId = createRoutine(sharer, "Upper A");
    addRoutineExercise(sharer, routineId, benchPress.id);
    const receiver = await libraryDatabase();
    seedSettings(receiver, "MX");
    const workoutId = startWorkout(receiver, {
      gymId: createGym(receiver, "Home"),
      timeZone: TIME_ZONE,
    });
    addWorkoutExercise(receiver, workoutId, pullUp.id);
    const before = getLedger(receiver, workoutId, "en");

    importSharedRoutine(receiver, shareRoutine(sharer, routineId));

    expect(currentWorkout(receiver)?.id).toBe(workoutId);
    expect(getLedger(receiver, workoutId, "en")).toEqual(before);
  });

  test("uses a Hidden Built-in Exercise and leaves it hidden", async () => {
    const sharer = await libraryDatabase();
    const routineId = createRoutine(sharer, "Upper A");
    addRoutineExercise(sharer, routineId, benchPress.id);
    const receiver = await libraryDatabase();
    hideExercise(receiver, benchPress.id);

    const importedId = importSharedRoutine(receiver, shareRoutine(sharer, routineId));

    expect(exerciseIdsOf(receiver, importedId)).toEqual([benchPress.id]);
    expect(listExercises(receiver, "en").find((found) => found.id === benchPress.id)?.hidden).toBe(
      true,
    );
  });
});

describe("previewSharedRoutine", () => {
  test("lists the Routine name and its Exercises in order, named in the receiver's language", async () => {
    const sharer = await libraryDatabase();
    const routineId = createRoutine(sharer, "Upper A");
    addRoutineExercise(sharer, routineId, pullUp.id);
    addRoutineExercise(sharer, routineId, benchPress.id);
    const receiver = await libraryDatabase();

    const preview = previewSharedRoutine(receiver, shareRoutine(sharer, routineId), "es");

    expect(preview).toEqual({
      valid: true,
      name: "Upper A",
      exercises: [
        { name: "Dominada", match: null },
        { name: "Press de banca con barra", match: null },
      ],
    });
  });
});

describe("shareRoutine", () => {
  test("carries nothing of the sharer's Gyms, Stations, sets, notes or ids", async () => {
    const sharer = await libraryDatabase();
    seedSettings(sharer, "MX");
    const routineId = createRoutine(sharer, "Upper A");
    const slotId = addRoutineExercise(sharer, routineId, benchPress.id);
    const workoutId = startWorkout(sharer, {
      gymId: createGym(sharer, "Downtown Iron"),
      timeZone: TIME_ZONE,
      routineId,
    });
    const [entry] = getLedger(sharer, workoutId, "en")!.exercises;
    setMachineNotes(sharer, entry!.id, "Seat on notch 4");
    confirmSet(sharer, entry!.sets[0]!.id, { load: 102.5, reps: 5 });

    const content = shareRoutine(sharer, routineId);

    for (const personal of [routineId, slotId, workoutId, "Downtown Iron", "notch 4", "102.5"]) {
      expect(content).not.toContain(personal);
    }
  });
});

function customExercisesOf(db: Database) {
  return db
    .select({
      name: exercise.name,
      equipmentType: exercise.equipmentType,
      loadType: exercise.loadType,
      unilateral: exercise.unilateral,
      muscleGroup: exercise.muscleGroup,
      hidden: exercise.hidden,
    })
    .from(exercise)
    .where(eq(exercise.builtIn, false))
    .all();
}

describe("a Routine with Custom Exercises", () => {
  test("carries their definitions and no Custom Exercise id", async () => {
    const sharer = await libraryDatabase();
    const routineId = createRoutine(sharer, "Upper A");
    const dips = createCustomExercise(sharer, {
      name: "Ring Dips",
      equipmentType: "bodyweight",
      loadType: "assisted",
      unilateral: true,
      muscleGroup: "triceps",
    });
    addRoutineExercise(sharer, routineId, dips.id);

    const content = shareRoutine(sharer, routineId);

    expect(content).not.toContain(dips.id);
    expect(JSON.parse(content).exercises[0].exercise).toEqual({
      custom: {
        name: "Ring Dips",
        equipmentType: "bodyweight",
        loadType: "assisted",
        unilateral: true,
        muscleGroup: "triceps",
      },
    });
  });

  test("creates an unmatched one with the file's definition, visible and named as it was", async () => {
    const sharer = await libraryDatabase();
    const routineId = createRoutine(sharer, "Upper A");
    addRoutineExercise(sharer, routineId, benchPress.id);
    const dips = createCustomExercise(sharer, {
      name: "Ring Dips",
      equipmentType: "bodyweight",
      loadType: "assisted",
      unilateral: true,
      muscleGroup: "triceps",
    });
    addRoutineExercise(sharer, routineId, dips.id);
    const receiver = await libraryDatabase();

    const importedId = importSharedRoutine(receiver, shareRoutine(sharer, routineId));

    expect(customExercisesOf(receiver)).toEqual([
      {
        name: "Ring Dips",
        equipmentType: "bodyweight",
        loadType: "assisted",
        unilateral: true,
        muscleGroup: "triceps",
        hidden: false,
      },
    ]);
    expect(getRoutine(receiver, importedId, "en")?.exercises.map((e) => e.exercise.name)).toEqual([
      "Barbell Bench Press",
      "Ring Dips",
    ]);
  });
});

const ringDips = {
  name: "Ring Dips",
  equipmentType: "bodyweight",
  loadType: "assisted",
  unilateral: true,
  muscleGroup: "triceps",
} as const;

// Shares a Routine whose only slot is a Custom Exercise defined as given, from a library with no
// Built-in Exercises to take its name.
async function sharedWith(definition: NewCustomExercise) {
  const sharer = await createTestDatabase();
  const routineId = createRoutine(sharer, "Upper A");
  addRoutineExercise(sharer, routineId, createCustomExercise(sharer, definition).id);
  return shareRoutine(sharer, routineId);
}

describe("importing a Custom Exercise", () => {
  const reuses: [string, NewCustomExercise, NewCustomExercise][] = [
    ["the same name", ringDips, ringDips],
    ["the name in another case and without accents", { ...ringDips, name: "Ríng DIPS" }, ringDips],
    [
      "a different Equipment type or Muscle group",
      { ...ringDips, equipmentType: "machine", muscleGroup: "chest" },
      ringDips,
    ],
  ];

  test.each(reuses)("reuses an Exercise with %s", async (_, existing, filed) => {
    const receiver = await libraryDatabase();
    const kept = createCustomExercise(receiver, existing);
    const before = customExercisesOf(receiver);

    const importedId = importSharedRoutine(receiver, await sharedWith(filed));

    expect(exerciseIdsOf(receiver, importedId)).toEqual([kept.id]);
    expect(customExercisesOf(receiver)).toEqual(before);
  });

  test("reuses a Built-in Exercise by its Spanish name", async () => {
    const receiver = await libraryDatabase();

    const importedId = importSharedRoutine(
      receiver,
      await sharedWith({ name: "dominada", loadType: "bodyweight" }),
    );

    expect(exerciseIdsOf(receiver, importedId)).toEqual([pullUp.id]);
    expect(customExercisesOf(receiver)).toEqual([]);
  });

  test.each([
    ["Load type", { loadType: "bodyweight" }],
    ["Unilateral", { unilateral: false }],
  ] as const)("creates a new one with a suffixed name when the %s differs", async (_, change) => {
    const receiver = await libraryDatabase();
    const kept = createCustomExercise(receiver, { ...ringDips, ...change });
    createCustomExercise(receiver, {
      ...ringDips,
      ...change,
      name: "Ring Dips (2)",
    });

    const importedId = importSharedRoutine(receiver, await sharedWith(ringDips));

    const [imported] = exerciseIdsOf(receiver, importedId)!;
    expect(imported).not.toBe(kept.id);
    expect(customExercisesOf(receiver)).toContainEqual({
      ...ringDips,
      name: "Ring Dips (3)",
      hidden: false,
    });
  });

  test("suffixes a new one whose name differs from an existing one only in accents", async () => {
    const receiver = await libraryDatabase();
    createCustomExercise(receiver, { ...ringDips, name: "Extensión", loadType: "bodyweight" });

    importSharedRoutine(receiver, await sharedWith({ ...ringDips, name: "Extension" }));

    expect(customExercisesOf(receiver).map((found) => found.name)).toEqual([
      "Extensión",
      "Extension (2)",
    ]);
  });

  test("takes only the definition from the file", async () => {
    const receiver = await libraryDatabase();
    const content = edited(await sharedWith(ringDips), (doc) =>
      Object.assign((doc.exercises[0]!.exercise as { custom: object }).custom, {
        hidden: true,
        nameEs: "Fondos en anillas",
      }),
    );

    importSharedRoutine(receiver, content);

    expect(customExercisesOf(receiver)).toEqual([{ ...ringDips, hidden: false }]);
    expect(listExercises(receiver, "es").find((found) => found.name === "Ring Dips")).toBeDefined();
  });

  test("reuses a Hidden Exercise and leaves it hidden", async () => {
    const receiver = await libraryDatabase();
    const kept = createCustomExercise(receiver, ringDips);
    hideExercise(receiver, kept.id);

    const importedId = importSharedRoutine(receiver, await sharedWith(ringDips));

    expect(exerciseIdsOf(receiver, importedId)).toEqual([kept.id]);
    expect(customExercisesOf(receiver)).toEqual([{ ...ringDips, hidden: true }]);
  });

  test("resolves the same Custom Exercise in two slots to one Exercise", async () => {
    const sharer = await libraryDatabase();
    const routineId = createRoutine(sharer, "Upper A");
    const dips = createCustomExercise(sharer, ringDips);
    addRoutineExercise(sharer, routineId, dips.id);
    addRoutineExercise(sharer, routineId, benchPress.id);
    addRoutineExercise(sharer, routineId, dips.id);
    const receiver = await libraryDatabase();

    const importedId = importSharedRoutine(receiver, shareRoutine(sharer, routineId));

    const [first, , last] = exerciseIdsOf(receiver, importedId)!;
    expect(last).toBe(first!);
    expect(customExercisesOf(receiver)).toHaveLength(1);
  });

  test("reuses on a second import what the first one created", async () => {
    const receiver = await libraryDatabase();
    createCustomExercise(receiver, { ...ringDips, loadType: "bodyweight" });
    const content = await sharedWith(ringDips);

    const first = importSharedRoutine(receiver, content);
    const second = importSharedRoutine(receiver, content);

    expect(exerciseIdsOf(receiver, second)).toEqual(exerciseIdsOf(receiver, first)!);
    expect(customExercisesOf(receiver).map((found) => found.name)).toEqual([
      "Ring Dips",
      "Ring Dips (2)",
    ]);
  });

  test("creates nothing when imported back into the sharer's own database", async () => {
    const sharer = await libraryDatabase();
    const routineId = createRoutine(sharer, "Upper A");
    const dips = createCustomExercise(sharer, ringDips);
    const curl = createCustomExercise(sharer, {
      name: "Spider Curl",
      muscleGroup: "biceps",
    });
    addRoutineExercise(sharer, routineId, dips.id);
    addRoutineExercise(sharer, routineId, pullUp.id);
    addRoutineExercise(sharer, routineId, curl.id);
    const before = customExercisesOf(sharer);

    const importedId = importSharedRoutine(sharer, shareRoutine(sharer, routineId));

    expect(exerciseIdsOf(sharer, importedId)).toEqual([dips.id, pullUp.id, curl.id]);
    expect(customExercisesOf(sharer)).toEqual(before);
  });

  test("previews each one as Reused or New under its final name, writing nothing", async () => {
    const sharer = await createTestDatabase();
    seedBuiltInExercises(sharer, [benchPress]);
    const routineId = createRoutine(sharer, "Upper A");
    const dips = createCustomExercise(sharer, ringDips);
    addRoutineExercise(sharer, routineId, dips.id);
    addRoutineExercise(sharer, routineId, benchPress.id);
    addRoutineExercise(sharer, routineId, createCustomExercise(sharer, { name: "Dominada" }).id);
    addRoutineExercise(sharer, routineId, dips.id);
    const receiver = await libraryDatabase();
    createCustomExercise(receiver, { ...ringDips, unilateral: false });
    const before = snapshot(receiver);

    const preview = previewSharedRoutine(receiver, shareRoutine(sharer, routineId), "en");

    expect(preview).toEqual({
      valid: true,
      name: "Upper A",
      exercises: [
        { name: "Ring Dips (2)", match: "new" },
        { name: "Barbell Bench Press", match: null },
        { name: "Dominada (2)", match: "new" },
        { name: "Ring Dips (2)", match: "new" },
      ],
    });
    expect(snapshot(receiver)).toEqual(before);
  });

  test("previews a reused one under the receiver's name in their language", async () => {
    const receiver = await libraryDatabase();

    const preview = previewSharedRoutine(
      receiver,
      await sharedWith({ name: "Pull-up", loadType: "bodyweight" }),
      "es",
    );

    expect(preview).toMatchObject({
      exercises: [{ name: "Dominada", match: "reused" }],
    });
  });
});

// A file as it arrives, edited the way a newer app, a damaged transfer or a hand edit would leave it.
type Document = { version: number; exercises: Record<string, unknown>[] } & Record<string, unknown>;

async function sharedUpperA() {
  const sharer = await libraryDatabase();
  const routineId = createRoutine(sharer, "Upper A");
  addRoutineExercise(sharer, routineId, benchPress.id);
  addRoutineExercise(sharer, routineId, pullUp.id);
  return shareRoutine(sharer, routineId);
}

function edited(content: string, edit: (document: Document) => void) {
  const document = JSON.parse(content) as Document;
  edit(document);
  return JSON.stringify(document);
}

function snapshot(db: Database) {
  return {
    routines: listRoutines(db).map((found) => getRoutine(db, found.id, "en")),
    exercises: listExercises(db, "en"),
  };
}

describe("a rejected Shared Routine", () => {
  const cases: [string, (content: string) => string, "newer" | "damaged"][] = [
    ["is from a newer format", (content) => edited(content, (doc) => (doc.version = 3)), "newer"],
    [
      "has no version before 1",
      (content) => edited(content, (doc) => (doc.version = 0)),
      "damaged",
    ],
    [
      "uses a Built-in Exercise this app doesn't know",
      (content) =>
        edited(content, (doc) => (doc.exercises[1]!.exercise = { builtIn: "zercher-squat" })),
      "newer",
    ],
    [
      "has a Custom Exercise with an unknown Load type",
      (content) =>
        edited(content, (doc) => {
          doc.exercises[0]!.exercise = {
            custom: { ...ringDips, loadType: "banded" },
          };
        }),
      "damaged",
    ],
    [
      "has a Custom Exercise with an unknown Equipment type",
      (content) =>
        edited(content, (doc) => {
          doc.exercises[0]!.exercise = { custom: { ...ringDips, equipmentType: "sled" } };
        }),
      "damaged",
    ],
    [
      "has a Custom Exercise with an unknown Muscle group",
      (content) =>
        edited(content, (doc) => {
          doc.exercises[0]!.exercise = { custom: { ...ringDips, muscleGroup: "neck" } };
        }),
      "damaged",
    ],
    [
      "has a Custom Exercise without a name",
      (content) =>
        edited(content, (doc) => {
          doc.exercises[0]!.exercise = { custom: { ...ringDips, name: "" } };
        }),
      "damaged",
    ],
    [
      "has a version that isn't a whole number",
      (content) => edited(content, (doc) => (doc.version = 1.5)),
      "damaged",
    ],
    ["has no Routine name", (content) => edited(content, (doc) => delete doc.name), "damaged"],
    ["isn't JSON", () => "Upper A: bench, pull-ups", "damaged"],
    ["is empty, like a file that couldn't be read", () => "", "damaged"],
    ["is JSON of another kind", () => JSON.stringify({ name: "Upper A" }), "damaged"],
    [
      "has a slot without an Exercise",
      (content) => edited(content, (doc) => delete doc.exercises[0]!.exercise),
      "damaged",
    ],
    [
      "has a rep minimum above the maximum",
      (content) =>
        edited(content, (doc) => Object.assign(doc.exercises[0]!, { repMin: 12, repMax: 8 })),
      "damaged",
    ],
    [
      "has half a rep range",
      (content) => edited(content, (doc) => (doc.exercises[0]!.repMax = null)),
      "damaged",
    ],
    [
      "has half a RIR range",
      (content) => edited(content, (doc) => (doc.exercises[0]!.rirMax = null)),
      "damaged",
    ],
    ["has no sets", (content) => edited(content, (doc) => (doc.exercises[0]!.sets = 0)), "damaged"],
    [
      "has negative warm-ups",
      (content) => edited(content, (doc) => (doc.exercises[0]!.warmups = -1)),
      "damaged",
    ],
    [
      "has a rest of zero seconds",
      (content) => edited(content, (doc) => (doc.exercises[0]!.restSeconds = 0)),
      "damaged",
    ],
    [
      "has a fractional rest",
      (content) => edited(content, (doc) => (doc.exercises[0]!.restSeconds = 90.5)),
      "damaged",
    ],
  ];

  test.each(cases)("when it %s, says why and imports nothing", async (_, edit, problem) => {
    const content = edit(await sharedUpperA());
    const receiver = await libraryDatabase();
    createRoutine(receiver, "Legs");
    const before = snapshot(receiver);

    expect(previewSharedRoutine(receiver, content, "en")).toEqual({ valid: false, problem });
    expect(() => importSharedRoutine(receiver, content)).toThrow();
    expect(snapshot(receiver)).toEqual(before);
  });
});
