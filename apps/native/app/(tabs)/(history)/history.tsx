import { Stack, useRouter } from "expo-router";
import { Suspense } from "react";

import { EmptyState } from "@/components/empty-state";
import { HistoryList } from "@/components/history/history-list";
import { useDb } from "@/db/context";
import { logPastWorkout } from "@/db/workouts";
import { useLastGym } from "@/lib/gym/use-last-gym";
import { useI18n } from "@/lib/i18n";
import { useRoutines } from "@/lib/routine/use-routine";
import { currentTimeZone } from "@/lib/workout/time";
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
  const db = useDb();
  const router = useRouter();
  const { t } = useI18n();
  const months = useHistory();
  const routines = useRoutines();
  const { atLastGym: log, prompt: gymPrompt } = useLastGym(
    (gymId, routineId: string | undefined) => {
      const id = logPastWorkout(db, { gymId, timeZone: currentTimeZone(), routineId });
      router.push({ pathname: "/log-workout", params: { id } });
    },
    { title: t.gymPrompt.newGymTitle, confirmLabel: t.gymPrompt.add },
  );

  return (
    <>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Menu icon="plus" accessibilityLabel={t.history.logWorkout}>
          <Stack.Toolbar.MenuAction icon="plus" onPress={() => log(undefined)}>
            {t.history.emptyWorkout}
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.Menu inline title={t.history.routines} hidden={routines.length === 0}>
            {routines.map((routine) => (
              <Stack.Toolbar.MenuAction key={routine.id} onPress={() => log(routine.id)}>
                {routine.name || t.routine.untitled}
              </Stack.Toolbar.MenuAction>
            ))}
          </Stack.Toolbar.Menu>
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>
      {months.length === 0 ? (
        <EmptyState message={t.empty.history} />
      ) : (
        <HistoryList
          months={months}
          onOpen={(id) => router.push({ pathname: "/past-workout", params: { id } })}
        />
      )}
      {gymPrompt}
    </>
  );
}
