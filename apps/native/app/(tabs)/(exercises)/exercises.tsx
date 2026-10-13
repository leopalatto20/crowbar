import { FieldGroup, Host, Text } from "@expo/ui";
import { Stack } from "expo-router";
import { Suspense, useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { MUSCLE_GROUPS } from "@/lib/exercise/model";
import { useExercises } from "@/lib/exercise/use-exercises";
import { useI18n } from "@/lib/i18n";

export default function ExercisesTab() {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
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
      {/* Here rather than the app-wide boundary, so the first read blanks only this tab. */}
      <Suspense fallback={null}>
        <ExerciseLibrary search={search} />
      </Suspense>
    </>
  );
}

function ExerciseLibrary({ search }: { search: string }) {
  const { t } = useI18n();
  const exercises = useExercises(search);

  if (exercises.length === 0) {
    const query = search.trim();
    return <EmptyState message={query ? t.exercises.noMatches(query) : t.empty.exercises} />;
  }

  const sections = [...MUSCLE_GROUPS, null]
    .map((muscleGroup) => ({
      muscleGroup,
      listings: exercises.filter((listing) => listing.muscleGroup === muscleGroup),
    }))
    .filter((section) => section.listings.length > 0);

  return (
    <Host style={{ flex: 1 }}>
      <FieldGroup>
        {sections.map(({ muscleGroup, listings }) => (
          <FieldGroup.Section
            key={muscleGroup ?? "none"}
            title={muscleGroup ? t.muscleGroup[muscleGroup] : t.exercises.noMuscleGroup}
          >
            {listings.map((listing) => (
              <Text key={listing.id}>{listing.name}</Text>
            ))}
          </FieldGroup.Section>
        ))}
      </FieldGroup>
    </Host>
  );
}
