import { Button, FieldGroup, Host, Picker, Row, Spacer, Switch, Text, TextInput } from "@expo/ui";
import { Suspense, useState } from "react";
import { Modal, Text as RNText, View } from "react-native";

import { useDb } from "@/db/context";
import {
  type ExerciseListing,
  createCustomExercise,
  exerciseNamed,
  unhideExercise,
} from "@/db/exercises";
import { type InferredFields, inferExerciseFields } from "@/lib/exercise/infer";
import { EQUIPMENT_TYPES, LOAD_TYPES, MUSCLE_GROUPS, type MuscleGroup } from "@/lib/exercise/model";
import { useExerciseLibrary } from "@/lib/exercise/use-exercises";
import { useI18n } from "@/lib/i18n";
import { spacing, type, useColors } from "@/lib/theme";

// The only way a Custom Exercise is created, from the picker's "Create" row or the library's "+".
// `name` is null while the sheet is closed, and the name the form opens prefilled with otherwise.
export function CustomExerciseSheet({
  name,
  onClose,
  onSave,
}: {
  name: string | null;
  onClose: () => void;
  onSave: (exercise: ExerciseListing) => void;
}) {
  const p = useColors();
  return (
    <Modal
      visible={name !== null}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: p.background }}>
        <Suspense fallback={null}>
          {/* Modal renders nothing while closed, so every opening starts a fresh form. */}
          <CustomExerciseForm initialName={name ?? ""} onClose={onClose} onSave={onSave} />
        </Suspense>
      </View>
    </Modal>
  );
}

function CustomExerciseForm({
  initialName,
  onClose,
  onSave,
}: {
  initialName: string;
  onClose: () => void;
  onSave: (exercise: ExerciseListing) => void;
}) {
  const db = useDb();
  const p = useColors();
  const { t } = useI18n();
  const library = useExerciseLibrary();
  const [name, setName] = useState(initialName);
  const [touched, setTouched] = useState<Partial<InferredFields>>({});
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup | null>(null);
  const fields = inferExerciseFields(name, touched);
  const taken = exerciseNamed(library, name);
  const canSave = name.trim() !== "" && !taken;

  function touch(change: Partial<InferredFields>) {
    setTouched((current) => ({ ...current, ...change }));
  }

  function save() {
    if (!canSave) return;
    onSave(createCustomExercise(db, { name, ...fields, muscleGroup }));
  }

  // A typed name that already exists hands over that Exercise instead, unhiding it if needed.
  function takeExisting(listing: ExerciseListing) {
    if (listing.hidden) unhideExercise(db, listing.id);
    onSave({ ...listing, hidden: false });
  }

  return (
    <>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.lg,
        }}
      >
        <Host matchContents>
          <Button variant="text" label={t.customExercise.cancel} onPress={onClose} />
        </Host>
        <RNText style={{ color: p.label, ...type.headline }}>{t.customExercise.title}</RNText>
        <Host matchContents>
          <Button variant="text" label={t.customExercise.save} onPress={save} disabled={!canSave} />
        </Host>
      </View>
      <Host style={{ flex: 1 }}>
        <FieldGroup>
          <FieldGroup.Section>
            <TextInput
              defaultValue={initialName}
              onChangeText={setName}
              placeholder={t.customExercise.name}
              autoFocus
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={save}
            />
            {taken ? (
              <Button
                variant="text"
                label={taken.hidden ? t.customExercise.unhide : t.customExercise.useExisting}
                onPress={() => takeExisting(taken)}
              />
            ) : null}
            {taken ? (
              <FieldGroup.SectionFooter>
                <Text>
                  {taken.hidden
                    ? t.customExercise.nameTakenHidden(taken.name)
                    : t.customExercise.nameTaken(taken.name)}
                </Text>
              </FieldGroup.SectionFooter>
            ) : null}
          </FieldGroup.Section>
          <FieldGroup.Section>
            <Row alignment="center">
              <Text>{t.customExercise.equipmentType}</Text>
              <Spacer flexible />
              <Picker
                selectedValue={fields.equipmentType}
                onValueChange={(equipmentType) => touch({ equipmentType })}
              >
                {EQUIPMENT_TYPES.map((equipmentType) => (
                  <Picker.Item
                    key={equipmentType}
                    label={t.equipmentType[equipmentType]}
                    value={equipmentType}
                  />
                ))}
              </Picker>
            </Row>
            <Row alignment="center">
              <Text>{t.customExercise.loadType}</Text>
              <Spacer flexible />
              <Picker
                selectedValue={fields.loadType}
                onValueChange={(loadType) => touch({ loadType })}
              >
                {LOAD_TYPES.map((loadType) => (
                  <Picker.Item key={loadType} label={t.loadType[loadType]} value={loadType} />
                ))}
              </Picker>
            </Row>
            <Switch
              label={t.customExercise.unilateral}
              value={fields.unilateral}
              onValueChange={(unilateral) => touch({ unilateral })}
            />
            <Row alignment="center">
              <Text>{t.customExercise.muscleGroup}</Text>
              <Spacer flexible />
              {/* Picker values can't be null, so "" stands for no Muscle group. */}
              <Picker
                selectedValue={muscleGroup ?? ""}
                onValueChange={(value) =>
                  setMuscleGroup(MUSCLE_GROUPS.find((group) => group === value) ?? null)
                }
              >
                <Picker.Item label={t.customExercise.noMuscleGroup} value="" />
                {MUSCLE_GROUPS.map((group) => (
                  <Picker.Item key={group} label={t.muscleGroup[group]} value={group} />
                ))}
              </Picker>
            </Row>
          </FieldGroup.Section>
        </FieldGroup>
      </Host>
    </>
  );
}
