import { useColorScheme } from "@/lib/use-color-scheme";

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
  onAccent: "#FFFFFF",
};

export type Palette = typeof LIGHT;

export function usePalette() {
  const { isDarkColorScheme } = useColorScheme();
  return isDarkColorScheme ? DARK : LIGHT;
}
