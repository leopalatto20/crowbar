import { Link } from "expo-router";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTrainingPreferences } from "../../features/training-preferences/training-preferences-provider";

export default function AppIndex(): React.JSX.Element {
  const { metric } = useTrainingPreferences();
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>
        {t("app.title")}
      </Text>
      <Text style={styles.subtitle}>{t("app.subtitle")}</Text>
      <Text style={styles.preference}>
        {t("app.metric", { metric: metric?.toUpperCase() })}
      </Text>
      <Link href="/(app)/settings/training-preferences" asChild>
        <Pressable accessibilityRole="button" style={styles.settingsButton}>
          <Text style={styles.settingsButtonText}>{t("app.settingsLink")}</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#F7F9FC",
    flex: 1,
    gap: 16,
    justifyContent: "center",
    padding: 24,
  },
  preference: {
    color: "#52606D",
    fontSize: 16,
  },
  settingsButton: {
    alignItems: "center",
    backgroundColor: "#1565C0",
    borderRadius: 10,
    minHeight: 52,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  settingsButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  subtitle: {
    color: "#52606D",
    fontSize: 18,
  },
  title: {
    color: "#102A43",
    fontSize: 36,
    fontWeight: "800",
  },
});
