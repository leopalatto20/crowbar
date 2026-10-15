import { describe, expect, test } from "bun:test";

import type { BuiltInExercise } from "./built-in-exercises";
import type { Database } from "./database";
import { seedBuiltInExercises } from "./exercises";
import { createGym, deleteGym, gymHistoryCounts, listGyms, renameGym } from "./gyms";
import { seedSettings } from "./settings";
import { createTestDatabase } from "./test-database";
import {
  addSet,
  addWorkoutExercise,
  confirmSet,
  currentWorkout,
  finishWorkout,
  getLedger,
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

const TIME_ZONE = "America/Mexico_City";

async function libraryDatabase() {
  const db = await createTestDatabase();
  seedSettings(db, "MX");
  seedBuiltInExercises(db, [benchPress, pullUp]);
  return db;
}

// Starts a Workout at the Gym with one entry per Exercise, confirming `logged` of each entry's
// `sets` sets.
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
    const ledger = getLedger(db, workoutId, "en")!;
    const added = ledger.exercises.find((exercise) => exercise.id === entry)!;
    for (const set of added.sets.slice(0, logged)) confirmSet(db, set.id, { load: 50, reps: 10 });
  }
  return workoutId;
}

async function twoGyms() {
  const db = await libraryDatabase();
  const downtown = createGym(db, "Downtown Iron");
  const garage = createGym(db, "Garage");
  const first = logWorkout(db, downtown, 1_000, [
    { exerciseId: benchPress.id, sets: 2, logged: 2 },
    { exerciseId: pullUp.id, sets: 1, logged: 1 },
  ]);
  finishWorkout(db, first, { now: 1_500 });
  const atGarage = logWorkout(db, garage, 2_000, [
    { exerciseId: benchPress.id, sets: 1, logged: 1 },
  ]);
  finishWorkout(db, atGarage, { now: 2_500 });
  // In progress: one set logged, one not yet.
  const inProgress = logWorkout(db, downtown, 3_000, [
    { exerciseId: benchPress.id, sets: 2, logged: 1 },
  ]);
  return { db, downtown, garage, first, atGarage, inProgress };
}

describe("deleteGym", () => {
  test("counts the Stations, Workouts and logged sets that go with the Gym", async () => {
    const { db, downtown, garage } = await twoGyms();
    expect(gymHistoryCounts(db, downtown)).toEqual({ stations: 2, workouts: 2, sets: 4 });
    expect(gymHistoryCounts(db, garage)).toEqual({ stations: 1, workouts: 1, sets: 1 });
  });

  test("removes the Gym with its Stations, Workouts and sets, and nothing at other Gyms", async () => {
    const { db, downtown, garage, first, atGarage, inProgress } = await twoGyms();

    deleteGym(db, downtown);

    expect(listGyms(db)).toEqual([{ id: garage, name: "Garage" }]);
    expect(getLedger(db, first, "en")).toBeUndefined();
    expect(getLedger(db, inProgress, "en")).toBeUndefined();
    expect(currentWorkout(db)).toBeUndefined();
    expect(gymHistoryCounts(db, downtown)).toEqual({ stations: 0, workouts: 0, sets: 0 });
    expect(gymHistoryCounts(db, garage)).toEqual({ stations: 1, workouts: 1, sets: 1 });
    expect(getLedger(db, atGarage, "en")?.exercises[0]?.sets).toMatchObject([
      { load: 50, reps: 10, done: true },
    ]);
  });
});

describe("renameGym", () => {
  test("the new name shows wherever the Gym does, in name order", async () => {
    const { db, downtown, garage, first } = await twoGyms();

    renameGym(db, downtown, "  Iron Temple ");

    expect(listGyms(db)).toEqual([
      { id: garage, name: "Garage" },
      { id: downtown, name: "Iron Temple" },
    ]);
    expect(getLedger(db, first, "en")?.gymName).toBe("Iron Temple");
  });
});
