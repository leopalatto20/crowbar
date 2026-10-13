import { Stack } from "expo-router";

import { EmptyState } from "@/components/empty-state";
import { useI18n } from "@/lib/i18n";

export default function HistoryTab() {
  const { t } = useI18n();
  return (
    <>
      <Stack.Screen options={{ title: t.tabs.history }} />
      <EmptyState message={t.empty.history} />
    </>
  );
}
