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
		<Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				className="flex-1 justify-end"
			>
				<Pressable className="absolute inset-0 bg-background/50" onPress={onClose} />
				<SafeAreaView className="flex-1 justify-end" edges={["bottom"]} pointerEvents="box-none">
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
							<ScrollView
								className="min-h-0 flex-1"
								contentContainerClassName="gap-2 pb-8"
								keyboardShouldPersistTaps="handled"
							>
								{filteredOptions.length === 0 ? (
									<Box className="items-center rounded-xl bg-card px-4 py-8">
										<Text className="text-muted-foreground">No active movements match</Text>
									</Box>
								) : filteredOptions.map((movement) => {
									const isSelected = selected.has(movement.id);
									return (
										<Button
											key={movement.id}
											variant="outline"
											onPress={() => onSelect(movement)}
											disabled={isSelected}
											className="min-h-16 items-start justify-center px-4 py-2"
											accessibilityLabel={`Add ${movement.name}`}
										>
											<Box className="min-w-0 flex-1 gap-1">
												<Text bold>{movement.name}</Text>
												<Text size="sm" className="text-muted-foreground">
													{isSelected ? "Added" : movement.muscleGroup}
												</Text>
											</Box>
										</Button>
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
