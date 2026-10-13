import { View } from "react-native";
import Animated from "react-native-reanimated";

import { motion } from "@/lib/theme";

// The fill is absolutely positioned with no children, and the timer ticks steadily, so a linear
// scaleX transition between ticks reads as continuous motion.
export function ProgressBar({
  progress,
  color,
  track,
  height = 4,
}: {
  progress: number;
  color: string;
  track: string;
  height?: number;
}) {
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: track, overflow: "hidden" }}>
      <Animated.View
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: color,
          transformOrigin: "left",
          transform: [{ scaleX: Math.min(1, Math.max(0, progress)) }],
          transitionProperty: "transform",
          transitionDuration: motion.progressTick,
          transitionTimingFunction: "linear",
        }}
      />
    </View>
  );
}
