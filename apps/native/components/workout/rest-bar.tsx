import { Text, View } from "react-native";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PressableScale } from "@/components/pressable-scale";
import { ProgressBar } from "@/components/progress-bar";
import { ENTER_EASING } from "@/lib/motion";
import { usePalette } from "@/lib/palette";
import { formatClock } from "@/lib/workout/model";
import { type Workout, useRestRemaining } from "@/lib/workout/use-workout";

export function RestBar({ workout }: { workout: Workout }) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const remaining = useRestRemaining(workout.rest, workout.finishRest);
  if (!workout.rest || !remaining) return null;
  const exercise = workout.exercises.find((ex) => ex.id === workout.rest?.exerciseId);

  return (
    <Animated.View
      entering={FadeInDown.duration(220).easing(ENTER_EASING)}
      exiting={FadeOutDown.duration(160)}
      style={{
        position: "absolute",
        left: 12,
        right: 12,
        bottom: insets.bottom + 8,
        padding: 14,
        gap: 10,
        borderRadius: 18,
        borderCurve: "continuous",
        backgroundColor: p.elevated,
        boxShadow: "0 8px 24px rgba(0,0,0,0.16), 0 1px 3px rgba(0,0,0,0.08)",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: p.secondary, fontSize: 12, fontWeight: "600" }}>
            Rest · {exercise?.shortName}
          </Text>
          <Text
            style={{
              color: p.label,
              fontSize: 28,
              fontWeight: "700",
              fontVariant: ["tabular-nums"],
            }}
          >
            {formatClock(remaining.remaining)}
          </Text>
        </View>
        <RestButton label="−15" onPress={() => workout.adjustRest(-15)} />
        <RestButton label="+15" onPress={() => workout.adjustRest(15)} />
        <RestButton label="Skip" onPress={workout.skipRest} accent />
      </View>
      <ProgressBar progress={remaining.progress} color={p.blue} track={p.fill} />
    </Animated.View>
  );
}

function RestButton({
  label,
  onPress,
  accent,
}: {
  label: string;
  onPress: () => void;
  accent?: boolean;
}) {
  const p = usePalette();
  return (
    <PressableScale
      onPress={onPress}
      style={{
        minWidth: 52,
        height: 40,
        paddingHorizontal: 12,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: accent ? p.blueTint : p.fill,
      }}
    >
      <Text
        style={{
          color: accent ? p.blue : p.label,
          fontSize: 15,
          fontWeight: "600",
          fontVariant: ["tabular-nums"],
        }}
      >
        {label}
      </Text>
    </PressableScale>
  );
}
