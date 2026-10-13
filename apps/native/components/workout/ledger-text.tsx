import { Text, type TextProps } from "react-native";

import { LEDGER_MAX_FONT_SCALE } from "@/lib/theme";

export function LedgerText(props: TextProps) {
  return <Text maxFontSizeMultiplier={LEDGER_MAX_FONT_SCALE} {...props} />;
}
