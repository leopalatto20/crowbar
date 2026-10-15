import { describe, expect, test } from "bun:test";

import type { BuiltInExercise } from "./built-in-exercises";
import type { Database } from "./database";
import { seedBuiltInExercises } from "./exercises";
import { createGym } from "./gyms";
import { getExerciseProgress } from "./progress";
import { seedSettings } from "./settings";
import {
  deleteStation,
  mergeStation,
  renameStation,
  retireStation,
  returnStationToService,
  setStationNotes,
  setStationUnit,
  stationHistoryCounts,
} from "./stations";
import { createTestDatabase } from "./test-database";
import {
  addSet,
  addStation,
  addWorkoutExercise,
  confirmSet,
  finishWorkout,
  getLedger,
  startWorkout,
} from "./workouts";

const chestPress: BuiltInExercise = {
  id: "machine-chest-press",
  name: { en: "Machine Chest Press", es: "Press de pecho en máquina" },
  equipmentType: "machine",
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
  seedBuiltInExercises(db, [chestPress, pullUp]);
  return { db, gymId: createGym(db, "Downtown Iron") };
}

// Logs the loads in order on the Exercise's default Station at the Gym, then finishes.
function logWorkout(
  db: Database,
  {
    gymId,
    exerciseId,
    at,
    loads,
  }: { gymId: string; exerciseId: string; at: number; loads: number[] },
) {
  const workoutId = startWorkout(db, { gymId, timeZone: TIME_ZONE, now: at });
  const entryId = addWorkoutExercise(db, workoutId, exerciseId);
  loads.forEach((load, index) => {
    if (index > 0) addSet(db, entryId);
    const set = getLedger(db, workoutId, "en")!.exercises[0]!.sets[index]!;
    confirmSet(db, set.id, { load, reps: 10 });
  });
  finishWorkout(db, workoutId, { now: at + 1 });
  return workoutId;
}

// Logs a set on a further Station at the Gym, naming the one it already holds, then finishes.
function logOnNewStation(
  db: Database,
  {
    gymId,
    exerciseId,
    at,
    label,
  }: { gymId: string; exerciseId: string; at: number; label: string },
) {
  const workoutId = startWorkout(db, { gymId, timeZone: TIME_ZONE, now: at });
  const entryId = addWorkoutExercise(db, workoutId, exerciseId);
  const named = getLedger(db, workoutId, "en")!.exercises[0]!.stations.some((s) => s.label);
  addStation(db, entryId, { label, existingLabel: named ? undefined : "Original" });
  confirmSet(db, getLedger(db, workoutId, "en")!.exercises[0]!.sets[0]!.id, { load: 70, reps: 8 });
  finishWorkout(db, workoutId, { now: at + 1 });
  return getLedger(db, workoutId, "en")!.exercises[0]!.station!.id;
}

function selected(db: Database, exerciseId: string, stationId?: string) {
  const found = getExerciseProgress(db, exerciseId, "en", { stationId })?.selected;
  if (!found) throw new Error(`Exercise ${exerciseId} has no Station`);
  return found;
}

describe("changing a Station's unit", () => {
  test("relabels its past sets instead of converting them", async () => {
    const { db, gymId } = await libraryDatabase();
    logWorkout(db, { gymId, exerciseId: chestPress.id, at: 1_000, loads: [50, 55] });
    const { station } = selected(db, chestPress.id);

    setStationUnit(db, station.id, "lb");

    const after = selected(db, chestPress.id);
    expect(after.format.unit).toBe("lb");
    expect(after.workouts[0]?.sets.map((set) => set.load)).toEqual([50, 55]);
  });

  test("never puts a Bodyweight Station on Stack levels", async () => {
    const { db, gymId } = await libraryDatabase();
    logWorkout(db, { gymId, exerciseId: pullUp.id, at: 1_000, loads: [0] });
    const { station } = selected(db, pullUp.id);

    expect(() => setStationUnit(db, station.id, "level")).toThrow();
    expect(selected(db, pullUp.id).format.unit).toBe("kg");
  });
});

describe("retiring a Station", () => {
  test("keeps its history, but logging there again starts a fresh Station", async () => {
    const { db, gymId } = await libraryDatabase();
    logWorkout(db, { gymId, exerciseId: chestPress.id, at: 1_000, loads: [50] });
    const { station: retired } = selected(db, chestPress.id);

    retireStation(db, retired.id);

    expect(selected(db, chestPress.id, retired.id).workouts).toHaveLength(1);
    const workoutId = startWorkout(db, { gymId, timeZone: TIME_ZONE, now: 2_000 });
    addWorkoutExercise(db, workoutId, chestPress.id);
    const [entry] = getLedger(db, workoutId, "en")!.exercises;
    expect(entry?.station).toBeNull();
    expect(entry?.stations).toEqual([]);

    confirmSet(db, entry!.sets[0]!.id, { load: 60, reps: 10 });
    const fresh = getLedger(db, workoutId, "en")!.exercises[0]!.station;
    expect(fresh?.id).not.toBe(retired.id);
    expect(getLedger(db, workoutId, "en")!.exercises[0]!.stations).toEqual([
      { id: fresh!.id, label: null },
    ]);
  });

  test("moves an Exercise of the Workout in progress with nothing logged off it", async () => {
    const { db, gymId } = await libraryDatabase();
    logWorkout(db, { gymId, exerciseId: chestPress.id, at: 1_000, loads: [50] });
    const workoutId = startWorkout(db, { gymId, timeZone: TIME_ZONE, now: 2_000 });
    addWorkoutExercise(db, workoutId, chestPress.id);
    const { station: retired } = getLedger(db, workoutId, "en")!.exercises[0]!;

    retireStation(db, retired!.id);

    expect(getLedger(db, workoutId, "en")!.exercises[0]!.station).toBeNull();
  });

  test("stays listed for an Exercise of the Workout in progress already logged on it", async () => {
    const { db, gymId } = await libraryDatabase();
    const workoutId = startWorkout(db, { gymId, timeZone: TIME_ZONE, now: 1_000 });
    addWorkoutExercise(db, workoutId, chestPress.id);
    confirmSet(db, getLedger(db, workoutId, "en")!.exercises[0]!.sets[0]!.id, {
      load: 50,
      reps: 10,
    });
    const { station: retired } = getLedger(db, workoutId, "en")!.exercises[0]!;

    retireStation(db, retired!.id);

    const [entry] = getLedger(db, workoutId, "en")!.exercises;
    expect(entry?.station?.id).toBe(retired!.id);
    expect(entry?.stations).toEqual([{ id: retired!.id, label: null }]);
  });

  test("returned to service, it is the default Station again", async () => {
    const { db, gymId } = await libraryDatabase();
    logWorkout(db, { gymId, exerciseId: chestPress.id, at: 1_000, loads: [50] });
    const { station: returned } = selected(db, chestPress.id);
    retireStation(db, returned.id);

    returnStationToService(db, returned.id);

    expect(selected(db, chestPress.id).station).toMatchObject({ id: returned.id, retired: false });
    const workoutId = startWorkout(db, { gymId, timeZone: TIME_ZONE, now: 2_000 });
    addWorkoutExercise(db, workoutId, chestPress.id);
    expect(getLedger(db, workoutId, "en")!.exercises[0]!.station?.id).toBe(returned.id);
  });
});

describe("merging Stations", () => {
  test("moves the sets onto the target, which keeps its name, unit and retired state", async () => {
    const { db, gymId } = await libraryDatabase();
    logWorkout(db, { gymId, exerciseId: chestPress.id, at: 1_000, loads: [50] });
    const sourceId = selected(db, chestPress.id).station.id;
    const targetId = logOnNewStation(db, {
      gymId,
      exerciseId: chestPress.id,
      at: 2_000,
      label: "Hammer Strength",
    });
    setStationUnit(db, targetId, "lb");
    retireStation(db, targetId);
    setStationNotes(db, sourceId, "Seat 4");
    setStationNotes(db, targetId, "Pin 7");

    mergeStation(db, sourceId, targetId);

    const { stations } = getExerciseProgress(db, chestPress.id, "en")!;
    expect(stations.map(({ id }) => id)).toEqual([targetId]);
    const target = selected(db, chestPress.id, targetId);
    expect(target.station).toMatchObject({ label: "Hammer Strength", retired: true });
    expect(target.format.unit).toBe("lb");
    expect(target.notes).toBe("Pin 7\nSeat 4");
    expect(target.workouts.map((w) => w.sets.map((set) => set.load))).toEqual([[70], [50]]);
  });

  test("moves the Workout in progress off a Retired target where nothing is logged", async () => {
    const { db, gymId } = await libraryDatabase();
    logWorkout(db, { gymId, exerciseId: chestPress.id, at: 1_000, loads: [50] });
    const sourceId = selected(db, chestPress.id).station.id;
    const targetId = logOnNewStation(db, {
      gymId,
      exerciseId: chestPress.id,
      at: 2_000,
      label: "Hammer Strength",
    });
    retireStation(db, targetId);
    const workoutId = startWorkout(db, { gymId, timeZone: TIME_ZONE, now: 3_000 });
    addWorkoutExercise(db, workoutId, chestPress.id);
    expect(getLedger(db, workoutId, "en")!.exercises[0]!.station?.id).toBe(sourceId);

    mergeStation(db, sourceId, targetId);

    expect(getLedger(db, workoutId, "en")!.exercises[0]!.station).toBeNull();
  });

  test("the source's notes become the target's when it has none", async () => {
    const { db, gymId } = await libraryDatabase();
    logWorkout(db, { gymId, exerciseId: chestPress.id, at: 1_000, loads: [50] });
    const sourceId = selected(db, chestPress.id).station.id;
    const targetId = logOnNewStation(db, {
      gymId,
      exerciseId: chestPress.id,
      at: 2_000,
      label: "Hammer Strength",
    });
    setStationNotes(db, sourceId, "Seat 4");

    mergeStation(db, sourceId, targetId);

    expect(selected(db, chestPress.id, targetId).notes).toBe("Seat 4");
  });

  test("keeps both slots of a Workout that logged on each Station", async () => {
    const { db, gymId } = await libraryDatabase();
    const workoutId = startWorkout(db, { gymId, timeZone: TIME_ZONE, now: 1_000 });
    const firstId = addWorkoutExercise(db, workoutId, chestPress.id);
    confirmSet(db, getLedger(db, workoutId, "en")!.exercises[0]!.sets[0]!.id, {
      load: 50,
      reps: 10,
    });
    const secondId = addWorkoutExercise(db, workoutId, chestPress.id);
    addStation(db, secondId, { label: "Hammer Strength", existingLabel: "Life Fitness" });
    confirmSet(db, getLedger(db, workoutId, "en")!.exercises[1]!.sets[0]!.id, {
      load: 70,
      reps: 8,
    });
    finishWorkout(db, workoutId, { now: 2_000 });
    const [first, second] = getLedger(db, workoutId, "en")!.exercises;
    expect(first?.id).toBe(firstId);

    mergeStation(db, first!.station!.id, second!.station!.id);

    const merged = getLedger(db, workoutId, "en")!.exercises;
    expect(merged.map((entry) => entry.id)).toEqual([firstId, secondId]);
    expect(merged.map((entry) => entry.station?.id)).toEqual([
      second!.station!.id,
      second!.station!.id,
    ]);
  });

  test("only merges Stations of the same Exercise at the same Gym", async () => {
    const { db, gymId } = await libraryDatabase();
    logWorkout(db, { gymId, exerciseId: chestPress.id, at: 1_000, loads: [50] });
    logWorkout(db, { gymId, exerciseId: pullUp.id, at: 2_000, loads: [0] });
    const uptownId = createGym(db, "Uptown Barbell");
    logWorkout(db, { gymId: uptownId, exerciseId: chestPress.id, at: 3_000, loads: [40] });
    const downtown = selected(db, chestPress.id).station.id;
    const stations = getExerciseProgress(db, chestPress.id, "en")!.stations;
    const uptown = stations.find((option) => option.id !== downtown)!.id;
    const pullUpStation = selected(db, pullUp.id).station.id;

    expect(() => mergeStation(db, downtown, uptown)).toThrow();
    expect(() => mergeStation(db, downtown, pullUpStation)).toThrow();
    expect(() => mergeStation(db, downtown, downtown)).toThrow();
    expect(getExerciseProgress(db, chestPress.id, "en")!.stations).toHaveLength(2);
  });

  test("a renamed Station reads by its new label", async () => {
    const { db, gymId } = await libraryDatabase();
    logWorkout(db, { gymId, exerciseId: chestPress.id, at: 1_000, loads: [50] });
    const { station } = selected(db, chestPress.id);

    renameStation(db, station.id, "  Hammer Strength ");

    expect(selected(db, chestPress.id).station.label).toBe("Hammer Strength");
  });
});

describe("deleting a Station", () => {
  test("counts the sets logged on it and the Workouts they were logged in", async () => {
    const { db, gymId } = await libraryDatabase();
    logWorkout(db, { gymId, exerciseId: chestPress.id, at: 1_000, loads: [50, 55] });
    logWorkout(db, { gymId, exerciseId: chestPress.id, at: 2_000, loads: [60] });
    const { station } = selected(db, chestPress.id);
    // An unconfirmed set in the Workout in progress was never part of any history.
    const workoutId = startWorkout(db, { gymId, timeZone: TIME_ZONE, now: 3_000 });
    addWorkoutExercise(db, workoutId, chestPress.id);

    expect(stationHistoryCounts(db, station.id)).toEqual({ sets: 3, workouts: 2 });
  });

  test("drops the Exercises logged on it from their Workouts, and Workouts left empty", async () => {
    const { db, gymId } = await libraryDatabase();
    const alone = logWorkout(db, { gymId, exerciseId: chestPress.id, at: 1_000, loads: [50] });
    const { station } = selected(db, chestPress.id);
    const shared = startWorkout(db, { gymId, timeZone: TIME_ZONE, now: 2_000 });
    addWorkoutExercise(db, shared, chestPress.id);
    addWorkoutExercise(db, shared, pullUp.id);
    for (const entry of getLedger(db, shared, "en")!.exercises) {
      confirmSet(db, entry.sets[0]!.id, { load: 0, reps: 10 });
    }
    finishWorkout(db, shared, { now: 2_001 });

    deleteStation(db, station.id);

    expect(getExerciseProgress(db, chestPress.id, "en")?.stations).toEqual([]);
    expect(getLedger(db, alone, "en")).toBeUndefined();
    expect(getLedger(db, shared, "en")!.exercises.map((entry) => entry.exercise.id)).toEqual([
      pullUp.id,
    ]);
  });

  test("keeps an Exercise of the Workout in progress with nothing logged on it yet", async () => {
    const { db, gymId } = await libraryDatabase();
    logWorkout(db, { gymId, exerciseId: chestPress.id, at: 1_000, loads: [50] });
    const workoutId = startWorkout(db, { gymId, timeZone: TIME_ZONE, now: 2_000 });
    addWorkoutExercise(db, workoutId, chestPress.id);
    const { station } = getLedger(db, workoutId, "en")!.exercises[0]!;

    deleteStation(db, station!.id);

    expect(getLedger(db, workoutId, "en")!.exercises).toMatchObject([
      { exercise: { id: chestPress.id }, station: null },
    ]);
  });
});
