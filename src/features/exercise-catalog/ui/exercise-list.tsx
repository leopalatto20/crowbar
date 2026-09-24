import type { ComponentRef } from "react";
import { SectionList, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

import type { CatalogExercise, ExerciseId } from "../model/catalog";
import { groupCatalogExercises } from "../model/catalog-selectors";

export type ExerciseListActionRef = ComponentRef<typeof Button>;

type ExerciseListProps = Readonly<{
  exercises: readonly CatalogExercise[];
  disabled: boolean;
  emptyMessage: string;
  header: React.ReactElement;
  onEdit: (exercise: CatalogExercise) => void;
  onSetAvailability: (exercise: CatalogExercise) => void;
  onEditControlRef?: (id: ExerciseId, control: ExerciseListActionRef | null) => void;
}>;

export function ExerciseList({
  exercises,
  disabled,
  emptyMessage,
  header,
  onEdit,
  onSetAvailability,
  onEditControlRef,
}: ExerciseListProps): React.JSX.Element {
  const { t } = useTranslation();
  const sections = groupCatalogExercises(exercises).map((group) => ({
    ...group,
    data: group.exercises,
  }));

  return (
    <SectionList
      contentContainerStyle={sections.length === 0 ? styles.emptyContent : styles.content}
      keyboardShouldPersistTaps="handled"
      keyExtractor={(exercise) => exercise.id}
      ListHeaderComponent={header}
      ListEmptyComponent={
        <Text accessibilityRole="text" style={styles.emptyText} testID="catalog-empty">
          {emptyMessage}
        </Text>
      }
      renderItem={({ item }) => {
        const availabilityLabel = item.isAvailable
          ? item.origin === "custom"
            ? t("exerciseCatalog.controls.archive")
            : t("exerciseCatalog.controls.hide")
          : t("exerciseCatalog.controls.restore");

        return (
          <View style={styles.row} testID={`exercise-row-${item.id}`}>
            <VStack style={styles.rowCopy}>
              <Text style={styles.exerciseName}>{item.displayName}</Text>
              <HStack style={styles.metadata}>
                <Text style={styles.metadataText}>
                  {t(`exerciseCatalog.muscleGroups.${item.muscleGroup}`)}
                </Text>
                <Text accessibilityElementsHidden importantForAccessibility="no" style={styles.dot}>
                  ·
                </Text>
                <Text style={styles.metadataText}>
                  {t(`exerciseCatalog.origin.${item.origin}`)}
                </Text>
              </HStack>
            </VStack>
            <HStack style={styles.actions}>
              {item.origin === "custom" ? (
                <Button
                  ref={(control) => {
                    onEditControlRef?.(item.id, control);
                  }}
                  accessibilityLabel={`${t("exerciseCatalog.controls.edit")}: ${item.displayName}`}
                  accessibilityRole="button"
                  isDisabled={disabled}
                  onPress={() => onEdit(item)}
                  size="sm"
                  style={styles.actionButton}
                  testID={`catalog-edit-${item.id}`}
                  variant="outline"
                >
                  <ButtonText>{t("exerciseCatalog.controls.edit")}</ButtonText>
                </Button>
              ) : null}
              <Button
                accessibilityLabel={`${availabilityLabel}: ${item.displayName}`}
                accessibilityRole="button"
                isDisabled={disabled}
                onPress={() => onSetAvailability(item)}
                size="sm"
                style={styles.actionButton}
                testID={`catalog-availability-${item.id}`}
                variant="outline"
              >
                <ButtonText>{availabilityLabel}</ButtonText>
              </Button>
            </HStack>
          </View>
        );
      }}
      renderSectionHeader={({ section }) => (
        <Heading accessibilityRole="header" size="md" style={styles.sectionHeading}>
          {t(`exerciseCatalog.muscleGroups.${section.muscleGroup}`)}
        </Heading>
      )}
      sections={sections}
      stickySectionHeadersEnabled
      testID="catalog-list"
    />
  );
}

const styles = StyleSheet.create({
  actionButton: {
    minHeight: 44,
    paddingHorizontal: 12,
  },
  actions: {
    flexWrap: "wrap",
    gap: 8,
  },
  content: {
    paddingBottom: 40,
    paddingHorizontal: 16,
  },
  dot: {
    color: "#829AB1",
  },
  emptyContent: {
    flexGrow: 1,
    padding: 24,
  },
  emptyText: {
    color: "#52606D",
    fontSize: 17,
    lineHeight: 25,
    paddingVertical: 36,
    textAlign: "center",
  },
  exerciseName: {
    color: "#102A43",
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 24,
  },
  metadata: {
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  metadataText: {
    color: "#52606D",
    fontSize: 14,
    lineHeight: 20,
  },
  row: {
    alignItems: "stretch",
    backgroundColor: "#FFFFFF",
    borderBottomColor: "#D9E2EC",
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
    minHeight: 76,
    paddingVertical: 12,
  },
  rowCopy: {
    flex: 1,
    gap: 4,
  },
  sectionHeading: {
    backgroundColor: "#F5F7FA",
    color: "#243B53",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.6,
    paddingBottom: 8,
    paddingTop: 20,
    textTransform: "uppercase",
  },
});
