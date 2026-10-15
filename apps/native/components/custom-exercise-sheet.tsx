import { Button, FieldGroup, Host, Picker, Row, Spacer, Switch, Text, TextInput } from "@expo/ui";
import { Suspense, useState } from "react";
import { Modal, Text as RNText, View } from "react-native";

import { useDb } from "@/db/context";
import {
  type CustomExercise,
  type CustomExerciseFields,
  type ExerciseListing,
  createCustomExercise,
  editCustomExercise,
  exerciseNamed,
  getCustomExercise,
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
  return (
    <FormSheet visible={name !== null} onClose={onClose}>
      <CustomExerciseForm initialName={name ?? ""} onClose={onClose} onSave={onSave} />
    </FormSheet>
  );
}

// Edits the Custom Exercise `exerciseId`; null while the sheet is closed.
export function EditExerciseSheet({
  exerciseId,
  onClose,
}: {
  exerciseId: string | null;
  onClose: () => void;
}) {
  return (
    <FormSheet visible={exerciseId !== null} onClose={onClose}>
      {exerciseId && <EditExerciseForm exerciseId={exerciseId} onClose={onClose} />}
    </FormSheet>
  );
}

function FormSheet({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const p = useColors();
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: p.background }}>
        {/* Modal renders nothing while closed, so every opening starts a fresh form. */}
        <Suspense fallback={null}>{children}</Suspense>
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
      <FormHeader
        title={t.customExercise.title}
        canSave={canSave}
        onCancel={onClose}
        onSave={save}
      />
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
          <ExerciseFieldsSection
            fields={{ ...fields, muscleGroup }}
            locked={false}
            onChange={({ muscleGroup: changedGroup, ...change }) => {
              if (changedGroup !== undefined) setMuscleGroup(changedGroup);
              touch(change);
            }}
          />
        </FieldGroup>
      </Host>
    </>
  );
}

function EditExerciseForm({ exerciseId, onClose }: { exerciseId: string; onClose: () => void }) {
  const db = useDb();
  // Read once: the form holds its own edits until Save.
  const [exercise] = useState(() => getCustomExercise(db, exerciseId));
  return exercise ? <EditExerciseFields exercise={exercise} onClose={onClose} /> : null;
}

function EditExerciseFields({
  exercise: { id, locked, ...initial },
  onClose,
}: {
  exercise: CustomExercise;
  onClose: () => void;
}) {
  const db = useDb();
  const { t } = useI18n();
  const library = useExerciseLibrary();
  const [fields, setFields] = useState<CustomExerciseFields>(initial);
  const taken = exerciseNamed(
    library.filter((listing) => listing.id !== id),
    fields.name,
  );
  const canSave = fields.name.trim() !== "" && !taken;

  function save() {
    if (!canSave) return;
    editCustomExercise(db, id, fields);
    onClose();
  }

  return (
    <>
      <FormHeader
        title={t.customExercise.editTitle}
        canSave={canSave}
        onCancel={onClose}
        onSave={save}
      />
      <Host style={{ flex: 1 }}>
        <FieldGroup>
          <FieldGroup.Section>
            <TextInput
              defaultValue={initial.name}
              onChangeText={(name) => setFields({ ...fields, name })}
              placeholder={t.customExercise.name}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={save}
            />
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
          <ExerciseFieldsSection
            fields={fields}
            locked={locked}
            onChange={(change) => setFields({ ...fields, ...change })}
          />
        </FieldGroup>
      </Host>
    </>
  );
}

function FormHeader({
  title,
  canSave,
  onCancel,
  onSave,
}: {
  title: string;
  canSave: boolean;
  onCancel: () => void;
  onSave: () => void;
}) {
  const p = useColors();
  const { t } = useI18n();
  return (
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
        <Button variant="text" label={t.customExercise.cancel} onPress={onCancel} />
      </Host>
      <RNText style={{ color: p.label, ...type.headline }}>{title}</RNText>
      <Host matchContents>
        <Button variant="text" label={t.customExercise.save} onPress={onSave} disabled={!canSave} />
      </Host>
    </View>
  );
}

// `locked` freezes the fields that say how logged sets read; Muscle group stays editable.
function ExerciseFieldsSection({
  fields,
  locked,
  onChange,
}: {
  fields: Omit<CustomExerciseFields, "name">;
  locked: boolean;
  onChange: (change: Partial<Omit<CustomExerciseFields, "name">>) => void;
}) {
  const { t } = useI18n();
  return (
    <FieldGroup.Section>
      <Row alignment="center">
        <Text>{t.customExercise.equipmentType}</Text>
        <Spacer flexible />
        <Picker
          selectedValue={fields.equipmentType}
          onValueChange={(equipmentType) => onChange({ equipmentType })}
          enabled={!locked}
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
          onValueChange={(loadType) => onChange({ loadType })}
          enabled={!locked}
        >
          {LOAD_TYPES.map((loadType) => (
            <Picker.Item key={loadType} label={t.loadType[loadType]} value={loadType} />
          ))}
        </Picker>
      </Row>
      <Switch
        label={t.customExercise.unilateral}
        value={fields.unilateral}
        onValueChange={(unilateral) => onChange({ unilateral })}
        disabled={locked}
      />
      <Row alignment="center">
        <Text>{t.customExercise.muscleGroup}</Text>
        <Spacer flexible />
        {/* Picker values can't be null, so "" stands for no Muscle group. */}
        <Picker
          selectedValue={fields.muscleGroup ?? ""}
          onValueChange={(value) =>
            onChange({ muscleGroup: MUSCLE_GROUPS.find((group) => group === value) ?? null })
          }
        >
          <Picker.Item label={t.customExercise.noMuscleGroup} value="" />
          {MUSCLE_GROUPS.map((group) => (
            <Picker.Item key={group} label={t.muscleGroup[group]} value={group} />
          ))}
        </Picker>
      </Row>
      {locked ? (
        <FieldGroup.SectionFooter>
          <Text>{t.customExercise.locked}</Text>
        </FieldGroup.SectionFooter>
      ) : null}
    </FieldGroup.Section>
  );
}
