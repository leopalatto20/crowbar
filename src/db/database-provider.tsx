import { SQLiteProvider } from "expo-sqlite";
import type { PropsWithChildren } from "react";

import { migrateDatabase } from "./migrate";

export function DatabaseProvider({ children }: PropsWithChildren): React.JSX.Element {
  return (
    <SQLiteProvider databaseName="crowbar.db" onInit={migrateDatabase}>
      {children}
    </SQLiteProvider>
  );
}
