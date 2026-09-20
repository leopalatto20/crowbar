import { router } from "expo-router";

import { TrainingPreferencesSettingsScreen } from "../../../features/training-preferences/ui/training-preferences-settings-screen";

export default function TrainingPreferencesSettings(): React.JSX.Element {
  return <TrainingPreferencesSettingsScreen onSaved={() => router.replace("/(app)")} />;
}
