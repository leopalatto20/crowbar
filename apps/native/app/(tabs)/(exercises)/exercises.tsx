import { Stack, useRouter } from "expo-router";
import { Suspense, useState } from "react";

import { CustomExerciseSheet } from "@/components/custom-exercise-sheet";
import { EmptyState } from "@/components/empty-state";
import { ExerciseLibraryList } from "@/components/exercise-library";
import { FILTER_ICON, FILTER_ON_ICON } from "@/components/filter-icons";
import { filterExercises, searchExercises } from "@/db/exercises";
import {
  EQUIPMENT_TYPES,
  type ExerciseFilters,
  NO_FILTERS,
  anyFilterOn,
} from "@/lib/exercise/model";
import { type DoneFilter, useDoneFilter, useExerciseLibrary } from "@/lib/exercise/use-exercises";
import { useCurrentGym } from "@/lib/gym/use-gyms";
import { useI18n } from "@/lib/i18n";

export default function ExercisesTab() {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  // The tab's root screen lives as long as the app, so filters last the run but not a relaunch.
  const [filters, setFilters] = useState(NO_FILTERS);
  const [creating, setCreating] = useState(false);
  return (
    <>
      <Stack.Screen
        options={{
          title: t.tabs.exercises,
          headerSearchBarOptions: {
            placeholder: t.exercises.search,
            autoCapitalize: "none",
            onChangeText: (event) => setSearch(event.nativeEvent.text),
            onCancelButtonPress: () => setSearch(""),
          },
        }}
      />
      <CustomExerciseSheet name={creating ? "" : null} onClose={() => setCreating(false)} />
      {/* Here rather than the app-wide boundary, so the first read blanks only this tab. */}
      <Suspense fallback={null}>
        <ExerciseLibrary
          search={search}
          filters={filters}
          onChangeFilters={setFilters}
          onCreate={() => setCreating(true)}
        />
      </Suspense>
    </>
  );
}

function ExerciseLibrary({
  search,
  filters,
  onChangeFilters,
  onCreate,
}: {
  search: string;
  filters: ExerciseFilters;
  onChangeFilters: (filters: ExerciseFilters) => void;
  onCreate: () => void;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const library = useExerciseLibrary();
  const done = useDoneFilter(useCurrentGym());
  // Done is left out while there's no Current Gym to name.
  const applied = done ? filters : { ...filters, done: false };
  const exercises = filterExercises(
    searchExercises(library, search),
    applied,
    done?.exerciseIds ?? new Set(),
  );
  const anyHidden = library.some((listing) => listing.hidden);
  const query = search.trim();

  const toolbar = (
    <ExercisesToolbar
      filters={applied}
      done={done}
      onChangeFilters={onChangeFilters}
      onCreate={onCreate}
    />
  );

  if (exercises.length === 0 && anyFilterOn(applied)) {
    return (
      <>
        {toolbar}
        <EmptyState
          message={t.exerciseFilters.noMatches}
          action={{ label: t.exerciseFilters.clear, onPress: () => onChangeFilters(NO_FILTERS) }}
        />
      </>
    );
  }
  if (exercises.length === 0 && (query || !anyHidden)) {
    return (
      <>
        {toolbar}
        <EmptyState message={query ? t.exercises.noMatches(query) : t.empty.exercises} />
      </>
    );
  }

  return (
    <>
      {toolbar}
      <ExerciseLibraryList
        listings={exercises}
        // A search or filter is looking for one Exercise, not learning the list.
        withMenuHint={!query && !anyFilterOn(applied)}
        onOpenHidden={anyHidden ? () => router.push("/hidden-exercises") : undefined}
      />
    </>
  );
}

// Inside the Suspense boundary, since the Done filter is named after the Current Gym. Muscle
// group is left out: the tab already has Muscle group sections.
function ExercisesToolbar({
  filters,
  done,
  onChangeFilters,
  onCreate,
}: {
  filters: ExerciseFilters;
  done: DoneFilter | null;
  onChangeFilters: (filters: ExerciseFilters) => void;
  onCreate: () => void;
}) {
  const { t } = useI18n();
  return (
    <Stack.Toolbar placement="right">
      <Stack.Toolbar.Menu
        icon={anyFilterOn(filters) ? FILTER_ON_ICON : FILTER_ICON}
        accessibilityLabel={t.exerciseFilters.filter}
      >
        <Stack.Toolbar.Menu title={t.exerciseFilters.equipmentType}>
          <Stack.Toolbar.MenuAction
            isOn={filters.equipmentType === null}
            onPress={() => onChangeFilters({ ...filters, equipmentType: null })}
          >
            {t.exerciseFilters.any}
          </Stack.Toolbar.MenuAction>
          {EQUIPMENT_TYPES.map((equipmentType) => (
            <Stack.Toolbar.MenuAction
              key={equipmentType}
              isOn={filters.equipmentType === equipmentType}
              onPress={() => onChangeFilters({ ...filters, equipmentType })}
            >
              {t.equipmentType[equipmentType]}
            </Stack.Toolbar.MenuAction>
          ))}
        </Stack.Toolbar.Menu>
        <Stack.Toolbar.MenuAction
          hidden={done === null}
          isOn={filters.done}
          onPress={() => onChangeFilters({ ...filters, done: !filters.done })}
        >
          {done?.label ?? ""}
        </Stack.Toolbar.MenuAction>
        <Stack.Toolbar.MenuAction
          isOn={filters.custom}
          onPress={() => onChangeFilters({ ...filters, custom: !filters.custom })}
        >
          {t.exerciseFilters.custom}
        </Stack.Toolbar.MenuAction>
      </Stack.Toolbar.Menu>
      <Stack.Toolbar.Button
        icon="plus"
        accessibilityLabel={t.exercises.newExercise}
        onPress={onCreate}
      />
    </Stack.Toolbar>
  );
}
