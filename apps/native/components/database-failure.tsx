import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { Text, View } from "react-native";

import { useI18n } from "@/lib/i18n";
import { spacing, type, useColors } from "@/lib/theme";

// Blocking on purpose: with the database unopened there is nothing safe to show or do.
export function DatabaseFailure() {
  const p = useColors();
  const { t } = useI18n();
  useEffect(() => SplashScreen.hide(), []);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: p.background,
        alignItems: "center",
        justifyContent: "center",
        padding: spacing.xxl,
        gap: spacing.lg,
      }}
    >
      <Text style={{ color: p.label, ...type.headline, textAlign: "center" }}>
        {t.databaseFailure.title}
      </Text>
      <Text style={{ color: p.secondary, ...type.body, textAlign: "center" }}>
        {t.databaseFailure.message}
      </Text>
    </View>
  );
}
