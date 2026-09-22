import {
  catalogExerciseSchema,
  exerciseIdSchema,
  muscleGroupOrder,
  muscleGroupSchema,
  type CatalogMutationFailure,
  type CatalogExercise,
  type ExerciseId,
} from "../model/catalog";
import {
  parseCustomExerciseName,
  type CustomExerciseInput,
  type CustomExerciseNameFailure,
} from "../model/custom-exercise";

describe("exercise catalog model", () => {
  it("defines all muscle groups in their fixed order", () => {
    expect(muscleGroupOrder).toEqual([
      "chest",
      "upper-back",
      "lats",
      "shoulders",
      "biceps",
      "triceps",
      "forearms",
      "quads",
      "hamstrings",
      "glutes",
      "calves",
      "adductors",
      "core",
      "lower-back",
    ]);

    for (const muscleGroup of muscleGroupOrder) {
      expect(muscleGroupSchema.safeParse(muscleGroup).success).toBe(true);
    }
  });

  it("accepts valid opaque exercise IDs and rejects other shapes", () => {
    const parsedId = exerciseIdSchema.parse("0123456789abcdef0123456789abcdef");
    const brandedId: ExerciseId = parsedId;

    expect(brandedId).toBe("0123456789abcdef0123456789abcdef");
    expect(exerciseIdSchema.safeParse(brandedId).success).toBe(true);
    expect(exerciseIdSchema.safeParse("0123456789ABCDEF0123456789abcdef").success).toBe(false);
    expect(exerciseIdSchema.safeParse("0123456789abcdef").success).toBe(false);
    expect(exerciseIdSchema.safeParse("0123456789abcdef0123456789abcdeg").success).toBe(false);
  });

  it("validates the public catalog exercise shape", () => {
    const exercise: CatalogExercise = {
      id: "0123456789abcdef0123456789abcdef" as ExerciseId,
      displayName: "Bench Press",
      muscleGroup: "chest",
      origin: "builtin",
      isAvailable: true,
    };

    expect(catalogExerciseSchema.parse(exercise)).toEqual(exercise);
    expect(
      catalogExerciseSchema.safeParse({ ...exercise, origin: "unsupported" }).success,
    ).toBe(false);

    expect(
      catalogExerciseSchema.parse({
        ...exercise,
        origin: "custom",
        isAvailable: false,
      }),
    ).toEqual({ ...exercise, origin: "custom", isAvailable: false });
  });

  it("exposes the complete custom input and mutation failure contracts", () => {
    const input: CustomExerciseInput = {
      displayName: "Incline Press",
      muscleGroup: "chest",
    };
    const failures: CatalogMutationFailure[] = [
      "invalid-input",
      "duplicate-name",
      "not-found",
      "immutable-builtin",
      "persistence-error",
    ];

    expect(input.muscleGroup).toBe("chest");
    expect(failures).toHaveLength(5);
  });
});

describe("parseCustomExerciseName", () => {
  it("trims display text and creates a deterministic duplicate key", () => {
    expect(parseCustomExerciseName("  Incline Press  ")).toEqual({
      ok: true,
      value: {
        displayName: "Incline Press",
        nameKey: "incline press",
      },
    });
  });

  it.each([
    "a",
    "a".repeat(80),
    "😀".repeat(80),
  ])("accepts names from one through 80 Unicode code points: %s", (name) => {
    expect(parseCustomExerciseName(name).ok).toBe(true);
  });

  it.each<CustomExerciseNameFailure>(["blank", "too-long", "invalid-characters"])(
    "rejects %s custom names",
    (reason) => {
      const input = {
        blank: " \t\n ",
        "too-long": "a".repeat(81),
        "invalid-characters": "Clean\u0000Name",
      }[reason];

      expect(parseCustomExerciseName(input)).toEqual({ ok: false, reason });
    },
  );

  it("rejects Unicode format characters", () => {
    expect(parseCustomExerciseName("Clean\u200BName")).toEqual({
      ok: false,
      reason: "invalid-characters",
    });
  });

  it("uses case-insensitive NFC keys while preserving accent differences", () => {
    expect(parseCustomExerciseName("Café")).toEqual({
      ok: true,
      value: { displayName: "Café", nameKey: "café" },
    });
    expect(parseCustomExerciseName("CAFÉ")).toEqual({
      ok: true,
      value: { displayName: "CAFÉ", nameKey: "café" },
    });
    expect(parseCustomExerciseName("Cafe")).toEqual({
      ok: true,
      value: { displayName: "Cafe", nameKey: "cafe" },
    });
  });

  it("gives composed and decomposed names the same key", () => {
    const composed = parseCustomExerciseName("Café");
    const decomposed = parseCustomExerciseName("Cafe\u0301");

    expect(composed.ok && decomposed.ok).toBe(true);
    if (composed.ok && decomposed.ok) {
      expect(composed.value.nameKey).toBe(decomposed.value.nameKey);
      expect(decomposed.value.displayName).toBe("Cafe\u0301");
    }
  });
});
