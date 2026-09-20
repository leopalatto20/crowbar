import { StyleSheet } from "react-native";

import {
  Radio,
  RadioGroup,
  RadioIndicator,
  RadioLabel,
} from "@/components/ui/radio";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

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
    <RadioGroup
      value={selectedMetric ?? ""}
      onChange={(value) => onSelect(value as EffortMetric)}
      accessibilityRole="radiogroup"
      style={styles.group}
    >
      {(["rpe", "rir"] as const).map((metric) => {
        const selected = selectedMetric === metric;

        return (
          <Radio
            key={metric}
            value={metric}
            testID={`effort-metric-${metric}`}
            accessibilityRole="radio"
            accessibilityHint={descriptions[metric]}
            isDisabled={disabled}
            style={[styles.option, selected && styles.selectedOption]}
          >
            <RadioIndicator style={styles.indicator} />
            <VStack style={styles.copy}>
              <RadioLabel style={styles.label}>{labels[metric]}</RadioLabel>
              <Text style={styles.description}>{descriptions[metric]}</Text>
              <Text accessibilityLiveRegion="polite" style={styles.state}>
                {selected ? selectedAnnouncement(metric) : notSelectedAnnouncement(metric)}
              </Text>
            </VStack>
          </Radio>
        );
      })}
    </RadioGroup>
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
  copy: {
    flex: 1,
    gap: 4,
  },
  indicator: {
    backgroundColor: "#FFFFFF",
    borderColor: "#BCCCDC",
    borderWidth: 2,
    height: 20,
    width: 20,
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
