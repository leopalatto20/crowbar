import { useMemo, useState } from "react";
import {
	KeyboardAvoidingView,
	Modal,
	Platform,
	Pressable,
	ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Box } from "@/components/ui/box";
import { Button, ButtonText } from "@/components/ui/button";
import { Input, InputField } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import type { CatalogMovement } from "@/db";
import {
	ALL_MUSCLE_GROUPS,
	getMovementPickerRows,
	MOVEMENT_PICKER_FILTERS,
} from "./movement-picker-state";

type MovementPickerModalProps = {
	visible: boolean;
	options: CatalogMovement[];
	selectedIds: number[];
	onClose: () => void;
	onCreate: (name: string) => void;
	onSelect: (movement: CatalogMovement) => void;
	onRevealExisting: (movementId: number) => void;
};

export function MovementPickerModal({
	visible,
	options,
	selectedIds,
	onClose,
	onCreate,
	onSelect,
	onRevealExisting,
}: MovementPickerModalProps) {
	const [query, setQuery] = useState("");
	const [muscleGroup, setMuscleGroup] = useState<string>(ALL_MUSCLE_GROUPS);
	const [expandedInstructions, setExpandedInstructions] = useState<Set<number>>(() => new Set());
	const rows = useMemo(
		() => getMovementPickerRows(options, { query, muscleGroup, selectedIds }),
		[muscleGroup, options, query, selectedIds],
	);
	const hasFilters = query.trim() !== "" || muscleGroup !== ALL_MUSCLE_GROUPS;

	const clearFilters = () => {
		setQuery("");
		setMuscleGroup(ALL_MUSCLE_GROUPS);
	};
	const toggleInstructions = (movementId: number) => {
		setExpandedInstructions((current) => {
			const next = new Set(current);
			if (next.has(movementId)) next.delete(movementId);
			else next.add(movementId);
			return next;
		});
	};

	return (
		<Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				style={{ flex: 1, justifyContent: "flex-end" }}
			>
				<Pressable className="absolute inset-0 bg-background/50" onPress={onClose} />
				<SafeAreaView style={{ flex: 1, justifyContent: "flex-end" }} edges={["bottom"]} pointerEvents="box-none">
					<Box className="h-[86%] rounded-t-xl bg-background px-4 pb-4 pt-4 web:mx-auto web:w-full web:max-w-[800px]">
						<Box className="min-h-0 flex-1 gap-4">
							<Box className="flex-row items-center justify-between">
								<Text size="2xl" bold>Choose movement</Text>
								<Button variant="ghost" size="sm" onPress={onClose} accessibilityLabel="Close movement picker">
									<ButtonText>Close</ButtonText>
								</Button>
							</Box>
							<Input>
								<InputField
									value={query}
									onChangeText={setQuery}
									placeholder="Search movements"
									accessibilityLabel="Search movements"
									autoCorrect={false}
									autoCapitalize="none"
									clearButtonMode="while-editing"
								/>
							</Input>
							<Button variant="outline" onPress={() => onCreate(query)} accessibilityLabel="Create movement">
								<ButtonText>{query.trim() ? `Create “${query.trim()}”` : "Create movement"}</ButtonText>
							</Button>
							<ScrollView
								horizontal
								showsHorizontalScrollIndicator={false}
								style={{ flexGrow: 0, flexShrink: 0 }}
								contentContainerClassName="gap-2"
								accessibilityLabel="Filter by muscle group"
							>
								{MOVEMENT_PICKER_FILTERS.map((filter) => {
									const selected = filter === muscleGroup;
									return (
										<Button
											key={filter}
											variant={selected ? "default" : "outline"}
											size="sm"
											className="h-7 min-h-7 rounded-full px-2"
											hitSlop={10}
											onPress={() => setMuscleGroup(filter)}
											accessibilityLabel={`${filter} muscle group filter`}
											accessibilityState={{ selected }}
										>
											<ButtonText>{filter}</ButtonText>
										</Button>
									);
								})}
							</ScrollView>
							<Text size="sm" className="text-muted-foreground">
								{rows.length} {hasFilters ? "matches" : "movements"}
							</Text>
							<ScrollView
								className="min-h-0 flex-1"
								contentContainerClassName="gap-2 pb-8"
								keyboardShouldPersistTaps="handled"
							>
								{rows.length === 0 ? (
									hasFilters ? (
										<Box className="items-center gap-4 rounded-xl bg-card px-4 py-8">
											<Text className="text-center text-muted-foreground">No movements match these filters.</Text>
											<Button variant="outline" onPress={clearFilters} accessibilityLabel="Clear movement filters">
												<ButtonText>Clear filters</ButtonText>
											</Button>
										</Box>
								) : (
									<Box className="items-center gap-4 rounded-xl bg-card px-4 py-8">
										<Text className="text-center text-muted-foreground">There are no active movements. Create one above or add one in Catalog.</Text>
										<Button variant="outline" onPress={onClose} accessibilityLabel="Close picker to add a movement in Catalog">
											<ButtonText>Close picker</ButtonText>
										</Button>
									</Box>
								)
								) : rows.map(({ movement, alreadyAdded, selectable }) => {
									const hasInstructions = Boolean(movement.instructions?.trim());
									const instructionsVisible = expandedInstructions.has(movement.id);
									return (
										<Box key={movement.id} className="gap-2 rounded-xl bg-card p-4">
											<Box className="flex-row items-start gap-2">
												<Button
													variant="outline"
													onPress={() => onSelect(movement)}
													disabled={!selectable}
													className="min-h-16 min-w-0 flex-1 items-start justify-center px-4 py-2"
													accessibilityLabel={alreadyAdded ? `${movement.name} already added` : `Add ${movement.name}`}
												>
													<Box className="min-w-0 flex-1 items-start gap-1">
														<ButtonText className="text-left">{movement.name}</ButtonText>
														<ButtonText className="text-left text-muted-foreground">
															{alreadyAdded ? "Already added" : movement.muscleGroup}
														</ButtonText>
													</Box>
												</Button>
												{alreadyAdded && (
													<Button variant="link" size="sm" className="px-0" onPress={() => onRevealExisting(movement.id)} accessibilityLabel={`Reveal ${movement.name} in ledger`}>
														<ButtonText>Reveal in ledger</ButtonText>
													</Button>
												)}
											</Box>
											{hasInstructions && (
												<>
													<Button variant="link" size="sm" className="self-start px-0" onPress={() => toggleInstructions(movement.id)} accessibilityLabel={`${instructionsVisible ? "Hide" : "Show"} instructions for ${movement.name}`}>
													<ButtonText>{instructionsVisible ? "Hide instructions" : "Show instructions"}</ButtonText>
												</Button>
												{instructionsVisible && <Text className="text-muted-foreground">{movement.instructions}</Text>}
											</>
											)}
										</Box>
									);
								})}
							</ScrollView>
						</Box>
					</Box>
				</SafeAreaView>
			</KeyboardAvoidingView>
		</Modal>
	);
}
