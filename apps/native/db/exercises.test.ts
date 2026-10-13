import { describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";

import type { BuiltInExercise } from "./built-in-exercises";
import { listExercises, searchExercises, seedBuiltInExercises } from "./exercises";
import type { Database } from "./database";
import { exercise } from "./schema";
import { createTestDatabase } from "./test-database";

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

// Hiding belongs to Exercise management (#41); until it exists, tests set the flag directly.
function hide(db: Database, id: string) {
  db.update(exercise).set({ hidden: true }).where(eq(exercise.id, id)).run();
}

describe("listExercises", () => {
  test("lists Built-in Exercises with their Muscle group, in name order", async () => {
    const db = await createTestDatabase();
    seedBuiltInExercises(db, [pullUp, benchPress]);

    expect(listExercises(db, "en")).toEqual([
      { id: "barbell-bench-press", name: "Barbell Bench Press", muscleGroup: "chest" },
      { id: "pull-up", name: "Pull-Up", muscleGroup: "lats" },
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

  test("leaves out Hidden Exercises", async () => {
    const db = await createTestDatabase();
    seedBuiltInExercises(db, [benchPress, pullUp]);
    hide(db, "pull-up");

    expect(listExercises(db, "en").map((listing) => listing.id)).toEqual(["barbell-bench-press"]);
  });
});

describe("seedBuiltInExercises", () => {
  test("a new app version adds its Built-in Exercises and keeps Hidden ones hidden", async () => {
    const db = await createTestDatabase();
    seedBuiltInExercises(db, [benchPress]);
    hide(db, "barbell-bench-press");

    seedBuiltInExercises(db, [benchPress, pullUp]);

    expect(listExercises(db, "en").map((listing) => listing.id)).toEqual(["pull-up"]);
  });

  test("a new app version's corrected names replace the old ones", async () => {
    const db = await createTestDatabase();
    seedBuiltInExercises(db, [{ ...pullUp, name: { en: "Pullup", es: "Dominadas" } }]);

    seedBuiltInExercises(db, [pullUp]);

    expect(listExercises(db, "en")[0]?.name).toBe("Pull-Up");
    expect(listExercises(db, "es")[0]?.name).toBe("Dominada");
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

  test("an empty search matches every Exercise", async () => {
    const db = await createTestDatabase();
    seedBuiltInExercises(db, [benchPress, pullUp]);

    expect(searchExercises(listExercises(db, "en"), "  ")).toHaveLength(2);
  });
});
