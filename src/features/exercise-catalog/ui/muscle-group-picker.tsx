import { StyleSheet, View } from "react-native";

import { Radio, RadioGroup, RadioIndicator, RadioLabel } from "@/components/ui/radio";

import { muscleGroupOrder, muscleGroupSchema, type MuscleGroup } from "../model/catalog";

type MuscleGroupPickerProps = Readonly<{
  label: string;
  labelFor: (muscleGroup: MuscleGroup) => string;
  selectedMuscleGroup: MuscleGroup | null;
  disabled: boolean;
  onSelect: (muscleGroup: MuscleGroup) => void;
}>;

export function MuscleGroupPicker({
  label,
  labelFor,
  selectedMuscleGroup,
  disabled,
  onSelect,
}: MuscleGroupPickerProps): React.JSX.Element {
  return (
    <RadioGroup
      accessibilityLabel={label}
      accessibilityRole="radiogroup"
      style={styles.group}
      testID="custom-exercise-form-group-picker"
      value={selectedMuscleGroup ?? ""}
      onChange={(value) => {
        const parsedMuscleGroup = muscleGroupSchema.safeParse(value);
        if (parsedMuscleGroup.success) {
          onSelect(parsedMuscleGroup.data);
        }
      }}
    >
      {muscleGroupOrder.map((muscleGroup) => {
        const selected = selectedMuscleGroup === muscleGroup;

        return (
          <Radio
            key={muscleGroup}
            accessibilityLabel={labelFor(muscleGroup)}
            accessibilityRole="radio"
            isDisabled={disabled}
            style={[styles.option, selected && styles.selectedOption]}
            testID={`muscle-group-${muscleGroup}`}
            value={muscleGroup}
          >
            <RadioIndicator style={[styles.indicator, selected && styles.selectedIndicator]}>
              {selected ? (
                <View
                  style={styles.selectedDot}
                  testID={`muscle-group-${muscleGroup}-selected-indicator`}
                />
              ) : null}
            </RadioIndicator>
            <RadioLabel style={styles.optionLabel}>{labelFor(muscleGroup)}</RadioLabel>
          </Radio>
        );
      })}
    </RadioGroup>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: 8,
    width: "100%",
  },
  indicator: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#BCCCDC",
    borderWidth: 2,
    height: 20,
    justifyContent: "center",
    width: 20,
  },
  option: {
    borderColor: "#BCCCDC",
    borderRadius: 12,
    borderWidth: 2,
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  optionLabel: {
    color: "#102A43",
    fontSize: 15,
    fontWeight: "600",
  },
  selectedDot: {
    backgroundColor: "#1565C0",
    borderRadius: 6,
    height: 10,
    width: 10,
  },
  selectedIndicator: {
    borderColor: "#1565C0",
  },
  selectedOption: {
    backgroundColor: "#E3F2FD",
    borderColor: "#1565C0",
  },
});
