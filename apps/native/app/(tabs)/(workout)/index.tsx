import { Stack, useRouter } from "expo-router";
import { Suspense, useState } from "react";

import { GymNamePrompt } from "@/components/gym-name-prompt";
import { RoutineList } from "@/components/routine/routine-list";
import { WorkoutInProgressAlert } from "@/components/workout-in-progress-alert";
import { useDb } from "@/db/context";
import { createGym, lastUsedGym } from "@/db/gyms";
import { createRoutine, deleteRoutine, duplicateRoutine, reorderRoutines } from "@/db/routines";
import { currentWorkoutId, discardAndStartWorkout, startWorkout } from "@/db/workouts";
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
  const [namingGym, setNamingGym] = useState(false);
  const [askingAboutCurrent, setAskingAboutCurrent] = useState(false);

  function openLedger(gymId: string) {
    startWorkout(db, { gymId, timeZone: currentTimeZone() });
    router.push("/workout");
  }

  function startEmptyWorkout() {
    const gym = lastUsedGym(db);
    if (gym) openLedger(gym.id);
    else setNamingGym(true);
  }

  function requestEmptyWorkout() {
    if (currentWorkoutId(db)) setAskingAboutCurrent(true);
    else startEmptyWorkout();
  }

  // A Workout in progress always has a Gym, so the new one starts at that Gym, read before the
  // discard drops it out of the last-used Gym.
  function discardAndStartEmptyWorkout() {
    setAskingAboutCurrent(false);
    const current = currentWorkoutId(db);
    const gym = lastUsedGym(db);
    if (!current || !gym) return;
    discardAndStartWorkout(db, current, { gymId: gym.id, timeZone: currentTimeZone() });
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
        onStartEmptyWorkout={requestEmptyWorkout}
        onCreate={create}
        onEdit={edit}
        onDuplicate={(routine) =>
          duplicateRoutine(db, routine.id, t.workoutTab.copyName(routine.name))
        }
        onDelete={remove}
        onReorder={(ids) => reorderRoutines(db, ids)}
      />
      <GymNamePrompt
        visible={namingGym}
        onSave={(name) => {
          setNamingGym(false);
          openLedger(createGym(db, name));
        }}
        onDismiss={() => setNamingGym(false)}
      />
      <WorkoutInProgressAlert
        visible={askingAboutCurrent}
        onResume={() => {
          setAskingAboutCurrent(false);
          router.push("/workout");
        }}
        onDiscardAndStart={discardAndStartEmptyWorkout}
        onDismiss={() => setAskingAboutCurrent(false)}
      />
    </>
  );
}

function currentTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
