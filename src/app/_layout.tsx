import { Stack } from "expo-router";

import AppProviders from "./app-providers";
import { PreferenceLoadStateScreen } from "../features/training-preferences/ui/preference-load-state-screen";
import { useTrainingPreferences } from "../features/training-preferences/training-preferences-provider";

export function RootNavigator(): React.JSX.Element {
  const { retry, state } = useTrainingPreferences();

  if (state.status === "loading") {
    return <PreferenceLoadStateScreen />;
  }

  if (state.status === "load-error") {
    return <PreferenceLoadStateScreen error onRetry={retry} />;
  }

  const hasPreference = state.metric !== null;

  return (
    <Stack>
      <Stack.Protected guard={!hasPreference}>
        <Stack.Screen name="index" />
      </Stack.Protected>
      <Stack.Protected guard={hasPreference}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AppProviders>
      <RootNavigator />
    </AppProviders>
  );
}
