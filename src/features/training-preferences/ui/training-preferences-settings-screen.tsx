import { useTranslation } from "react-i18next";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import type { EffortMetric } from "../model/effort";
import {
  useTrainingPreferences,
  type TrainingPreferencesState,
} from "../training-preferences-provider";
import { EffortMetricPicker } from "./effort-metric-picker";

type TrainingPreferencesSettingsScreenProps = {
  onSaved?: () => void;
};

function isSaving(state: TrainingPreferencesState): boolean {
  return state.status === "saving";
}

export function TrainingPreferencesSettingsScreen({
  onSaved,
}: TrainingPreferencesSettingsScreenProps): React.JSX.Element {
  const { t } = useTranslation();
  const { metric, save, state } = useTrainingPreferences();
  const [pendingMetric, setPendingMetric] = useState<EffortMetric | null>(null);
  const saveRequested = useRef(false);
  const saving = isSaving(state);
  const saveFailed = state.status === "save-error";
  const selectedMetric = pendingMetric ?? metric;

  useEffect(() => {
    if (saveRequested.current && state.status === "ready") {
      saveRequested.current = false;
      onSaved?.();
    }
  }, [onSaved, state.status]);

  const submit = (): void => {
    if (selectedMetric) {
      saveRequested.current = true;
      void save(selectedMetric);
    }
  };

  const metricLabel = (selectedMetric: EffortMetric): string =>
    t(`trainingPreferences.metric.${selectedMetric}`);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>
          {t("trainingPreferences.settings.title")}
        </Text>
        <Text style={styles.description}>{t("trainingPreferences.settings.description")}</Text>
        <Text testID="current-metric" style={styles.currentMetric}>
          {metric
            ? t("trainingPreferences.settings.currentMetric", { metric: metricLabel(metric) })
            : t("trainingPreferences.loading.label")}
        </Text>
      </View>

      <EffortMetricPicker
        selectedMetric={selectedMetric}
        disabled={saving}
        onSelect={setPendingMetric}
        labels={{
          rpe: t("trainingPreferences.firstRun.rpeOptionLabel"),
          rir: t("trainingPreferences.firstRun.rirOptionLabel"),
        }}
        descriptions={{
          rpe: t("trainingPreferences.firstRun.rpeOptionDescription"),
          rir: t("trainingPreferences.firstRun.rirOptionDescription"),
        }}
        selectedAnnouncement={(selectedMetric) =>
          t("trainingPreferences.accessibility.selected", { metric: metricLabel(selectedMetric) })
        }
        notSelectedAnnouncement={(selectedMetric) =>
          t("trainingPreferences.accessibility.notSelected", {
            metric: metricLabel(selectedMetric),
          })
        }
      />

      {saveFailed ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {t("trainingPreferences.errors.saveFailed")}
        </Text>
      ) : null}

      <Pressable
        testID="settings-save"
        accessibilityRole="button"
        accessibilityLabel={
          saving
            ? t("trainingPreferences.accessibility.saving")
            : t("trainingPreferences.settings.saveButtonLabel")
        }
        accessibilityState={{ disabled: selectedMetric === null || saving, busy: saving }}
        disabled={selectedMetric === null || saving}
        onPress={submit}
        style={styles.saveButton}
      >
        {saving ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.saveButtonText}>{t("trainingPreferences.settings.saveButtonLabel")}</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 28,
    padding: 24,
    paddingBottom: 40,
  },
  currentMetric: {
    color: "#102A43",
    fontSize: 17,
    fontWeight: "600",
  },
  description: {
    color: "#52606D",
    fontSize: 17,
    lineHeight: 25,
  },
  error: {
    color: "#BA1A1A",
    fontSize: 15,
    lineHeight: 22,
  },
  header: {
    gap: 10,
  },
  saveButton: {
    alignItems: "center",
    backgroundColor: "#1565C0",
    borderRadius: 10,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 20,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  title: {
    color: "#102A43",
    fontSize: 32,
    fontWeight: "800",
    lineHeight: 38,
  },
});
