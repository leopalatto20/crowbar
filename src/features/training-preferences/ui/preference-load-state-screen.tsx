import { useTranslation } from "react-i18next";
import { StyleSheet } from "react-native";

import { Button, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Spinner } from "@/components/ui/spinner";
import { VStack } from "@/components/ui/vstack";

type PreferenceLoadStateScreenProps = {
  error?: boolean;
  onRetry?: () => void;
};

export function PreferenceLoadStateScreen({
  error = false,
  onRetry,
}: PreferenceLoadStateScreenProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <VStack style={styles.container}>
      {error ? null : <Spinner aria-label={t("trainingPreferences.loading.label")} />}
      <Heading size="lg" accessibilityRole="header">
        {error ? t("trainingPreferences.errors.loadFailed") : t("trainingPreferences.loading.label")}
      </Heading>
      {error && onRetry ? (
        <Button onPress={onRetry}>
          <ButtonText>{t("trainingPreferences.errors.retry")}</ButtonText>
        </Button>
      ) : null}
    </VStack>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    flex: 1,
    gap: 16,
    justifyContent: "center",
    padding: 24,
  },
});
