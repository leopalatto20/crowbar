import { type TextStyle, useColorScheme } from "react-native";
import { Easing, cubicBezier } from "react-native-reanimated";

// Static iOS system colors: Reanimated transitions need plain strings, not PlatformColor objects.
const LIGHT = {
  background: "#F2F2F7",
  card: "#FFFFFF",
  elevated: "#FFFFFF",
  fill: "rgba(118,118,128,0.12)",
  fillStrong: "rgba(118,118,128,0.2)",
  label: "#000000",
  secondary: "rgba(60,60,67,0.6)",
  tertiary: "rgba(60,60,67,0.3)",
  separator: "rgba(60,60,67,0.18)",
  blue: "#007AFF",
  blueTint: "rgba(0,122,255,0.12)",
  green: "#34C759",
  greenTint: "rgba(52,199,89,0.14)",
  orange: "#FF9500",
  orangeTint: "rgba(255,149,0,0.14)",
  red: "#FF3B30",
  onAccent: "#FFFFFF",
};

const DARK: typeof LIGHT = {
  background: "#000000",
  card: "#1C1C1E",
  elevated: "#2C2C2E",
  fill: "rgba(118,118,128,0.24)",
  fillStrong: "rgba(118,118,128,0.36)",
  label: "#FFFFFF",
  secondary: "rgba(235,235,245,0.6)",
  tertiary: "rgba(235,235,245,0.3)",
  separator: "rgba(84,84,88,0.6)",
  blue: "#0A84FF",
  blueTint: "rgba(10,132,255,0.2)",
  green: "#30D158",
  greenTint: "rgba(48,209,88,0.18)",
  orange: "#FF9F0A",
  orangeTint: "rgba(255,159,10,0.18)",
  red: "#FF453A",
  onAccent: "#FFFFFF",
};

export function useColors(): typeof LIGHT {
  return useColorScheme() === "dark" ? DARK : LIGHT;
}

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
};

// RN Text scales with Dynamic Type by default, so the ramp only fixes sizes and roles.
export const type = {
  title: { fontSize: 28, fontWeight: "700" },
  headline: { fontSize: 17, fontWeight: "600" },
  body: { fontSize: 17 },
  callout: { fontSize: 16 },
  subheadline: { fontSize: 15 },
  cell: { fontSize: 14 },
  footnote: { fontSize: 13 },
  caption: { fontSize: 12 },
  columnHeader: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
} satisfies Record<string, TextStyle>;

// The Ledger and rest card keep fixed-height rows; past this scale their columns stop fitting.
export const LEDGER_MAX_FONT_SCALE = 1.35;

export const radii = {
  chip: 6,
  control: 8,
  field: 10,
  card: 14,
  floating: 18,
  pill: 999,
};

// Strong ease-out: as a CSS transition timing function and as a layout-animation easing.
const EASE_OUT_CURVE = [0.23, 1, 0.32, 1] as const;

// Kept out of `motion`: worklets copy `motion` whole to the UI thread, and this class instance can't be copied.
export const transitionEaseOut = cubicBezier(...EASE_OUT_CURVE);

export const motion = {
  enterEasing: Easing.bezier(...EASE_OUT_CURVE),
  pressScale: 0.97,
  press: 120,
  confirmTint: 180,
  confirmPop: 160,
  panelEnter: 180,
  restCardEnter: 220,
  restCardExit: 160,
  reorderSettle: 200,
  reorderLift: 150,
  progressTick: 250,
};
