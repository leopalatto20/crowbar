import { View } from "react-native";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PressableScale } from "@/components/pressable-scale";
import { ProgressBar } from "@/components/progress-bar";
import { useDb } from "@/db/context";
import { type Rest, adjustRest, endRest } from "@/db/rests";
import { useI18n } from "@/lib/i18n";
import { motion, radii, spacing, type, useColors } from "@/lib/theme";
import { formatClock, formatElapsed } from "@/lib/workout/model";
import { useRestClock } from "@/lib/workout/use-workout";

import { LedgerText } from "./ledger-text";

// Once the countdown is over it stays as "Rest over", counting overtime, until the next confirm or
// Dismiss.
export function RestBar({ rest, exerciseName }: { rest: Rest; exerciseName: string }) {
  const db = useDb();
  const p = useColors();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const clock = useRestClock(rest);
  if (!clock) return null;

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
            {clock.over ? t.restCard.overTitle(exerciseName) : t.restCard.title(exerciseName)}
          </LedgerText>
          <LedgerText
            style={{
              color: clock.over ? p.orange : p.label,
              ...type.title,
              fontVariant: ["tabular-nums"],
            }}
          >
            {clock.over
              ? t.restCard.overtime(formatElapsed(clock.overtime))
              : formatClock(clock.remaining)}
          </LedgerText>
        </View>
        {clock.over ? (
          <RestButton label={t.restCard.dismiss} onPress={() => endRest(db)} accent />
        ) : (
          <>
            <RestButton label={t.restCard.subtract} onPress={() => adjustRest(db, -15)} />
            <RestButton label={t.restCard.add} onPress={() => adjustRest(db, 15)} />
            <RestButton label={t.restCard.skip} onPress={() => endRest(db)} accent />
          </>
        )}
      </View>
      <ProgressBar
        progress={clock.over ? 1 : clock.progress}
        color={clock.over ? p.orange : p.blue}
        track={p.fill}
      />
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
