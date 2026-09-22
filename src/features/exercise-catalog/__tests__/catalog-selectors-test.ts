import { builtinExercises } from "../data/builtin-exercises";
import type { PersistedCustomExercise } from "../data/exercise-catalog-repository";
import {
  composeCatalogExercises,
  groupCatalogExercises,
  listCatalogExercises,
  normalizeCatalogLanguage,
  resolveCatalogExercise,
  sortCatalogExercises,
} from "../model/catalog-selectors";
import { muscleGroupOrder, type CatalogExercise, type ExerciseId } from "../model/catalog";

function exerciseId(value: number): ExerciseId {
  return value.toString(16).padStart(32, "0") as ExerciseId;
}

function translate(language: string): (key: string) => string {
  const names = {
    en: {
      "exerciseCatalog.builtins.barbellBenchPress": "Barbell Bench Press",
    },
    es: {
      "exerciseCatalog.builtins.barbellBenchPress": "Press de banca con barra",
    },
  } as const;

  return (key: string): string => names[language === "es" ? "es" : "en"][key as keyof (typeof names)["en"]] ?? key;
}

const customExercises: readonly PersistedCustomExercise[] = [
  {
    id: exerciseId(1),
    displayName: "Café Curl",
    nameKey: "café curl",
    muscleGroup: "biceps",
    isAvailable: true,
  },
  {
    id: exerciseId(2),
    displayName: "Archived Café Curl",
    nameKey: "archived café curl",
    muscleGroup: "biceps",
    isAvailable: false,
  },
];

describe("catalog selectors", () => {
  it("composes localized built-ins and custom exercises while preserving unavailable resolution", () => {
    const catalog = composeCatalogExercises(
      customExercises,
      [builtinExercises[0].id],
      translate("es"),
    );

    expect(catalog).toHaveLength(builtinExercises.length + customExercises.length);
    expect(resolveCatalogExercise(catalog, builtinExercises[0].id)).toMatchObject({
      displayName: "Press de banca con barra",
      origin: "builtin",
      isAvailable: false,
    });
    expect(resolveCatalogExercise(catalog, customExercises[1].id)).toMatchObject({
      displayName: "Archived Café Curl",
      origin: "custom",
      isAvailable: false,
    });
    expect(resolveCatalogExercise(catalog, exerciseId(99))).toBeNull();
  });

  it("falls back to English for unsupported languages", () => {
    const catalog = composeCatalogExercises([], [], translate("fr"));

    expect(normalizeCatalogLanguage("es-MX")).toBe("es");
    expect(normalizeCatalogLanguage("fr-CA")).toBe("en");
    expect(normalizeCatalogLanguage(undefined)).toBe("en");
    expect(catalog[0].displayName).toBe("Barbell Bench Press");
  });

  it("filters availability, groups, and accent-insensitive searches together", () => {
    const catalog = composeCatalogExercises(customExercises, [], translate("en"));

    expect(
      listCatalogExercises(catalog, {
        availability: "available",
        query: "CAFE",
        muscleGroup: "biceps",
        language: "en",
      }).map((exercise) => exercise.id),
    ).toEqual([customExercises[0].id]);
    expect(
      listCatalogExercises(catalog, {
        availability: "unavailable",
        query: "cafe",
        muscleGroup: null,
        language: "en",
      }).map((exercise) => exercise.id),
    ).toEqual([customExercises[1].id]);
    expect(
      listCatalogExercises(catalog, { availability: "available", language: "en" }).every(
        (exercise) => exercise.isAvailable,
      ),
    ).toBe(true);
  });

  it("lists exercises in fixed muscle-group order with localized names within each group", () => {
    const exercises: CatalogExercise[] = [
      {
        id: exerciseId(3),
        displayName: "Alpha Curl",
        muscleGroup: "biceps",
        origin: "custom",
        isAvailable: true,
      },
      {
        id: exerciseId(4),
        displayName: "Zebra Press",
        muscleGroup: "chest",
        origin: "custom",
        isAvailable: true,
      },
    ];

    expect(
      listCatalogExercises(exercises, { availability: "available", language: "en" }).map(
        (exercise) => exercise.id,
      ),
    ).toEqual([exerciseId(4), exerciseId(3)]);
  });

  it("groups every muscle group in the fixed order and omits empty groups", () => {
    const exercises: CatalogExercise[] = muscleGroupOrder.map((muscleGroup, index) => ({
      id: exerciseId(index + 10),
      displayName: muscleGroup,
      muscleGroup,
      origin: "custom",
      isAvailable: true,
    }));

    expect(groupCatalogExercises(exercises).map((group) => group.muscleGroup)).toEqual(
      muscleGroupOrder,
    );
    expect(groupCatalogExercises(exercises.slice(0, 1))).toEqual([
      { muscleGroup: "chest", exercises: [exercises[0]] },
    ]);
  });

  it("sorts with locale names and deterministic exact-name, origin, and ID ties", () => {
    const exercises: CatalogExercise[] = [
      {
        id: exerciseId(30),
        displayName: "Press",
        muscleGroup: "chest",
        origin: "custom",
        isAvailable: true,
      },
      {
        id: exerciseId(31),
        displayName: "Press",
        muscleGroup: "chest",
        origin: "builtin",
        isAvailable: true,
      },
      {
        id: exerciseId(32),
        displayName: "Café",
        muscleGroup: "chest",
        origin: "custom",
        isAvailable: true,
      },
      {
        id: exerciseId(34),
        displayName: "Cafe",
        muscleGroup: "chest",
        origin: "custom",
        isAvailable: true,
      },
      {
        id: exerciseId(33),
        displayName: "Cafe",
        muscleGroup: "chest",
        origin: "custom",
        isAvailable: true,
      },
      {
        id: exerciseId(37),
        displayName: "nube",
        muscleGroup: "chest",
        origin: "custom",
        isAvailable: true,
      },
      {
        id: exerciseId(38),
        displayName: "ñu",
        muscleGroup: "chest",
        origin: "custom",
        isAvailable: true,
      },
    ];

    expect(sortCatalogExercises(exercises, "es").map((exercise) => exercise.id)).toEqual([
      exerciseId(33),
      exerciseId(34),
      exerciseId(32),
      exerciseId(37),
      exerciseId(38),
      exerciseId(31),
      exerciseId(30),
    ]);
    expect(sortCatalogExercises(exercises, "en").map((exercise) => exercise.id)).toEqual([
      exerciseId(33),
      exerciseId(34),
      exerciseId(32),
      exerciseId(38),
      exerciseId(37),
      exerciseId(31),
      exerciseId(30),
    ]);
    expect(sortCatalogExercises(exercises, "fr-CA").map((exercise) => exercise.id)).toEqual([
      exerciseId(33),
      exerciseId(34),
      exerciseId(32),
      exerciseId(38),
      exerciseId(37),
      exerciseId(31),
      exerciseId(30),
    ]);
    expect(sortCatalogExercises([exercises[0], { ...exercises[0] }], "es")).toHaveLength(2);
    expect(
      sortCatalogExercises(
        [
          { ...exercises[3], id: exerciseId(35) },
          { ...exercises[3], id: exerciseId(36) },
        ],
        "es",
      ).map((exercise) => exercise.id),
    ).toEqual([exerciseId(35), exerciseId(36)]);
  });
});
