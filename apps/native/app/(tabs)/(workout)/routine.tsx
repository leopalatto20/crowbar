import { Stack, useLocalSearchParams } from "expo-router";

import { RoutineEditor } from "@/components/routine/routine-editor";
import { useColors } from "@/lib/theme";

export default function RoutineScreen() {
  const p = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <>
      <Stack.Screen
        options={{
          headerLargeTitle: false,
          headerStyle: { backgroundColor: p.background },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: "minimal",
        }}
      />
      <RoutineEditor id={id} />
    </>
  );
}
