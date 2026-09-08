import { useEffect, useState } from 'react';
import { Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { Input, InputField } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import {
	createMovement,
	findMovementByName,
	getDb,
	normalizeMovementName,
	type CatalogMovement,
	type Movement,
	updateMovement,
} from '@/db';
import { DEFAULT_UNIT, type Unit } from '@/db/constants';

export type MuscleGroupOption = { id: number; name: string };

export type MovementEditorModalProps = {
	movement?: CatalogMovement | null;
	muscleGroups: MuscleGroupOption[];
	visible: boolean;
	onClose: () => void;
	onSaved: (movement: Movement) => void | Promise<void>;
	onDuplicate: (movement: Movement) => void;
};

/** Shared create/edit surface for the catalog. */
export function MovementEditorModal({
	movement,
	muscleGroups,
	visible,
	onClose,
	onSaved,
	onDuplicate,
}: MovementEditorModalProps) {
	const initialGroupId = movement
		? muscleGroups.find((group) => group.name === movement.muscleGroup)?.id
		: undefined;
	const [name, setName] = useState(movement?.name ?? '');
	const [groupId, setGroupId] = useState<number | undefined>(initialGroupId);
	const [unit, setUnit] = useState<Unit>(movement?.unit ?? (DEFAULT_UNIT as Unit));
	const [instructions, setInstructions] = useState(movement?.instructions ?? '');
	const [error, setError] = useState<string | null>(null);
	const [exactDuplicate, setExactDuplicate] = useState<Movement | null>(null);
	const [nearMatch, setNearMatch] = useState<Movement | null>(null);
	const [confirmingGroupChange, setConfirmingGroupChange] = useState(false);
	const [saving, setSaving] = useState(false);

	const editing = movement != null;
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
			setError(saveError instanceof Error ? saveError.message : 'Unable to save movement.');
		} finally {
			setSaving(false);
		}
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
		<Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
			<SafeAreaView className="flex-1 justify-end bg-background/50" edges={['top', 'bottom']}>
				<Box className="max-h-[92%] rounded-t-xl bg-background px-4 pb-4 pt-4 web:max-w-[800px] web:w-full web:mx-auto">
					<ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="gap-4">
						<Box className="flex-row items-center justify-between">
							<Text size="2xl" className="font-semibold">{editing ? 'Edit movement' : 'New movement'}</Text>
							<Button variant="ghost" size="sm" onPress={onClose} accessibilityLabel="Close">
								<ButtonText>Close</ButtonText>
							</Button>
						</Box>

						<Box className="gap-2">
							<Text size="sm" className="font-medium">Name</Text>
							<Input className={error && !name.trim() ? 'border-destructive' : ''}>
								<InputField
									value={name}
									onChangeText={setName}
									placeholder="Movement name"
									autoCapitalize="words"
									autoCorrect={false}
								/>
							</Input>
							{exactDuplicate && name.trim() && (
								<Box className="gap-1 rounded-xl bg-destructive/10 px-3 py-2">
									<Text className="text-destructive">A movement named “{exactDuplicate.name}” already exists.</Text>
									<Button variant="ghost" size="sm" className="self-start px-0" onPress={() => onDuplicate(exactDuplicate)}>
										<ButtonText className="underline">Open existing movement</ButtonText>
									</Button>
								</Box>
							)}
							{nearMatch && !exactDuplicate && name.trim() && (
								<Text size="sm" className="text-muted-foreground">Did you mean “{nearMatch.name}”?</Text>
							)}
							{error && <Text size="sm" className="text-destructive">{error}</Text>}
						</Box>

						<Box className="gap-2">
							<Text size="sm" className="font-medium">Primary muscle group</Text>
							<Box className="flex-row flex-wrap gap-2">
								{muscleGroups.map((group) => (
									<Button
										key={group.id}
										size="sm"
										variant={groupId === group.id ? 'secondary' : 'outline'}
										onPress={() => setGroupId(group.id)}
									>
										<ButtonText>{group.name}</ButtonText>
									</Button>
								))}
							</Box>
						</Box>

						<Box className="gap-2">
							<Text size="sm" className="font-medium">Unit</Text>
							<Box className="flex-row gap-2">
								{(['kg', 'lb'] as Unit[]).map((option) => (
									<Button key={option} size="sm" variant={unit === option ? 'secondary' : 'outline'} onPress={() => setUnit(option)}>
										<ButtonText>{option}</ButtonText>
									</Button>
								))}
							</Box>
							{unitChanged && (
								<Text size="sm" className="text-muted-foreground">Historical sets remain canonical and truthful; they will be re-rendered in the new unit.</Text>
							)}
						</Box>

						<Box className="gap-2">
							<Text size="sm" className="font-medium">Instructions</Text>
							<Input className="min-h-24 items-start">
								<InputField
									value={instructions}
									onChangeText={setInstructions}
									placeholder="Optional notes"
									multiline
									textAlignVertical="top"
									className="py-2"
								/>
							</Input>
						</Box>

						{confirmingGroupChange ? (
							<Box className="gap-2 rounded-xl bg-muted px-4 py-4">
								<Text className="font-semibold">Change primary muscle group?</Text>
								<Text size="sm">Past volume will be counted under the new muscle group.</Text>
								<Box className="gap-2">
									<Button variant="outline" className="w-full" size="sm" onPress={() => setConfirmingGroupChange(false)}><ButtonText>Cancel</ButtonText></Button>
									<Button className="w-full" size="sm" onPress={persist} disabled={saving}><ButtonText>Continue</ButtonText></Button>
								</Box>
							</Box>
						) : (
							<Box className="gap-2">
								<Button variant="outline" className="w-full" onPress={onClose} disabled={saving}><ButtonText>Cancel</ButtonText></Button>
								<Button className="w-full" onPress={save} disabled={saving}><ButtonText>{saving ? 'Saving…' : 'Save'}</ButtonText></Button>
							</Box>
						)}
					</ScrollView>
				</Box>
			</SafeAreaView>
		</Modal>
	);
}

export default MovementEditorModal;
