import { Stack } from "expo-router";

import { RoutineEditor } from "@/components/routine/routine-editor";
import { usePalette } from "@/lib/palette";

export default function RoutineScreen() {
  const p = usePalette();
  return (
    <>
      <Stack.Screen
        options={{
          headerStyle: { backgroundColor: p.background },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: "minimal",
        }}
      />
      <RoutineEditor />
    </>
  );
}
