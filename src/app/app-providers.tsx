import { I18nextProvider } from "react-i18next";
import { StyleSheet } from "react-native";

import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import { Spinner } from "@/components/ui/spinner";
import { VStack } from "@/components/ui/vstack";
import { DatabaseProvider } from "../db/database-provider";
import { TrainingPreferencesProvider } from "../features/training-preferences/training-preferences-provider";
import { PreferenceLoadStateScreen } from "../features/training-preferences/ui/preference-load-state-screen";
import { i18n, i18nReady } from "../i18n";
import { useEffect, useState, type PropsWithChildren } from "react";

export default function AppProviders({
  children,
}: PropsWithChildren): React.JSX.Element {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void i18nReady.then(() => setReady(true));
  }, []);

  return (
    <GluestackUIProvider>
      <I18nextProvider i18n={i18n}>
        {ready ? (
          <DatabaseProvider
            fallback={(onRetry) => <PreferenceLoadStateScreen error onRetry={onRetry} />}
          >
            <TrainingPreferencesProvider>{children}</TrainingPreferencesProvider>
          </DatabaseProvider>
        ) : (
          <VStack style={styles.container}>
            <Spinner />
          </VStack>
        )}
      </I18nextProvider>
    </GluestackUIProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
});
