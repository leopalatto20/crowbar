import { FlatList, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { useTranslation } from "react-i18next";

import { Button, ButtonText } from "@/components/ui/button";

import { muscleGroupOrder, type MuscleGroup } from "../model/catalog";

type MuscleGroupFilterProps = Readonly<{
  selectedGroup: MuscleGroup | null;
  onSelect: (group: MuscleGroup | null) => void;
  disabled: boolean;
  testIDPrefix: string;
  controlStyle?: StyleProp<ViewStyle>;
  selectedStyle?: StyleProp<ViewStyle>;
}>;

const groups: readonly (MuscleGroup | null)[] = [null, ...muscleGroupOrder];

export function MuscleGroupFilter({
  selectedGroup,
  onSelect,
  disabled,
  testIDPrefix,
  controlStyle,
  selectedStyle,
}: MuscleGroupFilterProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <FlatList
      accessibilityLabel={t("exerciseCatalog.controls.muscleGroupFilterLabel")}
      contentContainerStyle={styles.filters}
      data={groups}
      extraData={`${selectedGroup ?? "all"}-${disabled}`}
      horizontal
      keyboardShouldPersistTaps="handled"
      keyExtractor={(group) => group ?? "all"}
      renderItem={({ item: group }) => (
        <Button
          accessibilityState={{ selected: selectedGroup === group }}
          isDisabled={disabled}
          onPress={() => onSelect(group)}
          style={[styles.control, controlStyle, selectedGroup === group && selectedStyle]}
          testID={`${testIDPrefix}-filter-${group ?? "all"}`}
          variant="outline"
        >
          <ButtonText>
            {group === null
              ? t("exerciseCatalog.controls.allMuscleGroups")
              : t(`exerciseCatalog.muscleGroups.${group}`)}
          </ButtonText>
        </Button>
      )}
      showsHorizontalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  control: { minHeight: 44, paddingHorizontal: 12 },
  filters: { gap: 8, paddingRight: 16 },
});
