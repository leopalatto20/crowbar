import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { Input, InputField } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { MuscleGroupPickerModal } from './components/muscle-group-picker-modal';
import { UnsavedChangesModal } from './components/unsaved-changes-modal';
import {
  createMovement,
  findMovementByName,
  getDb,
  getDefaultUnit,
  normalizeMovementName,
  type CatalogMovement,
  type Movement,
  updateMovement,
} from '@/db';
import { DEFAULT_UNIT, type Unit } from '@/db/constants';
import { normalizeErrorMessage } from '@/shared/error-message';
import type { MovementEditorDraft } from './quick-create-state';

export type MuscleGroupOption = { id: number; name: string };

export type MovementEditorModalProps = {
  movement?: CatalogMovement | null;
  muscleGroups: MuscleGroupOption[];
  visible: boolean;
  onClose: () => void;
  closeLabel?: string;
  closeAccessibilityLabel?: string;
  onSaved: (movement: Movement) => void | Promise<void>;
  onDuplicate: (movement: Movement) => void;
  draft?: MovementEditorDraft;
  initialName?: string;
  defaultUnit?: Unit;
  onDraftChange?: (draft: MovementEditorDraft) => void;
};

/** Shared movement create/edit surface for catalog and future quick-create anchors. */
export function MovementEditorModal({
  movement,
  muscleGroups,
  visible,
  onClose,
  closeLabel,
  closeAccessibilityLabel,
  onSaved,
  onDuplicate,
  draft,
  initialName,
  defaultUnit,
  onDraftChange,
}: MovementEditorModalProps) {
  const editing = movement != null;
  const initialGroupId = movement
    ? muscleGroups.find((group) => group.name === movement.muscleGroup)?.id
    : undefined;
  const initialDraft: MovementEditorDraft = draft ?? {
    name: initialName ?? '',
    primaryMuscleGroupId: undefined,
    unit: defaultUnit ?? DEFAULT_UNIT,
    instructions: '',
  };
  const initialForm = {
    name: editing ? movement.name : initialDraft.name,
    groupId: editing ? initialGroupId : initialDraft.primaryMuscleGroupId,
    unit: editing ? movement.unit : initialDraft.unit,
    instructions: editing ? (movement.instructions ?? '') : initialDraft.instructions,
  };
  const [name, setName] = useState(initialForm.name);
  const [groupId, setGroupId] = useState<number | undefined>(initialForm.groupId);
  const [unit, setUnit] = useState<Unit>(initialForm.unit);
  const [instructions, setInstructions] = useState(initialForm.instructions);
  const unitWasDraftedOnMount = useRef(draft !== undefined);
  const unitWasEdited = useRef(false);
  const onDraftChangeRef = useRef(onDraftChange);
  const [error, setError] = useState<string | null>(null);
  const [exactDuplicate, setExactDuplicate] = useState<Movement | null>(null);
  const [nearMatch, setNearMatch] = useState<Movement | null>(null);
  const [confirmingGroupChange, setConfirmingGroupChange] = useState(false);
  const [groupPickerVisible, setGroupPickerVisible] = useState(false);
  const [discardChangesVisible, setDiscardChangesVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const selectedGroup = muscleGroups.find((group) => group.id === groupId);
  const groupDirty = editing
    ? selectedGroup !== undefined && selectedGroup.name !== movement.muscleGroup
    : groupId !== initialForm.groupId;
  const isDirty =
    name !== initialForm.name ||
    groupDirty ||
    unit !== initialForm.unit ||
    instructions !== initialForm.instructions;

  const close = () => {
    setGroupPickerVisible(false);
    if (isDirty && !saving) {
      setDiscardChangesVisible(true);
      return;
    }
    onClose();
  };
  const discard = () => {
    setDiscardChangesVisible(false);
    onClose();
  };

  const reportDraft = (next: MovementEditorDraft) => {
    if (visible) onDraftChangeRef.current?.(next);
  };

  useEffect(() => {
    onDraftChangeRef.current = onDraftChange;
  }, [onDraftChange]);

  useEffect(() => {
    if (!visible || editing || unitWasDraftedOnMount.current || unitWasEdited.current) return;
    let cancelled = false;
    const unitPromise = defaultUnit ? Promise.resolve(defaultUnit) : getDefaultUnit(getDb());
    unitPromise
      .then((resolvedUnit) => {
        if (!cancelled && !unitWasEdited.current) setUnit(resolvedUnit);
      })
      .catch((lookupError) => {
        if (!cancelled) console.error('Unable to load default movement unit', lookupError);
      });
    return () => {
      cancelled = true;
    };
  }, [visible, editing, defaultUnit]);

  useEffect(() => {
    if (visible && !editing) {
      reportDraft({ name, primaryMuscleGroupId: groupId, unit, instructions });
    }
    // The callback ref keeps this report from depending on an inline parent callback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, editing, name, groupId, unit, instructions]);

  const updateName = (next: string) => {
    setName(next);
    reportDraft({ name: next, primaryMuscleGroupId: groupId, unit, instructions });
  };
  const updateGroup = (next: number) => {
    setGroupId(next);
    reportDraft({ name, primaryMuscleGroupId: next, unit, instructions });
  };
  const updateUnit = (next: Unit) => {
    unitWasEdited.current = true;
    setUnit(next);
    reportDraft({ name, primaryMuscleGroupId: groupId, unit: next, instructions });
  };
  const updateInstructions = (next: string) => {
    setInstructions(next);
    reportDraft({ name, primaryMuscleGroupId: groupId, unit, instructions: next });
  };

  const originalGroupId = editing
    ? muscleGroups.find((group) => group.name === movement.muscleGroup)?.id
    : undefined;
  const groupChanged = editing && groupId !== undefined && groupId !== originalGroupId;
  const unitChanged = editing && unit !== movement.unit;

  /* Groups load independently from catalog rows; sync the late-arriving option once. */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!visible || !movement || groupId !== undefined) return;
    const currentGroup = muscleGroups.find((group) => group.name === movement.muscleGroup);
    if (currentGroup) setGroupId(currentGroup.id);
  }, [visible, movement, groupId, muscleGroups]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    const candidateName = name.trim();
    if (!visible || !candidateName) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      findMovementByName(getDb(), candidateName, { near: true, excludeId: movement?.id })
        .then((candidate) => {
          if (cancelled) return;
          const other = candidate && candidate.id !== movement?.id ? candidate : null;
          if (other && normalizeMovementName(other.name) === normalizeMovementName(candidateName)) {
            setExactDuplicate(other);
            setNearMatch(null);
          } else {
            setExactDuplicate(null);
            setNearMatch(other);
          }
        })
        .catch((lookupError) => {
          if (!cancelled) console.error('Unable to check movement name', lookupError);
        });
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [name, movement?.id, visible]);

  async function checkDuplicate(): Promise<Movement | null> {
    const candidate = await findMovementByName(getDb(), name.trim());
    if (candidate && candidate.id !== movement?.id) {
      setExactDuplicate(candidate);
      return candidate;
    }
    setExactDuplicate(null);
    return null;
  }

  async function persist(): Promise<void> {
    setSaving(true);
    setError(null);
    try {
      if (await checkDuplicate()) return;
      const saved = editing
        ? await updateMovement(getDb(), movement.id, {
            name: name.trim(),
            primaryMuscleGroupId: groupId,
            unit,
            instructions: instructions || null,
          })
        : await createMovement(getDb(), {
            name: name.trim(),
            primaryMuscleGroupId: groupId as number,
            unit,
            instructions: instructions || null,
          });
      await onSaved(saved);
    } catch (saveError) {
      if (isMovementDuplicateError(saveError)) {
        const duplicate = await findMovementByName(getDb(), name.trim(), {
          excludeId: movement?.id,
        });
        if (duplicate) {
          setExactDuplicate(duplicate);
          return;
        }
      }
      setError(normalizeErrorMessage(saveError, 'Unable to save movement.'));
    } finally {
      setSaving(false);
    }
  }

  function isMovementDuplicateError(saveError: unknown): boolean {
    return (
      saveError instanceof Error &&
      /already exists|duplicate|unique|constraint/i.test(saveError.message)
    );
  }

  async function save(): Promise<void> {
    setError(null);
    setConfirmingGroupChange(false);
    if (!name.trim()) {
      setError('Enter a movement name.');
      return;
    }
    if (!editing && groupId === undefined) {
      setError('Choose a primary muscle group.');
      return;
    }
    if (groupChanged) {
      setConfirmingGroupChange(true);
      return;
    }
    await persist();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 justify-end"
      >
        <Pressable className="absolute inset-0 bg-background/50" onPress={close} />
        <SafeAreaView className="flex-1 justify-end" edges={['bottom']} pointerEvents="box-none">
          <Box className="h-[92%] rounded-t-xl bg-background px-4 pb-4 pt-4 web:max-w-[800px] web:w-full web:mx-auto">
            <Box className="flex-row items-center justify-between">
              <Text size="2xl" className="font-semibold">
                {editing ? 'Edit movement' : 'New movement'}
              </Text>
              <Button
                variant="ghost"
                size="sm"
                onPress={close}
                accessibilityLabel={closeAccessibilityLabel ?? 'Close'}
              >
                <ButtonText>{closeLabel ?? 'Close'}</ButtonText>
              </Button>
            </Box>

            <ScrollView
              className="mt-4 min-h-0 flex-1"
              keyboardShouldPersistTaps="handled"
              contentContainerClassName="gap-4 pb-4"
            >
              <Box className="gap-2">
                <Text size="sm" className="font-medium">
                  Name
                </Text>
                <Input
                  className={(error && !name.trim()) || exactDuplicate ? 'border-destructive' : ''}
                >
                  <InputField
                    value={name}
                    onChangeText={updateName}
                    placeholder="Movement name"
                    autoCapitalize="words"
                    autoCorrect={false}
                  />
                </Input>
                {exactDuplicate && name.trim() && (
                  <Box className="gap-1 rounded-xl bg-muted px-3 py-2">
                    <Text>A movement named “{exactDuplicate.name}” already exists.</Text>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="self-start px-0"
                      onPress={() => onDuplicate(exactDuplicate)}
                    >
                      <ButtonText className="underline">Open existing movement</ButtonText>
                    </Button>
                  </Box>
                )}
                {nearMatch && !exactDuplicate && name.trim() && (
                  <Text size="sm" className="text-muted-foreground">
                    Did you mean “{nearMatch.name}”?
                  </Text>
                )}
                {error && (
                  <Box className="gap-2">
                    <Text size="sm" className="text-destructive">
                      {error}
                    </Text>
                    <Button
                      variant="link"
                      size="sm"
                      className="self-start px-0"
                      onPress={() => void save()}
                    >
                      <ButtonText>Try again</ButtonText>
                    </Button>
                  </Box>
                )}
              </Box>

              <Box className="gap-2">
                <Text size="sm" className="font-medium">
                  Primary muscle group
                </Text>
                <Button
                  variant={selectedGroup ? 'secondary' : 'outline'}
                  onPress={() => setGroupPickerVisible(true)}
                  accessibilityLabel={`Choose primary muscle group${selectedGroup ? `: ${selectedGroup.name}` : ''}`}
                  accessibilityState={{ expanded: groupPickerVisible }}
                >
                  <ButtonText>{selectedGroup?.name ?? 'Choose a group'}</ButtonText>
                </Button>
              </Box>

              <Box className="gap-2">
                <Text size="sm" className="font-medium">
                  Unit
                </Text>
                <Box className="flex-row gap-2">
                  {(['kg', 'lb'] as Unit[]).map((option) => (
                    <Button
                      key={option}
                      size="sm"
                      variant={unit === option ? 'secondary' : 'outline'}
                      onPress={() => updateUnit(option)}
                    >
                      <ButtonText>{option}</ButtonText>
                    </Button>
                  ))}
                </Box>
                {unitChanged && (
                  <Text size="sm" className="text-muted-foreground">
                    Historical sets remain canonical and truthful; they will be re-rendered in the
                    new unit.
                  </Text>
                )}
              </Box>

              <Box className="gap-2">
                <Text size="sm" className="font-medium">
                  Instructions
                </Text>
                <Input className="min-h-24 items-start">
                  <InputField
                    value={instructions}
                    onChangeText={updateInstructions}
                    placeholder="Optional notes"
                    multiline
                    className="py-2"
                  />
                </Input>
              </Box>
            </ScrollView>

            <Box className="gap-2 border-t border-border pt-4">
              {confirmingGroupChange ? (
                <Box className="gap-2 rounded-xl bg-muted px-4 py-4">
                  <Text className="font-semibold">Change primary muscle group?</Text>
                  <Text size="sm">Past volume will be counted under the new muscle group.</Text>
                  <Box className="gap-2">
                    <Button
                      variant="outline"
                      className="w-full"
                      size="sm"
                      onPress={() => setConfirmingGroupChange(false)}
                    >
                      <ButtonText>Cancel</ButtonText>
                    </Button>
                    <Button className="w-full" size="sm" onPress={persist} disabled={saving}>
                      <ButtonText>Continue</ButtonText>
                    </Button>
                  </Box>
                </Box>
              ) : (
                <Box className="gap-2">
                  <Button variant="outline" className="w-full" onPress={close} disabled={saving}>
                    <ButtonText>Cancel</ButtonText>
                  </Button>
                  <Button className="w-full" onPress={save} disabled={saving}>
                    <ButtonText>{saving ? 'Saving…' : 'Save'}</ButtonText>
                  </Button>
                </Box>
              )}
            </Box>
          </Box>
        </SafeAreaView>
      </KeyboardAvoidingView>
      <MuscleGroupPickerModal
        key={groupPickerVisible ? 'open' : 'closed'}
        visible={groupPickerVisible}
        options={muscleGroups.map((group) => group.name)}
        selected={selectedGroup?.name ?? ''}
        onClose={() => setGroupPickerVisible(false)}
        onSelect={(groupName) => {
          const group = muscleGroups.find((option) => option.name === groupName);
          if (group) updateGroup(group.id);
          setGroupPickerVisible(false);
        }}
      />
      <UnsavedChangesModal
        visible={discardChangesVisible}
        onKeepEditing={() => setDiscardChangesVisible(false)}
        onDiscard={discard}
      />
    </Modal>
  );
}

export default MovementEditorModal;
