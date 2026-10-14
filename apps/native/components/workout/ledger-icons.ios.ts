import type { Stack } from "expo-router";
import type { ComponentProps } from "react";

type ToolbarIcon = ComponentProps<typeof Stack.Toolbar.Button>["icon"];

export const LEDGER_MENU_ICON: ToolbarIcon = "ellipsis";
export const LEDGER_MINIMIZE_ICON: ToolbarIcon = "chevron.down";
