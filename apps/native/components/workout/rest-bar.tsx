import { View } from "react-native";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PressableScale } from "@/components/pressable-scale";
import { ProgressBar } from "@/components/progress-bar";
import { useI18n } from "@/lib/i18n";
import { motion, radii, spacing, type, useColors } from "@/lib/theme";
import { formatClock } from "@/lib/workout/model";
import { type Workout, useRestRemaining } from "@/lib/workout/use-workout";

import { LedgerText } from "./ledger-text";

export function RestBar({ workout }: { workout: Workout }) {
  const p = useColors();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const remaining = useRestRemaining(workout.rest, workout.finishRest);
  if (!workout.rest || !remaining) return null;
  const exercise = workout.exercises.find((ex) => ex.id === workout.rest?.exerciseId);

  return (
    <Animated.View
      entering={FadeInDown.duration(motion.restCardEnter).easing(motion.enterEasing)}
      exiting={FadeOutDown.duration(motion.restCardExit)}
      style={{
        position: "absolute",
        left: 12,
        right: 12,
        bottom: insets.bottom + 8,
        padding: 14,
        gap: 10,
        borderRadius: radii.floating,
        borderCurve: "continuous",
        backgroundColor: p.elevated,
        boxShadow: "0 8px 24px rgba(0,0,0,0.16), 0 1px 3px rgba(0,0,0,0.08)",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.lg }}>
        <View style={{ flex: 1 }}>
          <LedgerText style={{ color: p.secondary, ...type.caption, fontWeight: "600" }}>
            {t.restCard.title(exercise?.shortName ?? "")}
          </LedgerText>
          <LedgerText style={{ color: p.label, ...type.title, fontVariant: ["tabular-nums"] }}>
            {formatClock(remaining.remaining)}
          </LedgerText>
        </View>
        <RestButton label={t.restCard.subtract} onPress={() => workout.adjustRest(-15)} />
        <RestButton label={t.restCard.add} onPress={() => workout.adjustRest(15)} />
        <RestButton label={t.restCard.skip} onPress={workout.skipRest} accent />
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
  const p = useColors();
  return (
    <PressableScale
      onPress={onPress}
      style={{
        minWidth: 52,
        height: 40,
        paddingHorizontal: 12,
        borderRadius: radii.pill,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: accent ? p.blueTint : p.fill,
      }}
    >
      <LedgerText
        style={{
          color: accent ? p.blue : p.label,
          ...type.subheadline,
          fontWeight: "600",
          fontVariant: ["tabular-nums"],
        }}
      >
        {label}
      </LedgerText>
    </PressableScale>
  );
}
