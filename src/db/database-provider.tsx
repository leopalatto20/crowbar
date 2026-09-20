import { SQLiteProvider } from "expo-sqlite";
import { useCallback, useState, type PropsWithChildren, type ReactNode } from "react";

import { migrateDatabase } from "./migrate";

type DatabaseProviderProps = PropsWithChildren<{
  fallback?: (onRetry: () => void) => ReactNode;
}>;

export function DatabaseProvider({ children, fallback }: DatabaseProviderProps): React.JSX.Element {
  const [error, setError] = useState<Error | null>(null);
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback((): void => {
    setError(null);
    setAttempt((currentAttempt) => currentAttempt + 1);
  }, []);

  if (error) {
    return <>{fallback ? fallback(retry) : children}</>;
  }

  return (
    <SQLiteProvider
      key={attempt}
      databaseName="crowbar.db"
      onInit={migrateDatabase}
      onError={setError}
    >
      {children}
    </SQLiteProvider>
  );
}
