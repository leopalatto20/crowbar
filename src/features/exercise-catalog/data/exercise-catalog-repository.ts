import type { SQLiteDatabase } from "expo-sqlite";
import { z } from "zod";

import { builtinExercises } from "./builtin-exercises";
import { exerciseIdSchema, muscleGroupSchema, type ExerciseId, type MuscleGroup } from "../model/catalog";
import { parseCustomExerciseName } from "../model/custom-exercise";

export type PersistedCustomExercise = Readonly<{
  id: ExerciseId;
  displayName: string;
  nameKey: string;
  muscleGroup: MuscleGroup;
  isAvailable: boolean;
}>;

export type CustomExerciseWriteInput = Readonly<{
  displayName: string;
  nameKey: string;
  muscleGroup: MuscleGroup;
}>;

export type ExerciseCatalogSnapshot = Readonly<{
  customExercises: readonly PersistedCustomExercise[];
  hiddenBuiltinIds: readonly ExerciseId[];
}>;

export type ExerciseCatalogRepository = {
  read: () => Promise<ExerciseCatalogSnapshot>;
  createCustom: (input: CustomExerciseWriteInput) => Promise<PersistedCustomExercise>;
  updateCustom: (
    id: ExerciseId,
    input: CustomExerciseWriteInput,
  ) => Promise<PersistedCustomExercise | null>;
  setCustomAvailability: (
    id: ExerciseId,
    isAvailable: boolean,
  ) => Promise<PersistedCustomExercise | null>;
  setBuiltinAvailability: (
    id: ExerciseId,
    isAvailable: boolean,
  ) => Promise<Readonly<{ id: ExerciseId; isAvailable: boolean }>>;
};

export class InvalidPersistedExerciseCatalogError extends Error {
  constructor() {
    super("Exercise catalog storage contains invalid data.");
    this.name = "InvalidPersistedExerciseCatalogError";
  }
}

type ExerciseCatalogDatabase = Pick<
  SQLiteDatabase,
  "getAllAsync" | "getFirstAsync" | "runAsync" | "withExclusiveTransactionAsync"
>;

type ExerciseCatalogTransaction = Pick<SQLiteDatabase, "getFirstAsync" | "runAsync">;

const customExerciseRowSchema = z
  .strictObject({
    exercise_id: exerciseIdSchema,
    display_name: z.string(),
    name_key: z.string(),
    muscle_group: muscleGroupSchema,
    is_available: z.union([z.literal(0), z.literal(1)]),
  })
  .superRefine((row, context) => {
    const parsedName = parseCustomExerciseName(row.display_name);
    if (
      !parsedName.ok ||
      parsedName.value.displayName !== row.display_name ||
      parsedName.value.nameKey !== row.name_key
    ) {
      context.addIssue({ code: "custom", message: "Invalid custom exercise name." });
    }
  })
  .transform((row): PersistedCustomExercise => ({
    id: row.exercise_id,
    displayName: row.display_name,
    nameKey: row.name_key,
    muscleGroup: row.muscle_group,
    isAvailable: row.is_available === 1,
  }));

const customExerciseRowsSchema = z.array(customExerciseRowSchema).superRefine((rows, context) => {
  const ids = new Set<ExerciseId>();
  const nameKeys = new Set<string>();

  rows.forEach((row, index) => {
    if (ids.has(row.id)) {
      context.addIssue({ code: "custom", message: `Duplicate exercise ID at row ${index}.` });
    }
    if (nameKeys.has(row.nameKey)) {
      context.addIssue({ code: "custom", message: `Duplicate exercise name key at row ${index}.` });
    }
    ids.add(row.id);
    nameKeys.add(row.nameKey);
  });
});

const hiddenBuiltinExerciseRowSchema = z.strictObject({
  exercise_id: exerciseIdSchema,
});

const hiddenBuiltinExerciseRowsSchema = z
  .array(hiddenBuiltinExerciseRowSchema)
  .superRefine((rows, context) => {
    const ids = new Set<ExerciseId>();

    rows.forEach((row, index) => {
      if (ids.has(row.exercise_id)) {
        context.addIssue({ code: "custom", message: `Duplicate hidden built-in ID at row ${index}.` });
      }
      ids.add(row.exercise_id);
    });
  });

const customExerciseWriteInputSchema = z
  .strictObject({
    displayName: z.string(),
    nameKey: z.string(),
    muscleGroup: muscleGroupSchema,
  })
  .superRefine((input, context) => {
    const parsedName = parseCustomExerciseName(input.displayName);
    if (
      !parsedName.ok ||
      parsedName.value.displayName !== input.displayName ||
      parsedName.value.nameKey !== input.nameKey
    ) {
      context.addIssue({ code: "custom", message: "Invalid custom exercise input." });
    }
  });

const readCustomExercisesSql = `
  SELECT exercise_id, display_name, name_key, muscle_group, is_available
  FROM custom_exercises
`;

const readHiddenBuiltinExercisesSql = `
  SELECT exercise_id
  FROM hidden_builtin_exercises
`;

const createCustomExerciseSql = `
  INSERT INTO custom_exercises (exercise_id, display_name, name_key, muscle_group)
  VALUES (lower(hex(randomblob(16))), ?, ?, ?)
`;

const readCustomExerciseByNameKeySql = `
  SELECT exercise_id, display_name, name_key, muscle_group, is_available
  FROM custom_exercises
  WHERE name_key = ?
`;

const updateCustomExerciseSql = `
  UPDATE custom_exercises
  SET display_name = ?, name_key = ?, muscle_group = ?
  WHERE exercise_id = ?
`;

const updateCustomExerciseAvailabilitySql = `
  UPDATE custom_exercises
  SET is_available = ?
  WHERE exercise_id = ?
`;

const readCustomExerciseByIdSql = `
  SELECT exercise_id, display_name, name_key, muscle_group, is_available
  FROM custom_exercises
  WHERE exercise_id = ?
`;

const hideBuiltinExerciseSql = `
  INSERT OR IGNORE INTO hidden_builtin_exercises (exercise_id)
  VALUES (?)
`;

const restoreBuiltinExerciseSql = `
  DELETE FROM hidden_builtin_exercises
  WHERE exercise_id = ?
`;

const builtinIds = new Set<ExerciseId>(builtinExercises.map((exercise) => exercise.id));

export function createExerciseCatalogRepository(
  database: ExerciseCatalogDatabase,
): ExerciseCatalogRepository {
  return {
    async read(): Promise<ExerciseCatalogSnapshot> {
      const [customRows, hiddenRows] = await Promise.all([
        database.getAllAsync<unknown>(readCustomExercisesSql),
        database.getAllAsync<unknown>(readHiddenBuiltinExercisesSql),
      ]);
      const customExercises = customExerciseRowsSchema.safeParse(customRows);
      const hiddenBuiltinExercises = hiddenBuiltinExerciseRowsSchema.safeParse(hiddenRows);

      if (
        !customExercises.success ||
        !hiddenBuiltinExercises.success ||
        hiddenBuiltinExercises.data.some((row) => !builtinIds.has(row.exercise_id))
      ) {
        throw new InvalidPersistedExerciseCatalogError();
      }

      return {
        customExercises: customExercises.data,
        hiddenBuiltinIds: hiddenBuiltinExercises.data.map((row) => row.exercise_id),
      };
    },

    async createCustom(input: CustomExerciseWriteInput): Promise<PersistedCustomExercise> {
      const validatedInput = validateCustomExerciseWriteInput(input);
      let created: PersistedCustomExercise | null = null;

      await database.withExclusiveTransactionAsync(async (transaction) => {
        const result = await transaction.runAsync(
          createCustomExerciseSql,
          validatedInput.displayName,
          validatedInput.nameKey,
          validatedInput.muscleGroup,
        );
        if (result.changes !== 1) {
          throw new InvalidPersistedExerciseCatalogError();
        }

        created = await readCustomExerciseByNameKey(transaction, validatedInput.nameKey);
        if (created.nameKey !== validatedInput.nameKey) {
          throw new InvalidPersistedExerciseCatalogError();
        }
      });

      if (created === null) {
        throw new InvalidPersistedExerciseCatalogError();
      }

      return created;
    },

    async updateCustom(
      id: ExerciseId,
      input: CustomExerciseWriteInput,
    ): Promise<PersistedCustomExercise | null> {
      const validatedId = validateExerciseId(id);
      const validatedInput = validateCustomExerciseWriteInput(input);
      let updated: PersistedCustomExercise | null = null;

      await database.withExclusiveTransactionAsync(async (transaction) => {
        const result = await transaction.runAsync(
          updateCustomExerciseSql,
          validatedInput.displayName,
          validatedInput.nameKey,
          validatedInput.muscleGroup,
          validatedId,
        );
        if (result.changes === 0) {
          return;
        }
        if (result.changes !== 1) {
          throw new InvalidPersistedExerciseCatalogError();
        }

        updated = await readCustomExerciseById(transaction, validatedId);
      });

      return updated;
    },

    async setCustomAvailability(
      id: ExerciseId,
      isAvailable: boolean,
    ): Promise<PersistedCustomExercise | null> {
      const validatedId = validateExerciseId(id);
      const validatedAvailability = validateAvailability(isAvailable);
      let updated: PersistedCustomExercise | null = null;

      await database.withExclusiveTransactionAsync(async (transaction) => {
        const result = await transaction.runAsync(
          updateCustomExerciseAvailabilitySql,
          validatedAvailability ? 1 : 0,
          validatedId,
        );
        if (result.changes === 0) {
          return;
        }
        if (result.changes !== 1) {
          throw new InvalidPersistedExerciseCatalogError();
        }

        updated = await readCustomExerciseById(transaction, validatedId);
      });

      return updated;
    },

    async setBuiltinAvailability(
      id: ExerciseId,
      isAvailable: boolean,
    ): Promise<Readonly<{ id: ExerciseId; isAvailable: boolean }>> {
      const validatedId = validateExerciseId(id);
      const validatedAvailability = validateAvailability(isAvailable);

      if (!builtinIds.has(validatedId)) {
        throw new InvalidPersistedExerciseCatalogError();
      }

      await database.withExclusiveTransactionAsync(async (transaction) => {
        const result = await transaction.runAsync(
          validatedAvailability ? restoreBuiltinExerciseSql : hideBuiltinExerciseSql,
          validatedId,
        );
        if (result.changes !== 0 && result.changes !== 1) {
          throw new InvalidPersistedExerciseCatalogError();
        }
      });

      return { id: validatedId, isAvailable: validatedAvailability };
    },
  };
}

function validateCustomExerciseWriteInput(
  input: CustomExerciseWriteInput,
): CustomExerciseWriteInput {
  const parsedInput = customExerciseWriteInputSchema.safeParse(input);
  if (!parsedInput.success) {
    throw new InvalidPersistedExerciseCatalogError();
  }

  return parsedInput.data;
}

function validateExerciseId(id: ExerciseId): ExerciseId {
  const parsedId = exerciseIdSchema.safeParse(id);
  if (!parsedId.success) {
    throw new InvalidPersistedExerciseCatalogError();
  }

  return parsedId.data;
}

function validateAvailability(isAvailable: boolean): boolean {
  const parsedAvailability = z.boolean().safeParse(isAvailable);
  if (!parsedAvailability.success) {
    throw new InvalidPersistedExerciseCatalogError();
  }

  return parsedAvailability.data;
}

async function readCustomExerciseByNameKey(
  database: ExerciseCatalogTransaction,
  nameKey: string,
): Promise<PersistedCustomExercise> {
  const row = await database.getFirstAsync<unknown>(readCustomExerciseByNameKeySql, nameKey);
  const parsedRow = customExerciseRowSchema.safeParse(row);

  if (!parsedRow.success || parsedRow.data.nameKey !== nameKey) {
    throw new InvalidPersistedExerciseCatalogError();
  }

  return parsedRow.data;
}

async function readCustomExerciseById(
  database: Pick<SQLiteDatabase, "getFirstAsync">,
  id: ExerciseId,
): Promise<PersistedCustomExercise> {
  const row = await database.getFirstAsync<unknown>(readCustomExerciseByIdSql, id);
  const parsedRow = customExerciseRowSchema.safeParse(row);

  if (!parsedRow.success || parsedRow.data.id !== id) {
    throw new InvalidPersistedExerciseCatalogError();
  }

  return parsedRow.data;
}
