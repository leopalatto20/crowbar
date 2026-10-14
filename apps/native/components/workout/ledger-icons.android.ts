import type { Stack } from "expo-router";
import type { ComponentProps } from "react";

type ToolbarIcon = ComponentProps<typeof Stack.Toolbar.Button>["icon"];

// The Android header toolbar draws only image sources, never symbol names.
export const LEDGER_MENU_ICON: ToolbarIcon = require("@/assets/icons/more_vert.xml");
export const LEDGER_MINIMIZE_ICON: ToolbarIcon = require("@/assets/icons/keyboard_arrow_down.xml");
