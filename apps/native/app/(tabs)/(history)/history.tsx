import { Stack, useRouter } from "expo-router";
import { Suspense, useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { HistoryList } from "@/components/history/history-list";
import { NamePrompt } from "@/components/name-prompt";
import { useDb } from "@/db/context";
import { createGym, lastUsedGym } from "@/db/gyms";
import { logPastWorkout } from "@/db/workouts";
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

// A Routine's, or an empty Workout's when routineId is absent.
type PendingLog = { routineId?: string };

function History() {
  const db = useDb();
  const router = useRouter();
  const { t } = useI18n();
  const months = useHistory();
  const routines = useRoutines();
  const [namingGymFor, setNamingGymFor] = useState<PendingLog | null>(null);

  // It starts as the hour just gone, at the Gym last trained at, for the lifter to correct in the
  // Ledger: a forgotten session is usually a recent one.
  function openLedger(gymId: string, { routineId }: PendingLog) {
    const now = Date.now();
    const minuteStart = now - (now % 60_000);
    const id = logPastWorkout(db, {
      gymId,
      timeZone: currentTimeZone(),
      routineId,
      startedAt: minuteStart - 3_600_000,
      now,
    });
    router.push({ pathname: "/log-workout", params: { id } });
  }

  function log(pending: PendingLog) {
    const gym = lastUsedGym(db);
    if (gym) openLedger(gym.id, pending);
    else setNamingGymFor(pending);
  }

  return (
    <>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Menu icon="plus" accessibilityLabel={t.history.logWorkout}>
          <Stack.Toolbar.MenuAction icon="plus" onPress={() => log({})}>
            {t.history.emptyWorkout}
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.Menu inline title={t.history.routines} hidden={routines.length === 0}>
            {routines.map((routine) => (
              <Stack.Toolbar.MenuAction
                key={routine.id}
                onPress={() => log({ routineId: routine.id })}
              >
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
      <NamePrompt
        visible={namingGymFor !== null}
        title={t.gymPrompt.newGymTitle}
        placeholder={t.gymPrompt.placeholder}
        message={t.gymPrompt.message}
        confirmLabel={t.gymPrompt.add}
        onSave={(name) => {
          setNamingGymFor(null);
          if (namingGymFor) openLedger(createGym(db, name), namingGymFor);
        }}
        onDismiss={() => setNamingGymFor(null)}
      />
    </>
  );
}
