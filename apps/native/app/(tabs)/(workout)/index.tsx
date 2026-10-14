import { Stack, useRouter } from "expo-router";
import { Suspense, useState } from "react";

import { RoutineList } from "@/components/routine/routine-list";
import { useDb } from "@/db/context";
import { createRoutine, deleteRoutine, duplicateRoutine, reorderRoutines } from "@/db/routines";
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
  const reordering = editing && routines.length > 0;

  function edit(id: string) {
    router.push({ pathname: "/routine", params: { id } });
  }

  return (
    <>
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          hidden={routines.length === 0}
          onPress={() => setEditing(!reordering)}
        >
          {reordering ? t.workoutTab.done : t.workoutTab.edit}
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon="plus"
          accessibilityLabel={t.workoutTab.newRoutine}
          onPress={() => edit(createRoutine(db, ""))}
        />
      </Stack.Toolbar>
      <RoutineList
        routines={routines}
        editing={reordering}
        onCreate={() => edit(createRoutine(db, ""))}
        onEdit={edit}
        onDuplicate={(routine) =>
          duplicateRoutine(db, routine.id, t.workoutTab.copyName(routine.name))
        }
        onDelete={(id) => deleteRoutine(db, id)}
        onReorder={(ids) => reorderRoutines(db, ids)}
      />
    </>
  );
}
