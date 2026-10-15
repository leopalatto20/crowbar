import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { drizzle } from "drizzle-orm/expo-sqlite";
import { migrate } from "drizzle-orm/expo-sqlite/migrator";
import { File } from "expo-file-system";
import { getLocales } from "expo-localization";
import * as SplashScreen from "expo-splash-screen";
import { type SQLiteDatabase, openDatabaseAsync } from "expo-sqlite";
import { type ReactNode, Suspense, useEffect, useState } from "react";
import { View } from "react-native";

import { DatabaseFailure } from "@/components/database-failure";
import { NoticeDialog } from "@/components/notice-dialog";
import { useI18n } from "@/lib/i18n";
import { useSettings } from "@/lib/settings";
import { useColors } from "@/lib/theme";

import { BUILT_IN_EXERCISES } from "./built-in-exercises";
import { DatabaseContext, type DatabaseReplacement, DatabaseReplacementContext } from "./context";
import type { Database } from "./database";
import { seedBuiltInExercises } from "./exercises";
import migrations from "./migrations/migrations";
import { openDatabase } from "./open";
import { invalidateOnChange } from "./query";
import {
  DATABASE_FILE,
  type DatabaseHost,
  PRE_MIGRATION_FILE,
  type RestoreOutcome,
  restoreBackup,
  undoRestore,
} from "./restore";
import * as schema from "./schema";
import { seedSettings } from "./settings";

void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

type Connection = { sqlite: SQLiteDatabase; db: Database };
type Replacement = { kind: "restore" | "undoRestore"; from: Connection };

// expo-sqlite's default directory is what puts the lifter's data in the OS backup:
// Documents/SQLite on iOS (iCloud and Finder) and filesDir/SQLite on Android (Auto Backup, on
// through Expo's default allowBackup). Moving the database out of it drops that.
async function openConnection(): Promise<Connection> {
  const sqlite = await openDatabaseAsync(DATABASE_FILE, { enableChangeListener: true });
  try {
    const db = drizzle(sqlite, { schema });
    const snapshot = fileBeside(sqlite, PRE_MIGRATION_FILE);
    await openDatabase(db, {
      migrate: () => migrate(db, migrations),
      snapshot: {
        path: snapshot.path,
        exists: () => snapshot.file.exists,
        delete: () => snapshot.file.delete(),
      },
    });
    seedSettings(db, getLocales()[0]?.regionCode ?? null);
    seedBuiltInExercises(db, BUILT_IN_EXERCISES);
    return { sqlite, db };
  } catch (error) {
    await sqlite.closeAsync();
    throw error;
  }
}

function folderOf(sqlite: SQLiteDatabase) {
  return sqlite.databasePath.slice(0, sqlite.databasePath.lastIndexOf("/"));
}

function fileBeside(sqlite: SQLiteDatabase, name: string) {
  const path = `${folderOf(sqlite)}/${name}`;
  return { path, file: new File(`file://${path}`) };
}

// Restoring and undoing reopen the database, so they run here, where the connection lives.
// `connection` is the one in use, swapped for each reopened one.
function hostFor(start: Connection, onOpen: (connection: Connection) => void): DatabaseHost {
  let connection = start;
  const fileAt = (name: string) => fileBeside(connection.sqlite, name).file;
  return {
    path: (name) => fileBeside(connection.sqlite, name).path,
    exists: (name) => fileAt(name).exists,
    remove: (name) => fileAt(name).delete(),
    move: (from, to) => fileAt(from).move(fileAt(to), { overwrite: true }),
    close: () => connection.sqlite.closeAsync(),
    open: async () => {
      connection = await openConnection();
      onOpen(connection);
      return connection.db;
    },
  };
}

// Opens the database behind the splash screen. Children render only once migrations have run
// and settings are loaded; if opening fails, a blocking error replaces the whole app.
export function DatabaseProvider({ children }: { children: ReactNode }) {
  const p = useColors();
  const { t } = useI18n();
  const [connection, setConnection] = useState<Connection | null>(null);
  const [replacement, setReplacement] = useState<Replacement | null>(null);
  const [failed, setFailed] = useState(false);
  // Kept after dismissing, so the notice's text holds while it animates away.
  const [replacementFailure, setReplacementFailure] = useState<{
    kind: Replacement["kind"];
    shown: boolean;
  }>({ kind: "restore", shown: false });

  useEffect(() => {
    openConnection().then(setConnection, failOpening);
  }, []);

  function failOpening(error: unknown) {
    console.error("Crowbar couldn't open its database", error);
    setFailed(true);
  }

  // An effect, so it runs once the app has unmounted and nothing reads the database while its
  // files are swapped. The app then mounts again as at launch, which reopens a Workout in progress
  // in the Ledger.
  useEffect(() => {
    if (!replacement) return;
    const { kind, from } = replacement;
    let reopened = from;
    const host = hostFor(from, (connection) => {
      reopened = connection;
    });
    const replace =
      kind === "restore" ? restoreBackup(from.db, host, Date.now()) : undoRestore(from.db, host);
    replace.then((outcome: RestoreOutcome) => {
      queryClient.clear();
      if (outcome === "failed") setReplacementFailure({ kind, shown: true });
      setReplacement(null);
      setConnection(reopened);
    }, failOpening);
  }, [replacement]);

  if (failed) return <DatabaseFailure />;
  if (replacement) return <View style={{ flex: 1, backgroundColor: p.background }} />;
  if (!connection) return null;

  const replace = (kind: Replacement["kind"]) => {
    setReplacement({ kind, from: connection });
  };
  const replacements: DatabaseReplacement = {
    folder: folderOf(connection.sqlite),
    restore: () => replace("restore"),
    undoRestore: () => replace("undoRestore"),
  };

  return (
    <DatabaseContext value={connection.db}>
      <DatabaseReplacementContext value={replacements}>
        <QueryClientProvider client={queryClient}>
          <ObserveChanges />
          <Suspense fallback={null}>
            <SettingsLoaded>{children}</SettingsLoaded>
          </Suspense>
        </QueryClientProvider>
      </DatabaseReplacementContext>
      <NoticeDialog
        visible={replacementFailure.shown}
        title={t.restore.failedTitle[replacementFailure.kind]}
        message={t.restore.failedMessage[replacementFailure.kind]}
        dismissLabel={t.restore.dismiss}
        onDismiss={() => setReplacementFailure({ ...replacementFailure, shown: false })}
      />
    </DatabaseContext>
  );
}

function ObserveChanges() {
  useEffect(() => invalidateOnChange(queryClient), []);
  return null;
}

// Every screen may read settings. Loading them here, and keeping them observed for the app's
// lifetime, means no screen ever suspends on them; the splash hides once they're in.
function SettingsLoaded({ children }: { children: ReactNode }) {
  useSettings();
  useEffect(() => SplashScreen.hide(), []);
  return children;
}
