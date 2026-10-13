import { Stack } from "expo-router";

import { RoutineEditor } from "@/components/routine/routine-editor";
import { useColors } from "@/lib/theme";

export default function RoutineScreen() {
  const p = useColors();
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
