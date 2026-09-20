import { useTranslation } from "react-i18next";
import { ActivityIndicator, Button, StyleSheet, Text, View } from "react-native";

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
    <View style={styles.container}>
      {error ? null : <ActivityIndicator accessibilityLabel={t("trainingPreferences.loading.label")} />}
      <Text accessibilityRole="header">
        {error ? t("trainingPreferences.errors.loadFailed") : t("trainingPreferences.loading.label")}
      </Text>
      {error && onRetry ? (
        <Button title={t("trainingPreferences.errors.retry")} onPress={onRetry} />
      ) : null}
    </View>
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
