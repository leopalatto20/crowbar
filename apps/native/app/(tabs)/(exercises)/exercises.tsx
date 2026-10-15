import { Stack, useRouter } from "expo-router";
import { Suspense, useState } from "react";

import { CustomExerciseSheet } from "@/components/custom-exercise-sheet";
import { EmptyState } from "@/components/empty-state";
import { ExerciseLibraryList } from "@/components/exercise-library";
import { searchExercises } from "@/db/exercises";
import { useExerciseLibrary } from "@/lib/exercise/use-exercises";
import { useI18n } from "@/lib/i18n";

export default function ExercisesTab() {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
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
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon="plus"
          accessibilityLabel={t.exercises.newExercise}
          onPress={() => setCreating(true)}
        />
      </Stack.Toolbar>
      <CustomExerciseSheet
        name={creating ? "" : null}
        onClose={() => setCreating(false)}
        onSave={() => setCreating(false)}
      />
      {/* Here rather than the app-wide boundary, so the first read blanks only this tab. */}
      <Suspense fallback={null}>
        <ExerciseLibrary search={search} />
      </Suspense>
    </>
  );
}

function ExerciseLibrary({ search }: { search: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const library = useExerciseLibrary();
  const exercises = searchExercises(library, search);
  const anyHidden = library.some((listing) => listing.hidden);

  const query = search.trim();
  if (exercises.length === 0 && (query || !anyHidden)) {
    return <EmptyState message={query ? t.exercises.noMatches(query) : t.empty.exercises} />;
  }

  return (
    <ExerciseLibraryList
      listings={exercises}
      onOpenHidden={anyHidden ? () => router.push("/hidden-exercises") : undefined}
    />
  );
}
