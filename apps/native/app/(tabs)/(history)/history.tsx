import { Stack, useRouter } from "expo-router";
import { Suspense } from "react";

import { EmptyState } from "@/components/empty-state";
import { HistoryList } from "@/components/history/history-list";
import { useI18n } from "@/lib/i18n";
import { useHistory } from "@/lib/workout/use-workout";

export default function HistoryTab() {
  const { t } = useI18n();
  return (
    <>
      <Stack.Screen options={{ title: t.tabs.history }} />
      <Suspense fallback={null}>
        <History />
      </Suspense>
    </>
  );
}

function History() {
  const router = useRouter();
  const { t } = useI18n();
  const months = useHistory();
  if (months.length === 0) return <EmptyState message={t.empty.history} />;
  return (
    <HistoryList
      months={months}
      onOpen={(id) => router.push({ pathname: "/past-workout", params: { id } })}
    />
  );
}
