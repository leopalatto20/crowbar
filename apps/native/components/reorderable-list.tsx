import { type ReactNode, useEffect } from "react";
import { type LayoutChangeEvent, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  type SharedValue,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { haptics } from "@/lib/haptics";
import { ENTER_EASING } from "@/lib/motion";

type Shared = {
  order: SharedValue<string[]>;
  heights: SharedValue<Record<string, number>>;
  active: SharedValue<string | null>;
  dragStart: SharedValue<number>;
  dragY: SharedValue<number>;
  gap: number;
  reduced: boolean;
  onReorder: (ids: string[]) => void;
};

function offsetOf(id: string, order: string[], heights: Record<string, number>, gap: number) {
  "worklet";
  let y = 0;
  for (const key of order) {
    if (key === id) return y;
    y += (heights[key] ?? 0) + gap;
  }
  return y;
}

// Rows are absolutely positioned from measured heights, so they can differ in height and
// change it (an expanded editor) while the rest of the list slides to make room.
export function ReorderableList<T>({
  items,
  keyOf,
  renderItem,
  onReorder,
  gap = 0,
}: {
  items: T[];
  keyOf: (item: T) => string;
  renderItem: (item: T, handle: (children: ReactNode) => ReactNode) => ReactNode;
  onReorder: (ids: string[]) => void;
  gap?: number;
}) {
  const ids = items.map(keyOf);
  const idsKey = ids.join("|");
  const order = useSharedValue(ids);
  const heights = useSharedValue<Record<string, number>>({});
  const active = useSharedValue<string | null>(null);
  const dragStart = useSharedValue(0);
  const dragY = useSharedValue(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    order.value = idsKey ? idsKey.split("|") : [];
  }, [idsKey, order]);

  const containerStyle = useAnimatedStyle(() => {
    let total = 0;
    order.value.forEach((key, i) => {
      total += (heights.value[key] ?? 0) + (i > 0 ? gap : 0);
    });
    return { height: total };
  });

  const shared: Shared = { order, heights, active, dragStart, dragY, gap, reduced, onReorder };

  return (
    <Animated.View style={containerStyle}>
      {items.map((item) => (
        <Row
          key={keyOf(item)}
          id={keyOf(item)}
          shared={shared}
          renderItem={renderItem}
          item={item}
        />
      ))}
    </Animated.View>
  );
}

function Row<T>({
  id,
  item,
  shared,
  renderItem,
}: {
  id: string;
  item: T;
  shared: Shared;
  renderItem: (item: T, handle: (children: ReactNode) => ReactNode) => ReactNode;
}) {
  const { order, heights, active, dragStart, dragY, gap, reduced, onReorder } = shared;
  const y = useSharedValue(0);
  const placed = useSharedValue(false);
  const duration = reduced ? 0 : 200;

  useAnimatedReaction(
    () => (heights.value[id] === undefined ? null : offsetOf(id, order.value, heights.value, gap)),
    (next, prev) => {
      if (next === null || active.value === id) return;
      if (!placed.value) {
        y.value = next;
        placed.value = true;
      } else if (next !== prev) {
        y.value = withTiming(next, { duration, easing: ENTER_EASING });
      }
    },
  );

  const style = useAnimatedStyle(() => {
    const dragging = active.value === id;
    return {
      opacity: placed.value ? 1 : 0,
      zIndex: dragging ? 10 : 0,
      transform: [
        { translateY: dragging ? dragStart.value + dragY.value : y.value },
        { scale: withTiming(dragging && !reduced ? 1.02 : 1, { duration: 150 }) },
      ],
    };
  });

  const pan = Gesture.Pan()
    .minDistance(0)
    .onStart(() => {
      active.value = id;
      dragStart.value = y.value;
      dragY.value = 0;
      scheduleOnRN(haptics.light);
    })
    .onUpdate((e) => {
      dragY.value = e.translationY;
      const center = dragStart.value + e.translationY + (heights.value[id] ?? 0) / 2;
      const others = order.value.filter((key) => key !== id);
      let index = others.length;
      let acc = 0;
      for (let i = 0; i < others.length; i++) {
        const h = heights.value[others[i]] ?? 0;
        if (center < acc + h / 2) {
          index = i;
          break;
        }
        acc += h + gap;
      }
      const next = [...others.slice(0, index), id, ...others.slice(index)];
      if (next.join("|") !== order.value.join("|")) {
        order.value = next;
        scheduleOnRN(haptics.selection);
      }
    })
    .onFinalize(() => {
      if (active.value !== id) return;
      y.value = dragStart.value + dragY.value;
      y.value = withTiming(offsetOf(id, order.value, heights.value, gap), {
        duration,
        easing: ENTER_EASING,
      });
      active.value = null;
      scheduleOnRN(onReorder, order.value);
    });

  function onLayout(e: LayoutChangeEvent) {
    const h = e.nativeEvent.layout.height;
    // Rows measure in the same frame; modify merges on the UI thread so no write is lost.
    heights.modify((all) => {
      "worklet";
      return all[id] === h ? all : { ...all, [id]: h };
    });
  }

  const handle = (children: ReactNode) => (
    <GestureDetector gesture={pan}>
      <View hitSlop={8} accessibilityLabel="Drag to reorder">
        {children}
      </View>
    </GestureDetector>
  );

  return (
    <Animated.View style={[{ position: "absolute", left: 0, right: 0, top: 0 }, style]}>
      <View onLayout={onLayout}>{renderItem(item, handle)}</View>
    </Animated.View>
  );
}
