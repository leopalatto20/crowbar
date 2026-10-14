import { Stack, useRouter } from "expo-router";
import { Suspense, useState } from "react";

import { GymNamePrompt } from "@/components/gym-name-prompt";
import { RoutineList } from "@/components/routine/routine-list";
import { WorkoutInProgressAlert } from "@/components/workout-in-progress-alert";
import { useDb } from "@/db/context";
import { createGym, lastUsedGym } from "@/db/gyms";
import { createRoutine, deleteRoutine, duplicateRoutine, reorderRoutines } from "@/db/routines";
import { currentWorkout, discardAndStartWorkout, startWorkout } from "@/db/workouts";
import { useI18n } from "@/lib/i18n";
import { useRoutines } from "@/lib/routine/use-routine";

export default function WorkoutTab() {
  const { t } = useI18n();
  return (
    <>
      <Stack.Screen options={{ title: t.tabs.workout }} />
      {/* Here rather than the app-wide boundary, so the first read blanks only this tab. */}
      <Suspense fallback={null}>
        <Routines />
      </Suspense>
    </>
  );
}

function Routines() {
  const db = useDb();
  const router = useRouter();
  const { t } = useI18n();
  const routines = useRoutines().map((routine) => ({
    ...routine,
    name: routine.name || t.routine.untitled,
  }));
  const [editing, setEditing] = useState(false);
  const [namingGymFor, setNamingGymFor] = useState<PendingStart | null>(null);
  const [replacingWith, setReplacingWith] = useState<PendingStart | null>(null);

  function openLedger(gymId: string, { routineId }: PendingStart) {
    startWorkout(db, { gymId, timeZone: currentTimeZone(), routineId });
    router.push("/workout");
  }

  function startAtLastGym(start: PendingStart) {
    const gym = lastUsedGym(db);
    if (gym) openLedger(gym.id, start);
    else setNamingGymFor(start);
  }

  function requestStart(start: PendingStart) {
    if (currentWorkout(db)) setReplacingWith(start);
    else startAtLastGym(start);
  }

  // A Workout in progress always has a Gym, so the new one starts at that Gym, read before the
  // discard drops it out of the last-used Gym.
  function discardAndStart({ routineId }: PendingStart) {
    setReplacingWith(null);
    const current = currentWorkout(db)?.id;
    const gym = lastUsedGym(db);
    if (!current || !gym) return;
    discardAndStartWorkout(db, current, { gymId: gym.id, timeZone: currentTimeZone(), routineId });
    router.push("/workout");
  }

  function edit(id: string) {
    router.push({ pathname: "/routine", params: { id } });
  }

  function create() {
    setEditing(false);
    edit(createRoutine(db, ""));
  }

  function remove(id: string) {
    // Edit mode ends with nothing left to order, so a later first Routine doesn't open in it.
    if (routines.length === 1) setEditing(false);
    deleteRoutine(db, id);
  }

  return (
    <>
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button hidden={routines.length === 0} onPress={() => setEditing(!editing)}>
          {editing ? t.workoutTab.done : t.workoutTab.edit}
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon="plus"
          accessibilityLabel={t.workoutTab.newRoutine}
          onPress={create}
        />
      </Stack.Toolbar>
      <RoutineList
        routines={routines}
        editing={editing}
        onStartEmptyWorkout={() => requestStart({})}
        onStart={(routineId) => requestStart({ routineId })}
        onCreate={create}
        onEdit={edit}
        onDuplicate={(routine) =>
          duplicateRoutine(db, routine.id, t.workoutTab.copyName(routine.name))
        }
        onDelete={remove}
        onReorder={(ids) => reorderRoutines(db, ids)}
      />
      <GymNamePrompt
        visible={namingGymFor !== null}
        title={t.gymPrompt.title}
        message={t.gymPrompt.message}
        confirmLabel={t.gymPrompt.start}
        onSave={(name) => {
          setNamingGymFor(null);
          if (namingGymFor) openLedger(createGym(db, name), namingGymFor);
        }}
        onDismiss={() => setNamingGymFor(null)}
      />
      <WorkoutInProgressAlert
        visible={replacingWith !== null}
        onResume={() => {
          setReplacingWith(null);
          router.push("/workout");
        }}
        onDiscardAndStart={() => replacingWith && discardAndStart(replacingWith)}
        onDismiss={() => setReplacingWith(null)}
      />
    </>
  );
}

// A start held up by the Gym prompt or the in-progress alert: a Routine's, or an empty
// Workout's when routineId is absent.
type PendingStart = { routineId?: string };

function currentTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
