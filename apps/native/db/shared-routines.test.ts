import { describe, expect, test } from "bun:test";

import type { BuiltInExercise } from "./built-in-exercises";
import {
  createCustomExercise,
  hideExercise,
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

function shared(content: ReturnType<typeof shareRoutine>) {
  if (!content.shareable) throw new Error(`Routine isn't shareable: ${content.problem}`);
  return content.content;
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

    const importedId = importSharedRoutine(receiver, shared(shareRoutine(sharer, routineId)));

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

    const importedId = importSharedRoutine(receiver, shared(shareRoutine(sharer, routineId)));

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

    const importedId = importSharedRoutine(receiver, shared(shareRoutine(sharer, routineId)));

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

    importSharedRoutine(receiver, shared(shareRoutine(sharer, routineId)));

    expect(currentWorkout(receiver)?.id).toBe(workoutId);
    expect(getLedger(receiver, workoutId, "en")).toEqual(before);
  });

  test("uses a Hidden Built-in Exercise and leaves it hidden", async () => {
    const sharer = await libraryDatabase();
    const routineId = createRoutine(sharer, "Upper A");
    addRoutineExercise(sharer, routineId, benchPress.id);
    const receiver = await libraryDatabase();
    hideExercise(receiver, benchPress.id);

    const importedId = importSharedRoutine(receiver, shared(shareRoutine(sharer, routineId)));

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

    const preview = previewSharedRoutine(receiver, shared(shareRoutine(sharer, routineId)), "es");

    expect(preview).toEqual({
      valid: true,
      name: "Upper A",
      exercises: [
        { id: "pull-up", name: "Dominada" },
        { id: "barbell-bench-press", name: "Press de banca con barra" },
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

    const content = shared(shareRoutine(sharer, routineId));

    for (const personal of [routineId, slotId, workoutId, "Downtown Iron", "notch 4", "102.5"]) {
      expect(content).not.toContain(personal);
    }
  });

  test("refuses a Routine that uses a Custom Exercise", async () => {
    const sharer = await libraryDatabase();
    const routineId = createRoutine(sharer, "Upper A");
    addRoutineExercise(sharer, routineId, benchPress.id);
    addRoutineExercise(sharer, routineId, createCustomExercise(sharer, { name: "Dips" }).id);

    expect(shareRoutine(sharer, routineId)).toEqual({
      shareable: false,
      problem: "customExercise",
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
  return shared(shareRoutine(sharer, routineId));
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
    ["is from a newer format", (content) => edited(content, (doc) => (doc.version = 2)), "newer"],
    [
      "uses a Built-in Exercise this app doesn't know",
      (content) =>
        edited(content, (doc) => (doc.exercises[1]!.exercise = { builtIn: "zercher-squat" })),
      "newer",
    ],
    ["isn't JSON", () => "Upper A: bench, pull-ups", "damaged"],
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
