import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet } from "react-native";
import { useState } from "react";

import { Button, ButtonSpinner, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

import {
  useTrainingPreferences,
  type TrainingPreferencesState,
} from "../training-preferences-provider";
import type { EffortMetric } from "../model/effort";
import { EffortMetricPicker } from "./effort-metric-picker";

function isSaving(state: TrainingPreferencesState): boolean {
  return state.status === "saving";
}

export function FirstRunPreferenceScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const { save, state } = useTrainingPreferences();
  const [selectedMetric, setSelectedMetric] = useState<EffortMetric | null>(null);
  const saving = isSaving(state);
  const saveFailed = state.status === "save-error";

  const submit = (): void => {
    if (selectedMetric) {
      void save(selectedMetric);
    }
  };

  const metricLabel = (metric: EffortMetric): string =>
    t(`trainingPreferences.metric.${metric}`);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <VStack style={styles.header}>
        <Heading size="3xl" accessibilityRole="header" style={styles.title}>
          {t("trainingPreferences.firstRun.title")}
        </Heading>
        <Text style={styles.description}>{t("trainingPreferences.firstRun.description")}</Text>
      </VStack>

      <EffortMetricPicker
        selectedMetric={selectedMetric}
        disabled={saving}
        onSelect={setSelectedMetric}
        labels={{
          rpe: t("trainingPreferences.firstRun.rpeOptionLabel"),
          rir: t("trainingPreferences.firstRun.rirOptionLabel"),
        }}
        descriptions={{
          rpe: t("trainingPreferences.firstRun.rpeOptionDescription"),
          rir: t("trainingPreferences.firstRun.rirOptionDescription"),
        }}
        selectedAnnouncement={(metric) =>
          t("trainingPreferences.accessibility.selected", { metric: metricLabel(metric) })
        }
        notSelectedAnnouncement={(metric) =>
          t("trainingPreferences.accessibility.notSelected", { metric: metricLabel(metric) })
        }
      />

      {saveFailed ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {t("trainingPreferences.errors.saveFailed")}
        </Text>
      ) : null}

      <Button
        testID="first-run-save"
        accessibilityRole="button"
        accessibilityLabel={
          saving
            ? t("trainingPreferences.accessibility.saving")
            : t("trainingPreferences.firstRun.saveButtonLabel")
        }
        accessibilityState={{ disabled: !selectedMetric || saving, busy: saving }}
        isDisabled={!selectedMetric || saving}
        onPress={submit}
        style={styles.saveButton}
      >
        {saving ? (
          <ButtonSpinner color="#FFFFFF" />
        ) : (
          <ButtonText style={styles.saveButtonText}>
            {t("trainingPreferences.firstRun.saveButtonLabel")}
          </ButtonText>
        )}
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 28,
    padding: 24,
    paddingBottom: 40,
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
