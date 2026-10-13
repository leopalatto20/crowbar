import { Stack } from "expo-router";

import { EmptyState } from "@/components/empty-state";
import { useI18n } from "@/lib/i18n";

export default function SettingsTab() {
  const { t } = useI18n();
  return (
    <>
      <Stack.Screen options={{ title: t.tabs.settings }} />
      <EmptyState message={t.empty.settings} />
    </>
  );
}
