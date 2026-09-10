import { useMemo, useState } from "react";
import { FlatList, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Box } from "@/components/ui/box";
import { Button, ButtonText } from "@/components/ui/button";
import { Input, InputField } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import type { CatalogMovement } from "@/db";

type MovementPickerModalProps = {
	visible: boolean;
	options: CatalogMovement[];
	selectedIds: number[];
	onClose: () => void;
	onSelect: (movement: CatalogMovement) => void;
};

export function MovementPickerModal({
	visible,
	options,
	selectedIds,
	onClose,
	onSelect,
}: MovementPickerModalProps) {
	const [query, setQuery] = useState("");
	const selected = useMemo(() => new Set(selectedIds), [selectedIds]);
	const filteredOptions = useMemo(() => {
		const normalizedQuery = query.trim().toLowerCase();
		if (!normalizedQuery) return options;
		return options.filter((movement) =>
			movement.name.toLowerCase().includes(normalizedQuery),
		);
	}, [options, query]);

	return (
		<Modal
			visible={visible}
			animationType="slide"
			onRequestClose={onClose}
			presentationStyle="pageSheet"
		>
			<SafeAreaView className="flex-1 bg-background">
				<Box className="mx-auto w-full max-w-[800px] flex-1 gap-4 px-4 pt-4">
					<Box className="flex-row items-center justify-between">
						<Text size="2xl" bold>
							Choose movement
						</Text>
						<Button variant="ghost" onPress={onClose}>
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
					<FlatList
						className="flex-1"
						contentContainerClassName="gap-2 pb-8"
						data={filteredOptions}
						keyExtractor={(movement) => String(movement.id)}
						keyboardShouldPersistTaps="handled"
						ListEmptyComponent={
							<Box className="items-center rounded-xl bg-card px-4 py-8">
								<Text className="text-muted-foreground">
									No active movements match
								</Text>
							</Box>
						}
						renderItem={({ item }) => {
							const isSelected = selected.has(item.id);
							return (
								<Button
									variant="outline"
									onPress={() => onSelect(item)}
									disabled={isSelected}
									className="min-h-16 items-start justify-center px-4 py-2"
									accessibilityLabel={`Add ${item.name}`}
								>
									<Box className="min-w-0 flex-1 gap-1">
										<Text bold>{item.name}</Text>
										<Text size="sm" className="text-muted-foreground">
											{isSelected ? "Added" : item.muscleGroup}
										</Text>
									</Box>
								</Button>
							);
						}}
					/>
				</Box>
			</SafeAreaView>
		</Modal>
	);
}
