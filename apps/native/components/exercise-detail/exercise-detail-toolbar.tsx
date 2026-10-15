import { Stack } from "expo-router";

import { LEDGER_MENU_ICON } from "@/components/workout/ledger-icons";
import { useDb } from "@/db/context";
import { hideExercise, unhideExercise } from "@/db/exercises";
import type { ExerciseProgress, ProgressStation } from "@/db/progress";
import { retireStation, returnStationToService, setStationUnit } from "@/db/stations";
import { useI18n } from "@/lib/i18n";
import { UNITS } from "@/lib/workout/model";

import { stationName } from "./station-name";

// Actions that need a prompt, a confirm or a sheet are handed back; the rest act at once.
export type ExerciseDetailActions = {
  onRename: () => void;
  onEditNotes: () => void;
  onMerge: (target: ProgressStation) => void;
  onDeleteStation: () => void;
  onEditExercise: () => void;
  onDeleteExercise: () => void;
};

// Stack.Toolbar.Menu takes only menus and actions as its direct children, so the whole menu is
// written out here rather than split into components.
export function ExerciseDetailToolbar({
  exerciseId,
  progress,
  onDone,
  ...actions
}: ExerciseDetailActions & {
  exerciseId: string;
  progress: ExerciseProgress;
  onDone?: () => void;
}) {
  const db = useDb();
  const i18n = useI18n();
  const { t } = i18n;
  const selected = progress.selected;
  const current = selected?.station;
  // Merging never crosses Exercises or Gyms, and every Station here is of this Exercise.
  const mergeTargets = current
    ? progress.stations.filter(({ id, gymId }) => gymId === current.gymId && id !== current.id)
    : [];
  // A Bodyweight load is weight added to the body, which no Stack level can express.
  const units = UNITS.filter(
    (unit) => unit !== "level" || selected?.format.loadType !== "bodyweight",
  );

  return (
    <Stack.Toolbar placement="right">
      {onDone && (
        <Stack.Toolbar.Button variant="done" onPress={onDone}>
          {t.exerciseDetail.done}
        </Stack.Toolbar.Button>
      )}
      <Stack.Toolbar.Menu icon={LEDGER_MENU_ICON} accessibilityLabel={t.stationActions.more}>
        {current && (
          <Stack.Toolbar.Menu inline title={stationName(current, i18n)}>
            <Stack.Toolbar.MenuAction icon="character.cursor.ibeam" onPress={actions.onRename}>
              {t.stationActions.rename}
            </Stack.Toolbar.MenuAction>
            <Stack.Toolbar.MenuAction icon="pin" onPress={actions.onEditNotes}>
              {selected.notes ? t.ledger.editNotes : t.ledger.addNotes}
            </Stack.Toolbar.MenuAction>
            <Stack.Toolbar.Menu title={t.stationActions.changeUnit} icon="scalemass">
              {units.map((unit) => (
                <Stack.Toolbar.MenuAction
                  key={unit}
                  isOn={unit === current.unit}
                  onPress={() => setStationUnit(db, current.id, unit)}
                >
                  {t.unitName[unit]}
                </Stack.Toolbar.MenuAction>
              ))}
            </Stack.Toolbar.Menu>
            {current.retired ? (
              <Stack.Toolbar.MenuAction
                icon="arrow.uturn.backward"
                onPress={() => returnStationToService(db, current.id)}
              >
                {t.stationActions.returnToService}
              </Stack.Toolbar.MenuAction>
            ) : (
              <Stack.Toolbar.MenuAction
                icon="archivebox"
                onPress={() => retireStation(db, current.id)}
              >
                {t.stationActions.retire}
              </Stack.Toolbar.MenuAction>
            )}
            <Stack.Toolbar.Menu
              title={t.stationActions.mergeInto}
              icon="arrow.triangle.merge"
              hidden={mergeTargets.length === 0}
            >
              {mergeTargets.map((target) => (
                <Stack.Toolbar.MenuAction key={target.id} onPress={() => actions.onMerge(target)}>
                  {stationName(target, i18n)}
                </Stack.Toolbar.MenuAction>
              ))}
            </Stack.Toolbar.Menu>
            <Stack.Toolbar.MenuAction icon="trash" destructive onPress={actions.onDeleteStation}>
              {t.stationActions.delete}
            </Stack.Toolbar.MenuAction>
          </Stack.Toolbar.Menu>
        )}
        <Stack.Toolbar.Menu inline title={progress.name}>
          <Stack.Toolbar.MenuAction
            icon="pencil"
            hidden={progress.builtIn}
            onPress={actions.onEditExercise}
          >
            {t.exercises.edit}
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction
            icon={progress.hidden ? "eye" : "eye.slash"}
            onPress={() =>
              progress.hidden ? unhideExercise(db, exerciseId) : hideExercise(db, exerciseId)
            }
          >
            {progress.hidden ? t.exercises.unhide : t.exercises.hide}
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction
            icon="trash"
            destructive
            hidden={progress.builtIn}
            onPress={actions.onDeleteExercise}
          >
            {t.exercises.delete}
          </Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
      </Stack.Toolbar.Menu>
    </Stack.Toolbar>
  );
}
