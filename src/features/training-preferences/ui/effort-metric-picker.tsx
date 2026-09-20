import { Pressable, StyleSheet, Text, View } from "react-native";

import type { EffortMetric } from "../model/effort";

type EffortMetricPickerProps = {
  selectedMetric: EffortMetric | null;
  disabled?: boolean;
  onSelect: (metric: EffortMetric) => void;
  labels: Record<EffortMetric, string>;
  descriptions: Record<EffortMetric, string>;
  selectedAnnouncement: (metric: EffortMetric) => string;
  notSelectedAnnouncement: (metric: EffortMetric) => string;
};

export function EffortMetricPicker({
  selectedMetric,
  disabled = false,
  onSelect,
  labels,
  descriptions,
  selectedAnnouncement,
  notSelectedAnnouncement,
}: EffortMetricPickerProps): React.JSX.Element {
  return (
    <View accessibilityRole="radiogroup" style={styles.group}>
      {(["rpe", "rir"] as const).map((metric) => {
        const selected = selectedMetric === metric;

        return (
          <Pressable
            key={metric}
            testID={`effort-metric-${metric}`}
            accessibilityRole="radio"
            accessibilityLabel={labels[metric]}
            accessibilityHint={descriptions[metric]}
            accessibilityState={{ disabled, selected }}
            disabled={disabled}
            onPress={() => onSelect(metric)}
            style={[styles.option, selected && styles.selectedOption]}
          >
            <Text style={styles.label}>{labels[metric]}</Text>
            <Text style={styles.description}>{descriptions[metric]}</Text>
            <Text accessibilityLiveRegion="polite" style={styles.state}>
              {selected ? selectedAnnouncement(metric) : notSelectedAnnouncement(metric)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  description: {
    color: "#52606D",
    fontSize: 15,
    lineHeight: 22,
  },
  group: {
    gap: 12,
    width: "100%",
  },
  label: {
    color: "#102A43",
    fontSize: 20,
    fontWeight: "700",
  },
  option: {
    borderColor: "#BCCCDC",
    borderRadius: 12,
    borderWidth: 2,
    gap: 4,
    padding: 16,
  },
  selectedOption: {
    backgroundColor: "#E3F2FD",
    borderColor: "#1565C0",
  },
  state: {
    color: "#52606D",
    fontSize: 13,
    marginTop: 4,
  },
});
