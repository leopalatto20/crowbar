import { describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";

import { BUILT_IN_EXERCISES, type BuiltInExercise } from "./built-in-exercises";
import {
  createCustomExercise,
  exerciseNamed,
  listExercises,
  searchExercises,
  seedBuiltInExercises,
  unhideExercise,
} from "./exercises";
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
      {
        id: "barbell-bench-press",
        name: "Barbell Bench Press",
        muscleGroup: "chest",
        hidden: false,
        names: ["Barbell Bench Press", "Press de banca con barra"],
      },
      {
        id: "pull-up",
        name: "Pull-Up",
        muscleGroup: "lats",
        hidden: false,
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
    hide(db, "pull-up");

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
    expect(db.select().from(exercise).where(eq(exercise.id, created.id)).get()).toMatchObject({
      equipmentType: "other",
      loadType: "external",
      unilateral: false,
      builtIn: false,
    });
  });
});

describe("exerciseNamed", () => {
  test("finds the Exercise with exactly this name in any case, Hidden ones included", async () => {
    const db = await createTestDatabase();
    seedBuiltInExercises(db, [benchPress, pullUp]);
    hide(db, "pull-up");
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

describe("unhideExercise", () => {
  test("brings a Hidden Exercise back into search", async () => {
    const db = await createTestDatabase();
    seedBuiltInExercises(db, [benchPress, pullUp]);
    hide(db, "pull-up");

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
    hide(db, "pull-up");

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
    hide(db, "barbell-bench-press");

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
    hide(db, "pull-up");

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
