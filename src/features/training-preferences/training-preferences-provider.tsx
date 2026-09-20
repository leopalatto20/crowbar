import { useSQLiteContext } from "expo-sqlite";
import type { PropsWithChildren } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  createTrainingPreferencesRepository,
  type TrainingPreferencesRepository,
} from "./data/training-preferences-repository";
import type { EffortMetric } from "./model/effort";

export type TrainingPreferencesState =
  | { status: "loading"; metric: null }
  | { status: "ready"; metric: EffortMetric | null }
  | { status: "load-error"; metric: null; error: unknown }
  | { status: "saving"; metric: EffortMetric | null; pendingMetric: EffortMetric }
  | { status: "save-error"; metric: EffortMetric | null; error: unknown };

export type TrainingPreferencesContextValue = {
  state: TrainingPreferencesState;
  metric: EffortMetric | null;
  retry: () => void;
  save: (metric: EffortMetric) => Promise<void>;
};

const TrainingPreferencesContext = createContext<TrainingPreferencesContextValue | null>(null);

type TrainingPreferencesProviderProps = PropsWithChildren<{
  repository?: TrainingPreferencesRepository;
}>;

export function TrainingPreferencesProvider({
  repository: providedRepository,
  children,
}: TrainingPreferencesProviderProps): React.JSX.Element {
  const database = useSQLiteContext();
  const repository = useMemo(
    () => providedRepository ?? createTrainingPreferencesRepository(database),
    [database, providedRepository],
  );
  const [state, setState] = useState<TrainingPreferencesState>({
    status: "loading",
    metric: null,
  });
  const [loadAttempt, setLoadAttempt] = useState(0);
  const currentMetric = useRef<EffortMetric | null>(null);
  const saveQueue = useRef<Promise<void> | null>(null);

  useEffect(() => {
    currentMetric.current = state.metric;
  }, [state.metric]);

  useEffect(() => {
    let active = true;

    void repository
      .read()
      .then((metric) => {
        /* istanbul ignore else: the unmounted branch is guarded by the cleanup test. */
        if (active) {
          setState({ status: "ready", metric });
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setState({ status: "load-error", metric: null, error });
        }
      });

    return () => {
      active = false;
    };
  }, [loadAttempt, repository]);

  const retry = useCallback((): void => {
    setState({ status: "loading", metric: null });
    setLoadAttempt((attempt) => attempt + 1);
  }, []);

  const save = useCallback(
    async (metric: EffortMetric): Promise<void> => {
      const previousSave = saveQueue.current ?? Promise.resolve();
      const saveOperation = previousSave.then(async () => {
        const priorMetric = currentMetric.current;
        setState({ status: "saving", metric: priorMetric, pendingMetric: metric });

        try {
          await repository.save(metric);
          currentMetric.current = metric;
          setState({ status: "ready", metric });
        } catch (error: unknown) {
          setState({ status: "save-error", metric: priorMetric, error });
        }
      });

      saveQueue.current = saveOperation.then(
        () => undefined,
        () => undefined,
      );
      await saveOperation;
    },
    [repository],
  );

  const value = useMemo<TrainingPreferencesContextValue>(
    () => ({ state, metric: state.metric, retry, save }),
    [retry, save, state],
  );

  return (
    <TrainingPreferencesContext.Provider value={value}>
      {children}
    </TrainingPreferencesContext.Provider>
  );
}

export function useTrainingPreferences(): TrainingPreferencesContextValue {
  const context = useContext(TrainingPreferencesContext);

  if (!context) {
    throw new Error("useTrainingPreferences must be used within TrainingPreferencesProvider");
  }

  return context;
}
