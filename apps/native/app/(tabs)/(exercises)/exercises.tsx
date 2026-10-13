import { Stack } from "expo-router";

import { EmptyState } from "@/components/empty-state";
import { useI18n } from "@/lib/i18n";

export default function ExercisesTab() {
  const { t } = useI18n();
  return (
    <>
      <Stack.Screen options={{ title: t.tabs.exercises }} />
      <EmptyState message={t.empty.exercises} />
    </>
  );
}
