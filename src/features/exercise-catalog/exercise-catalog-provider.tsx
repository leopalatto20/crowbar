import { useSQLiteContext } from "expo-sqlite";
import { useTranslation } from "react-i18next";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";

import {
  createExerciseCatalogRepository,
  type ExerciseCatalogRepository,
  type ExerciseCatalogSnapshot,
  type PersistedCustomExercise,
} from "./data/exercise-catalog-repository";
import {
  type CatalogExercise,
  type CatalogMutationResult,
  exerciseIdSchema,
  muscleGroupSchema,
  type ExerciseId,
  type MuscleGroup,
} from "./model/catalog";
import { type CustomExerciseInput, parseCustomExerciseName } from "./model/custom-exercise";
import {
  composeCatalogExercises,
  listCatalogExercises,
  resolveCatalogExercise,
} from "./model/catalog-selectors";

export type ExerciseCatalogState =
  | Readonly<{ status: "loading"; exercises: readonly CatalogExercise[] }>
  | Readonly<{ status: "ready"; exercises: readonly CatalogExercise[] }>
  | Readonly<{ status: "load-error"; exercises: readonly CatalogExercise[]; error: unknown }>
  | Readonly<{ status: "mutating"; exercises: readonly CatalogExercise[] }>
  | Readonly<{ status: "mutation-error"; exercises: readonly CatalogExercise[]; error: unknown }>;

export type ExerciseCatalogContextValue = Readonly<{
  state: ExerciseCatalogState;
  listAvailable: (
    query?: string,
    muscleGroup?: MuscleGroup | null,
  ) => readonly CatalogExercise[];
  listUnavailable: (
    query?: string,
    muscleGroup?: MuscleGroup | null,
  ) => readonly CatalogExercise[];
  resolve: (id: ExerciseId) => CatalogExercise | null;
  createCustom: (input: CustomExerciseInput) => Promise<CatalogMutationResult<ExerciseId>>;
  updateCustom: (
    id: ExerciseId,
    input: CustomExerciseInput,
  ) => Promise<CatalogMutationResult<CatalogExercise>>;
  setAvailability: (
    id: ExerciseId,
    isAvailable: boolean,
  ) => Promise<CatalogMutationResult<CatalogExercise>>;
  retryLoad: () => void;
}>;

type CatalogStatus = ExerciseCatalogState["status"];

type ExerciseCatalogProviderProps = PropsWithChildren<{
  repository?: ExerciseCatalogRepository;
}>;

const emptySnapshot: ExerciseCatalogSnapshot = {
  customExercises: [],
  hiddenBuiltinIds: [],
};

const ExerciseCatalogContext = createContext<ExerciseCatalogContextValue | null>(null);

export function ExerciseCatalogProvider({
  repository: providedRepository,
  children,
}: ExerciseCatalogProviderProps): React.JSX.Element {
  const database = useSQLiteContext();
  const repository = useMemo(
    () => providedRepository ?? createExerciseCatalogRepository(database),
    [database, providedRepository],
  );
  const { i18n, t } = useTranslation();
  const [snapshot, setSnapshot] = useState<ExerciseCatalogSnapshot>(emptySnapshot);
  const [status, setStatus] = useState<CatalogStatus>("loading");
  const [error, setError] = useState<unknown>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const snapshotRef = useRef(snapshot);
  const mutationQueue = useRef<Promise<void> | null>(null);
  const mutationEpoch = useRef(0);
  const language = i18n.resolvedLanguage ?? i18n.language;
  const exercises = useMemo(
    () => composeCatalogExercises(snapshot.customExercises, snapshot.hiddenBuiltinIds, t),
    [snapshot, t],
  );

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  useEffect(() => {
    let active = true;
    // A load started before or during a mutation may not include its durable result.
    const loadMutationEpoch = mutationEpoch.current;

    void repository
      .read()
      .then((nextSnapshot) => {
        if (active && mutationEpoch.current === loadMutationEpoch) {
          snapshotRef.current = nextSnapshot;
          setSnapshot(nextSnapshot);
          setError(null);
          setStatus("ready");
        }
      })
      .catch((nextError: unknown) => {
        if (active && mutationEpoch.current === loadMutationEpoch) {
          setError(nextError);
          setStatus("load-error");
        }
      });

    return () => {
      active = false;
    };
  }, [loadAttempt, repository]);

  const retryLoad = useCallback((): void => {
    setError(null);
    setStatus("loading");
    setLoadAttempt((attempt) => attempt + 1);
  }, []);

  const updateSnapshot = useCallback((nextSnapshot: ExerciseCatalogSnapshot): void => {
    snapshotRef.current = nextSnapshot;
    setSnapshot(nextSnapshot);
    setError(null);
    setStatus("ready");
  }, []);

  const runMutation = useCallback(
    <T,>(operation: () => Promise<CatalogMutationResult<T>>): Promise<CatalogMutationResult<T>> => {
      const previousMutation = mutationQueue.current ?? Promise.resolve();
      const mutation = previousMutation.then(async () => {
        mutationEpoch.current += 1;

        try {
          setError(null);
          setStatus("mutating");
          const result = await operation();
          if (!result.ok && result.reason !== "persistence-error") {
            setStatus("ready");
          }
          return result;
        } finally {
          mutationEpoch.current += 1;
        }
      });

      mutationQueue.current = mutation.then(
        () => undefined,
        () => undefined,
      );

      return mutation;
    },
    [],
  );

  const createCustom = useCallback(
    (input: CustomExerciseInput): Promise<CatalogMutationResult<ExerciseId>> => {
      const parsedInput = parseInput(input);
      if (!parsedInput) {
        return Promise.resolve({ ok: false, reason: "invalid-input" });
      }

      return runMutation(async () => {
        if (
          snapshotRef.current.customExercises.some(
            (exercise) => exercise.nameKey === parsedInput.nameKey,
          )
        ) {
          return { ok: false, reason: "duplicate-name" };
        }

        try {
          const createdExercise = await repository.createCustom(parsedInput);
          const nextSnapshot = {
            ...snapshotRef.current,
            customExercises: [...snapshotRef.current.customExercises, createdExercise],
          };
          updateSnapshot(nextSnapshot);
          return { ok: true, value: createdExercise.id };
        } catch (nextError: unknown) {
          setError(nextError);
          setStatus("mutation-error");
          return { ok: false, reason: "persistence-error" };
        }
      });
    },
    [repository, runMutation, updateSnapshot],
  );

  const updateCustom = useCallback(
    (
      id: ExerciseId,
      input: CustomExerciseInput,
    ): Promise<CatalogMutationResult<CatalogExercise>> => {
      if (!exerciseIdSchema.safeParse(id).success) {
        return Promise.resolve({ ok: false, reason: "invalid-input" });
      }

      const parsedInput = parseInput(input);
      if (!parsedInput) {
        return Promise.resolve({ ok: false, reason: "invalid-input" });
      }

      return runMutation(async () => {
        const currentExercise = resolveCatalogExercise(
          composeSnapshot(snapshotRef.current, t),
          id,
        );
        if (!currentExercise) {
          return { ok: false, reason: "not-found" };
        }
        if (currentExercise.origin === "builtin") {
          return { ok: false, reason: "immutable-builtin" };
        }
        if (
          snapshotRef.current.customExercises.some(
            (exercise) => exercise.id !== id && exercise.nameKey === parsedInput.nameKey,
          )
        ) {
          return { ok: false, reason: "duplicate-name" };
        }

        try {
          const updatedExercise = await repository.updateCustom(id, parsedInput);
          if (!updatedExercise) {
            return { ok: false, reason: "not-found" };
          }

          const nextSnapshot = {
            ...snapshotRef.current,
            customExercises: replaceCustomExercise(
              snapshotRef.current.customExercises,
              updatedExercise,
            ),
          };
          updateSnapshot(nextSnapshot);
          return { ok: true, value: toCatalogExercise(updatedExercise) };
        } catch (nextError: unknown) {
          setError(nextError);
          setStatus("mutation-error");
          return { ok: false, reason: "persistence-error" };
        }
      });
    },
    [repository, runMutation, t, updateSnapshot],
  );

  const setAvailability = useCallback(
    (
      id: ExerciseId,
      isAvailable: boolean,
    ): Promise<CatalogMutationResult<CatalogExercise>> => {
      if (!exerciseIdSchema.safeParse(id).success || typeof isAvailable !== "boolean") {
        return Promise.resolve({ ok: false, reason: "invalid-input" });
      }

      return runMutation(async () => {
        const currentExercise = resolveCatalogExercise(
          composeSnapshot(snapshotRef.current, t),
          id,
        );
        if (!currentExercise) {
          return { ok: false, reason: "not-found" };
        }

        try {
          if (currentExercise.origin === "custom") {
            const updatedExercise = await repository.setCustomAvailability(id, isAvailable);
            if (!updatedExercise) {
              return { ok: false, reason: "not-found" };
            }

            updateSnapshot({
              ...snapshotRef.current,
              customExercises: replaceCustomExercise(
                snapshotRef.current.customExercises,
                updatedExercise,
              ),
            });
            return { ok: true, value: toCatalogExercise(updatedExercise) };
          }

          await repository.setBuiltinAvailability(id, isAvailable);
          const hiddenBuiltinIds = isAvailable
            ? snapshotRef.current.hiddenBuiltinIds.filter((hiddenId) => hiddenId !== id)
            : [...new Set([...snapshotRef.current.hiddenBuiltinIds, id])];
          const nextExercise = { ...currentExercise, isAvailable };
          updateSnapshot({ ...snapshotRef.current, hiddenBuiltinIds });
          return { ok: true, value: nextExercise };
        } catch (nextError: unknown) {
          setError(nextError);
          setStatus("mutation-error");
          return { ok: false, reason: "persistence-error" };
        }
      });
    },
    [repository, runMutation, t, updateSnapshot],
  );

  const state = useMemo<ExerciseCatalogState>(() => {
    if (status === "load-error") {
      return { status, exercises, error };
    }
    if (status === "mutation-error") {
      return { status, exercises, error };
    }

    return { status, exercises };
  }, [error, exercises, status]);

  const listAvailable = useCallback(
    (query?: string, muscleGroup?: MuscleGroup | null): readonly CatalogExercise[] =>
      listCatalogExercises(exercises, {
        availability: "available",
        query,
        muscleGroup,
        language,
      }),
    [exercises, language],
  );

  const listUnavailable = useCallback(
    (query?: string, muscleGroup?: MuscleGroup | null): readonly CatalogExercise[] =>
      listCatalogExercises(exercises, {
        availability: "unavailable",
        query,
        muscleGroup,
        language,
      }),
    [exercises, language],
  );

  const resolve = useCallback(
    (id: ExerciseId): CatalogExercise | null => resolveCatalogExercise(exercises, id),
    [exercises],
  );

  const value = useMemo<ExerciseCatalogContextValue>(
    () => ({
      state,
      listAvailable,
      listUnavailable,
      resolve,
      createCustom,
      updateCustom,
      setAvailability,
      retryLoad,
    }),
    [createCustom, listAvailable, listUnavailable, resolve, retryLoad, setAvailability, state, updateCustom],
  );

  return <ExerciseCatalogContext.Provider value={value}>{children}</ExerciseCatalogContext.Provider>;
}

export function useExerciseCatalog(): ExerciseCatalogContextValue {
  const context = useContext(ExerciseCatalogContext);

  if (!context) {
    throw new Error("useExerciseCatalog must be used within ExerciseCatalogProvider");
  }

  return context;
}

function parseInput(input: CustomExerciseInput):
  | Readonly<{ displayName: string; nameKey: string; muscleGroup: MuscleGroup }>
  | null {
  if (
    typeof input !== "object" ||
    input === null ||
    typeof input.displayName !== "string" ||
    !muscleGroupSchema.safeParse(input.muscleGroup).success
  ) {
    return null;
  }

  const parsedName = parseCustomExerciseName(input.displayName);
  if (!parsedName.ok) {
    return null;
  }

  return { ...parsedName.value, muscleGroup: input.muscleGroup };
}

function composeSnapshot(
  snapshot: ExerciseCatalogSnapshot,
  translate: (key: string) => string,
): readonly CatalogExercise[] {
  return composeCatalogExercises(snapshot.customExercises, snapshot.hiddenBuiltinIds, translate);
}

function replaceCustomExercise(
  exercises: readonly PersistedCustomExercise[],
  updatedExercise: PersistedCustomExercise,
): readonly PersistedCustomExercise[] {
  return exercises.map((exercise) => (exercise.id === updatedExercise.id ? updatedExercise : exercise));
}

function toCatalogExercise(exercise: PersistedCustomExercise): CatalogExercise {
  return {
    id: exercise.id,
    displayName: exercise.displayName,
    muscleGroup: exercise.muscleGroup,
    origin: "custom",
    isAvailable: exercise.isAvailable,
  };
}
