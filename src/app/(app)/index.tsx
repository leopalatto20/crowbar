import { Link } from "expo-router";
import { useTranslation } from "react-i18next";
import { StyleSheet } from "react-native";

import { Button, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

import { useTrainingPreferences } from "../../features/training-preferences/training-preferences-provider";

export default function AppIndex(): React.JSX.Element {
  const { metric } = useTrainingPreferences();
  const { t } = useTranslation();

  return (
    <VStack style={styles.container}>
      <Heading size="5xl" accessibilityRole="header" style={styles.title}>
        {t("app.title")}
      </Heading>
      <Text style={styles.subtitle}>{t("app.subtitle")}</Text>
      <Text style={styles.preference}>
        {t("app.metric", { metric: metric?.toUpperCase() })}
      </Text>
      <Link href="/(app)/exercises" asChild>
        <Button style={styles.settingsButton}>
          <ButtonText style={styles.settingsButtonText}>{t("app.exercisesLink")}</ButtonText>
        </Button>
      </Link>
      <Link href="/(app)/settings/training-preferences" asChild>
        <Button style={styles.settingsButton}>
          <ButtonText style={styles.settingsButtonText}>{t("app.settingsLink")}</ButtonText>
        </Button>
      </Link>
    </VStack>
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
