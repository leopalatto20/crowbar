import type { ReactNode } from "react";
import { Pressable, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";

import { motion, transitionEaseOut } from "@/lib/theme";

export function PressableScale({
  children,
  onPress,
  style,
  disabled,
  accessibilityLabel,
  scaleTo = motion.pressScale,
}: {
  children: ReactNode;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  accessibilityLabel?: string;
  scaleTo?: number;
}) {
  const reduced = useReducedMotion();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      pressRetentionOffset={16}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      {({ pressed }) => (
        <Animated.View
          style={[
            style,
            {
              transform: [{ scale: pressed && !reduced ? scaleTo : 1 }],
              transitionProperty: "transform",
              transitionDuration: motion.press,
              transitionTimingFunction: transitionEaseOut,
            },
          ]}
        >
          {children}
        </Animated.View>
      )}
    </Pressable>
  );
}
