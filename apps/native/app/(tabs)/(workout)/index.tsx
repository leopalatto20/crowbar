import { Stack, useRouter } from "expo-router";
import { Suspense, useState } from "react";

import { GymNamePrompt } from "@/components/gym-name-prompt";
import { RoutineList } from "@/components/routine/routine-list";
import { useDb } from "@/db/context";
import { createGym, lastUsedGym } from "@/db/gyms";
import { createRoutine, deleteRoutine, duplicateRoutine, reorderRoutines } from "@/db/routines";
import { currentWorkoutId, startWorkout } from "@/db/workouts";
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

  function openLedger(gymId: string) {
    // Until one Workout at a time is enforced with its own prompt, starting again resumes it.
    if (!currentWorkoutId(db)) {
      startWorkout(db, { gymId, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone });
    }
    router.push("/workout");
  }

  function startEmptyWorkout() {
    const gym = lastUsedGym(db);
    if (gym) openLedger(gym.id);
    else setNamingGym(true);
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
        onStartEmptyWorkout={startEmptyWorkout}
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
    </>
  );
}
