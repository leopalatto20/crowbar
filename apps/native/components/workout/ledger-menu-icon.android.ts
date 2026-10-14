import type { Stack } from "expo-router";
import type { ComponentProps } from "react";

// The Android header menu draws only image sources, never symbol names.
export const LEDGER_MENU_ICON: ComponentProps<
  typeof Stack.Toolbar.Menu
>["icon"] = require("@/assets/icons/more_vert.xml");
