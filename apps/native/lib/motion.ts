import { Easing, cubicBezier } from "react-native-reanimated";

// Strong ease-out: as a CSS transition timing function and as a layout-animation easing.
export const EASE_OUT = cubicBezier(0.23, 1, 0.32, 1);
export const ENTER_EASING = Easing.bezier(0.23, 1, 0.32, 1);
