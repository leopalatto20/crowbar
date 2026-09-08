import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import AppTabs from '@/components/app-tabs';

import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { getDb, migrateDb } from '@/db';
import '@/global.css';

/**
 * Opens the on-device database and applies pending migrations before the app
 * renders its first screen. A failing/pending migration is a startup state, never
 * a crash: on unsupported platforms (e.g. web, where expo-sqlite has no backing
 * store) the app still boots with the same surface.
 */
function DbBootstrap({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await migrateDb(getDb());
      } catch (error) {
        console.error('Persistence unavailable (migration failed); continuing.', error);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) return null;
  return <>{children}</>;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <GluestackUIProvider mode="dark">
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <DbBootstrap>
          <AppTabs />
        </DbBootstrap>
      </ThemeProvider>
    </GluestackUIProvider>
  );
}
