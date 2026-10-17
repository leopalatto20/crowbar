import type { CommonViewModifierProps } from "@expo/ui/swift-ui";
import { requireNativeView } from "expo";
import type { ComponentType } from "react";

type MenuLabelTextProps = CommonViewModifierProps & { text: string };

/** The label of a tap-to-open `Menu`: `text` followed by a grey `chevron.down` in the same text run. */
export const MenuLabelText: ComponentType<MenuLabelTextProps> = requireNativeView(
  "MenuLabelText",
  "MenuLabelTextView",
);
