import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { drizzle } from "drizzle-orm/expo-sqlite";
import { migrate } from "drizzle-orm/expo-sqlite/migrator";
import { File } from "expo-file-system";
import { getLocales } from "expo-localization";
import * as SplashScreen from "expo-splash-screen";
import { type SQLiteDatabase, SQLiteProvider, useSQLiteContext } from "expo-sqlite";
import { Component, type ReactNode, Suspense, useEffect, useMemo } from "react";

import { DatabaseFailure } from "@/components/database-failure";
import { useSettings } from "@/lib/settings";

import { BUILT_IN_EXERCISES } from "./built-in-exercises";
import { DatabaseContext } from "./context";
import { seedBuiltInExercises } from "./exercises";
import migrations from "./migrations/migrations";
import { type Snapshot, openDatabase } from "./open";
import { invalidateOnChange } from "./query";
import * as schema from "./schema";
import { seedSettings } from "./settings";

void SplashScreen.preventAutoHideAsync();

// Module constants: SQLiteProvider reopens the database whenever these change identity.
const OPEN_OPTIONS = { enableChangeListener: true };
const queryClient = new QueryClient();

class DatabaseOpenError extends Error {}

async function initDatabase(sqlite: SQLiteDatabase) {
  const db = drizzle(sqlite, { schema });
  await openDatabase(db, {
    migrate: () => migrate(db, migrations),
    snapshot: snapshotBeside(sqlite.databasePath),
  });
  seedSettings(db, getLocales()[0]?.regionCode ?? null);
  seedBuiltInExercises(db, BUILT_IN_EXERCISES);
}

// Covers both opening the file and initDatabase, so OpenFailureBoundary can tell these apart
// from errors anywhere else in the app.
// The cause's message is repeated because error overlays and crash reports show only the top one.
function rethrowAsOpenError(cause: Error): never {
  throw new DatabaseOpenError(`Crowbar couldn't open its database: ${cause.message}`, { cause });
}

function snapshotBeside(databasePath: string): Snapshot {
  const path = databasePath.replace(/\.db$/, "-pre-migration.db");
  const file = new File(`file://${path}`);
  return { path, exists: () => file.exists, delete: () => file.delete() };
}

// Opens the database behind the splash screen. Children render only once migrations have run
// and settings are loaded; if opening fails, a blocking error replaces the whole app.
export function DatabaseProvider({ children }: { children: ReactNode }) {
  return (
    <OpenFailureBoundary>
      <SQLiteProvider
        databaseName="crowbar.db"
        options={OPEN_OPTIONS}
        onInit={initDatabase}
        onError={rethrowAsOpenError}
      >
        <DatabaseReady>{children}</DatabaseReady>
      </SQLiteProvider>
    </OpenFailureBoundary>
  );
}

function DatabaseReady({ children }: { children: ReactNode }) {
  const sqlite = useSQLiteContext();
  const db = useMemo(() => drizzle(sqlite, { schema }), [sqlite]);
  useEffect(() => invalidateOnChange(queryClient), []);

  return (
    <DatabaseContext value={db}>
      <QueryClientProvider client={queryClient}>
        <Suspense fallback={null}>
          <SettingsLoaded>{children}</SettingsLoaded>
        </Suspense>
      </QueryClientProvider>
    </DatabaseContext>
  );
}

// Every screen may read settings. Loading them here, and keeping them observed for the app's
// lifetime, means no screen ever suspends on them; the splash hides once they're in.
function SettingsLoaded({ children }: { children: ReactNode }) {
  useSettings();
  useEffect(() => SplashScreen.hide(), []);
  return children;
}

class OpenFailureBoundary extends Component<{ children: ReactNode }, { error: unknown }> {
  state: { error: unknown } = { error: null };

  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  render() {
    const { error } = this.state;
    if (error === null) return this.props.children;
    // Errors from the rest of the app belong to the boundaries above this one.
    if (!(error instanceof DatabaseOpenError)) throw error;
    return <DatabaseFailure />;
  }
}
